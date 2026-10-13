import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { execa } from "execa";
import { loadLockFile } from "./versioning.js";
import { loadTemplateManifest, TemplateManifest } from "./versioning.js";

export interface CheckResult {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

export interface CheckReport {
  projectDir: string;
  template: string | null;
  templateVersion: string | null;
  checks: CheckResult[];
  score: number;
}

function check(
  result: CheckResult[],
  name: string,
  status: "pass" | "warn" | "fail",
  message: string,
) {
  result.push({ name, status, message });
}

export async function runGovernanceChecks(
  projectDir: string,
): Promise<CheckReport> {
  const checks: CheckResult[] = [];
  let template: string | null = null;
  let templateVersion: string | null = null;

  // 1. Scaffold lock file
  const lock = loadLockFile(projectDir);
  if (lock) {
    template = lock.template.name;
    templateVersion = lock.template.version;
    check(
      checks,
      "Scaffold Lock",
      "pass",
      `Tracked: ${lock.template.name}@${lock.template.version}`,
    );
  } else {
    check(
      checks,
      "Scaffold Lock",
      "warn",
      "No .scaffold-lock.yaml found — project not tracked by Forgix",
    );
  }

  // 2. Git repository
  if (fs.existsSync(path.join(projectDir, ".git"))) {
    check(checks, "Git Repository", "pass", "Initialized");
  } else {
    check(
      checks,
      "Git Repository",
      "warn",
      "No .git directory — version control not initialized",
    );
  }

  // 3. License file
  const licenseFiles = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE"];
  const hasLicense = licenseFiles.some((f) =>
    fs.existsSync(path.join(projectDir, f)),
  );
  if (hasLicense) {
    check(checks, "License File", "pass", "Present");
  } else {
    check(checks, "License File", "warn", "No LICENSE file found");
  }

  // 4. README
  if (fs.existsSync(path.join(projectDir, "README.md"))) {
    check(checks, "README", "pass", "Present");
  } else {
    check(checks, "README", "warn", "No README.md found");
  }

  // 5. .gitignore
  if (fs.existsSync(path.join(projectDir, ".gitignore"))) {
    check(checks, ".gitignore", "pass", "Present");
  } else {
    check(
      checks,
      ".gitignore",
      "warn",
      "No .gitignore — node_modules and secrets may be committed",
    );
  }

  // 6. Node.js checks
  const pkgPath = path.join(projectDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = fs.readJsonSync(pkgPath);

    // package.json metadata
    if (pkg.name && pkg.version && pkg.description) {
      check(
        checks,
        "Package Metadata",
        "pass",
        "name, version, description present",
      );
    } else {
      const missing = [];
      if (!pkg.name) missing.push("name");
      if (!pkg.version) missing.push("version");
      if (!pkg.description) missing.push("description");
      check(
        checks,
        "Package Metadata",
        "warn",
        `Missing: ${missing.join(", ")}`,
      );
    }

    // Lock file
    const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
    const hasLock = lockFiles.some((f) =>
      fs.existsSync(path.join(projectDir, f)),
    );
    if (hasLock) {
      check(checks, "Dependency Lock", "pass", "Lock file present");
    } else {
      check(
        checks,
        "Dependency Lock",
        "fail",
        "No lock file — dependencies are not pinned",
      );
    }

    // Security: no postinstall scripts
    const scripts = pkg.scripts || {};
    const dangerousScripts = ["preinstall", "install", "postinstall"];
    const foundDangerous = dangerousScripts.filter((s) => scripts[s]);
    if (foundDangerous.length === 0) {
      check(
        checks,
        "Install Scripts",
        "pass",
        "No preinstall/install/postinstall scripts",
      );
    } else {
      check(
        checks,
        "Install Scripts",
        "warn",
        `Found: ${foundDangerous.join(", ")} — review for supply chain risk`,
      );
    }

    // Test script
    if (
      scripts.test &&
      scripts.test !== 'echo "Error: no test specified" && exit 1'
    ) {
      check(checks, "Test Script", "pass", `Configured: ${scripts.test}`);
    } else {
      check(checks, "Test Script", "warn", "No test script configured");
    }

    // node_modules in .gitignore
    const gitignorePath = path.join(projectDir, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, "utf-8");
      if (gitignore.includes("node_modules")) {
        check(checks, "node_modules Excluded", "pass", "Listed in .gitignore");
      } else {
        check(
          checks,
          "node_modules Excluded",
          "fail",
          "node_modules not in .gitignore — will be committed",
        );
      }
    }
  }

