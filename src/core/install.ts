import { execa } from "execa";

export type PackageManager = "npm" | "yarn" | "pnpm";

export async function installDependencies(
  dir: string,
  packageManager: PackageManager = "npm",
  allowScripts = false,
) {
  let command: string;
  let args: string[];

  switch (packageManager) {
    case "yarn":
      command = "yarn";
      args = [];
      break;
    case "pnpm":
      command = "pnpm";
      args = ["install"];
      break;
    case "npm":
    default:
      command = "npm";
      args = ["install"];
      break;
  }

  if (!allowScripts) args.push("--ignore-scripts");
  try {
    await execa(command, args, { cwd: dir });
  } catch {
    throw new Error(`Dependency installation failed with ${packageManager}.`);
  }
}

export async function isPackageManagerAvailable(
  pm: PackageManager,
): Promise<boolean> {
  try {
    await execa(pm, ["--version"]);
    return true;
  } catch {
    return false;
  }
}
