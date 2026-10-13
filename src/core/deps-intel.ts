import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { execa } from "execa";

export interface DepIssue {
  type:
    | "deprecated"
    | "vulnerable"
    | "outdated"
    | "missing-lock"
    | "audit-unavailable";
  package?: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
}

export async function analyzeDependencies(
  projectDir: string,
): Promise<DepIssue[]> {
  const issues: DepIssue[] = [];
  const pkgPath = path.join(projectDir, "package.json");

  if (!fs.existsSync(pkgPath)) return issues;

  const pkg = fs.readJsonSync(pkgPath);
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  // 1. Check for known deprecated packages
  const deprecatedPackages: Record<string, string> = {
    request: "Use fetch, axios, or got instead",
    "request-promise": "Use fetch, axios, or got instead",
    "node-uuid": "Use uuid instead",
    "gulp-util": "Use individual packages instead",
    "babel-eslint": "Use @babel/eslint-parser instead",
    tslint: "Use eslint with @typescript-eslint instead",
    istanbul: "Use nyc or c8 instead",
    bower: "Use npm/yarn/pnpm instead",
    jade: "Use pug instead",
    stylus: "Use sass or postcss instead",
  };

  for (const [pkgName, reason] of Object.entries(deprecatedPackages)) {
    if (allDeps[pkgName]) {
      issues.push({
        type: "deprecated",
        package: pkgName,
        message: `${pkgName} is deprecated. ${reason}`,
        severity: "medium",
      });
    }
  }

  // 2. Check for missing lock file
  const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
  const hasLock = lockFiles.some((f) =>
    fs.existsSync(path.join(projectDir, f)),
  );
  if (!hasLock) {
    issues.push({
      type: "missing-lock",
      message: "No lock file — dependencies are not pinned",
      severity: "high",
    });
  }

  // 3. Run npm audit if available
  try {
    const { stdout } = await execa("npm", ["audit", "--json"], {
      cwd: projectDir,
      timeout: 30000,
      reject: false,
    });

    const audit = JSON.parse(stdout);
    if (audit.error) throw new Error("npm audit could not complete.");
    if (audit.vulnerabilities) {
      for (const [name, vuln] of Object.entries(
        audit.vulnerabilities as Record<string, any>,
      )) {
        const severity = vuln.severity as DepIssue["severity"];
        issues.push({
          type: "vulnerable",
          package: name,
          message: `${name}: ${vuln.via?.[0]?.title || "Known vulnerability"} (${severity})`,
          severity: severity || "medium",
        });
      }
    }
  } catch {
    issues.push({
      type: "audit-unavailable",
      message: "npm audit did not complete; vulnerability status is unknown",
      severity: "high",
    });
  }

  return issues;
}

export function printDepReport(issues: DepIssue[]): void {
  if (issues.length === 0) {
    console.log(chalk.green("\n  ✓ No dependency issues found.\n"));
    return;
  }

  console.log(chalk.cyan("\n  Dependency Analysis\n"));

  // Group by severity
  const critical = issues.filter((i) => i.severity === "critical");
  const high = issues.filter((i) => i.severity === "high");
  const medium = issues.filter((i) => i.severity === "medium");
  const low = issues.filter((i) => i.severity === "low");

  for (const group of [
    { items: critical, color: chalk.red, label: "Critical" },
    { items: high, color: chalk.red, label: "High" },
    { items: medium, color: chalk.yellow, label: "Medium" },
    { items: low, color: chalk.gray, label: "Low" },
  ]) {
    for (const issue of group.items) {
      const icon = group.color("✘");
      const typeLabel = chalk.gray(`[${issue.type}]`);
      console.log(`  ${icon} ${typeLabel} ${issue.message}`);
    }
  }

  console.log("");
  console.log(chalk.cyan("  Summary:"));
  if (critical.length > 0)
    console.log(chalk.red(`    ${critical.length} critical`));
  if (high.length > 0) console.log(chalk.red(`    ${high.length} high`));
  if (medium.length > 0)
    console.log(chalk.yellow(`    ${medium.length} medium`));
  if (low.length > 0) console.log(chalk.gray(`    ${low.length} low`));
  console.log("");
}

export function exportDepJSON(issues: DepIssue[]): object {
  return {
    total: issues.length,
    critical: issues.filter((i) => i.severity === "critical").length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
    issues: issues.map((i) => ({
      type: i.type,
      package: i.package,
      message: i.message,
      severity: i.severity,
    })),
  };
}