  // 7. Environment files
  const envFiles = [".env", ".env.local", ".env.production"];
  const foundEnv = envFiles.filter((f) =>
    fs.existsSync(path.join(projectDir, f)),
  );
  if (foundEnv.length > 0) {
    const gitignorePath = path.join(projectDir, ".gitignore");
    const gitignore = fs.existsSync(gitignorePath)
      ? fs.readFileSync(gitignorePath, "utf-8")
      : "";
    const unignored = foundEnv.filter((f) => !gitignore.includes(f));
    if (unignored.length > 0) {
      check(
        checks,
        "Env Files",
        "fail",
        `${unignored.join(", ")} not in .gitignore — secrets may leak`,
      );
    } else {
      check(checks, "Env Files", "pass", "Environment files excluded from git");
    }
  } else {
    check(checks, "Env Files", "pass", "No .env files found");
  }

  // 8. Docker
  if (fs.existsSync(path.join(projectDir, "Dockerfile"))) {
    const dockerfile = fs.readFileSync(
      path.join(projectDir, "Dockerfile"),
      "utf-8",
    );
    const usesRoot =
      dockerfile.includes("USER root") || !dockerfile.includes("USER ");
    if (usesRoot) {
      check(
        checks,
        "Docker",
        "warn",
        "Dockerfile may run as root — add a non-root USER directive",
      );
    } else {
      check(checks, "Docker", "pass", "Dockerfile with non-root user");
    }
  }

  // 9. CI/CD
  const ciDirs = [
    path.join(projectDir, ".github", "workflows"),
    path.join(projectDir, ".gitlab-ci.yml"),
    path.join(projectDir, "Jenkinsfile"),
  ];
  const hasCI = ciDirs.some((p) => fs.existsSync(p));
  if (hasCI) {
    check(checks, "CI/CD", "pass", "Pipeline configuration found");
  } else {
    check(checks, "CI/CD", "warn", "No CI/CD pipeline configured");
  }

  // 10. Security: no hardcoded secrets (basic check)
  const sensitivePatterns = [
    "password",
    "secret_key",
    "api_key",
    "private_key",
    "AWS_SECRET",
  ];
  let foundSecrets = false;
  if (fs.existsSync(pkgPath)) {
    const pkgStr = JSON.stringify(fs.readJsonSync(pkgPath));
    for (const pattern of sensitivePatterns) {
      if (pkgStr.toLowerCase().includes(pattern.toLowerCase())) {
        foundSecrets = true;
        break;
      }
    }
  }
  if (foundSecrets) {
    check(
      checks,
      "Package Secret Keywords",
      "fail",
      "Potential secret keywords found in package.json",
    );
  } else {
    check(
      checks,
      "Package Secret Keywords",
      "pass",
      "No secret keywords in package.json; source files were not scanned",
    );
  }

  // Score
  const passCount = checks.filter((c) => c.status === "pass").length;
  const score = Math.round((passCount / checks.length) * 100);

  return { projectDir, template, templateVersion, checks, score };
}

export function printCheckReport(report: CheckReport): void {
  console.log(chalk.cyan("\n  Forgix Governance Check\n"));
  console.log(chalk.gray(`  Project: ${report.projectDir}`));
  if (report.template) {
    console.log(
      chalk.gray(`  Template: ${report.template}@${report.templateVersion}`),
    );
  }
  console.log("");

  for (const c of report.checks) {
    const icon =
      c.status === "pass"
        ? chalk.green("✔")
        : c.status === "warn"
          ? chalk.yellow("⚠")
          : chalk.red("✘");
    console.log(`  ${icon} ${c.name.padEnd(25)} ${chalk.gray(c.message)}`);
  }

  console.log("");
  const scoreColor =
    report.score >= 80
      ? chalk.green
      : report.score >= 60
        ? chalk.yellow
        : chalk.red;
  console.log(
    `  Score: ${scoreColor(`${report.score}%`)} (${report.checks.filter((c) => c.status === "pass").length}/${report.checks.length} checks passed)`,
  );
  console.log("");
}

export function exportCheckJSON(report: CheckReport): object {
  return {
    project: report.projectDir,
    template: report.template,
    template_version: report.templateVersion,
    score: report.score,
    checks: report.checks.map((c) => ({
      name: c.name,
      status: c.status,
      message: c.message,
    })),
  };
}
