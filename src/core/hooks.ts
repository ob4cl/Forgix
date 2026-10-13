import fs from "fs-extra";
import path from "path";
import { execa } from "execa";
import chalk from "chalk";
import ora from "ora";
import YAML from "yaml";
import { containedPath } from "./paths.js";

export interface Hook {
  id: string;
  name?: string;
  run: string;
  cwd?: string;
  on_error?: "fail" | "warn" | "ignore";
  timeout?: string;
  retry?: number;
  condition?: string;
  async?: boolean;
}

export interface HooksConfig {
  post_scaffold?: Hook[];
  pre_scaffold?: Hook[];
  post_install?: Hook[];
}

export function loadHooks(templatePath: string): HooksConfig | null {
  const hooksFile = path.join(templatePath, "hooks.yaml");
  if (!fs.existsSync(hooksFile)) return null;

  try {
    const content = fs.readFileSync(hooksFile, "utf-8");
    return YAML.parse(content) as HooksConfig;
  } catch {
    throw new Error("Invalid hooks.yaml.");
  }
}

function resolveVars(str: string, vars: Record<string, string>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`);
}

function checkCondition(condition: string, targetDir: string): boolean {
  // Support simple conditions: "not_exists(.git)", "exists(package.json)"
  const notExistsMatch = condition.match(/^not_exists\((.+)\)$/);
  if (notExistsMatch) {
    return !fs.existsSync(containedPath(targetDir, notExistsMatch[1]));
  }
  const existsMatch = condition.match(/^exists\((.+)\)$/);
  if (existsMatch) {
    return fs.existsSync(containedPath(targetDir, existsMatch[1]));
  }
  throw new Error("Unknown hook condition.");
}

function parseTimeout(timeout: string): number {
  const match = timeout.match(/^(\d+)(s|m|h)$/);
  if (!match) return 60000; // Default 60s
  const val = parseInt(match[1]);
  switch (match[2]) {
    case "s":
      return val * 1000;
    case "m":
      return val * 60000;
    case "h":
      return val * 3600000;
    default:
      return 60000;
  }
}

async function runHook(
  hook: Hook,
  targetDir: string,
  vars: Record<string, string>,
): Promise<"success" | "skipped" | "warned" | "failed"> {
  if (hook.async)
    throw new Error(
      "Background hooks are unsupported; hooks must finish before success is reported.",
    );
  const name = hook.name || hook.id;
  const onError = hook.on_error || "fail";
  const cwd = hook.cwd
    ? containedPath(targetDir, resolveVars(hook.cwd, vars))
    : targetDir;
  // Variables are data in the environment, never interpolated into shell source.
  const command = hook.run;
  const env = Object.fromEntries(
    Object.entries(vars).map(([key, value]) => [
      `FORGIX_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`,
      value,
    ]),
  );
  const timeout = hook.timeout ? parseTimeout(hook.timeout) : 60000;
  const maxRetries = hook.retry || 0;

  // Check condition
  if (hook.condition && !checkCondition(hook.condition, targetDir)) {
    console.log(chalk.gray(`  ⊘ ${name} (condition not met, skipped)`));
    return "skipped";
  }

  const spinner = ora(`  ${name}...`).start();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await execa("sh", ["-c", command], { cwd, timeout, env });
      spinner.succeed(chalk.green(`  ✓ ${name}`));
      return "success";
    } catch (error) {
      if (attempt < maxRetries) {
        spinner.text = `${name} (retry ${attempt + 1}/${maxRetries})...`;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const message = error instanceof Error ? error.message : String(error);
      if (onError === "warn") {
        spinner.warn(
          chalk.yellow(`  ⚠ ${name} (warning: ${message.slice(0, 80)})`),
        );
        return "warned";
      } else if (onError === "ignore") {
        spinner.info(chalk.gray(`  ⊘ ${name} (ignored)`));
        return "warned";
      } else {
        spinner.fail(
          chalk.red(`  ✘ ${name} (failed: ${message.slice(0, 80)})`),
        );
        return "failed";
      }
    }
  }
  return "failed";
}

export async function runHooks(
  phase: "pre_scaffold" | "post_scaffold" | "post_install",
  hooks: HooksConfig,
  targetDir: string,
  vars: Record<string, string> = {},
  completed: string[] = [],
): Promise<boolean> {
  const hooksList = hooks[phase];
  if (!hooksList || hooksList.length === 0) return true;

  console.log(chalk.cyan(`\n  Running ${phase.replace("_", " ")} hooks...`));

  let hasFailure = false;
  for (const hook of hooksList) {
    const result = await runHook(hook, targetDir, vars);
    if (result === "success") completed.push(hook.id);
    if (result === "failed") {
      hasFailure = true;
      break; // Stop on first failure for fail hooks
    }
  }

  return !hasFailure;
}
