import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { validateName, validateTemplateTree } from "./paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runAdd(plugin: string) {
  validateName(plugin);
  const targetPath = process.cwd(); // Inject into the current directory
  const pluginPath = path.join(__dirname, "../../plugins", plugin);

  if (!fs.existsSync(pluginPath)) {
    console.log(chalk.red(`\n❌ Error: Plugin '${plugin}' not found.\n`));
    process.exit(1);
  }

  const spinner = ora(`Adding ${plugin} to your project...`).start();

  try {
    // Copy the files, but never overwrite existing code!
    validateTemplateTree(pluginPath);
    fs.copySync(pluginPath, targetPath, {
      overwrite: false,
      errorOnExist: true,
    });

    spinner.succeed(
      chalk.green(`Successfully added ${plugin} to your project!`),
    );
    console.log(
      chalk.cyan(`\n💡 Tip: Check the new files added to your directory.\n`),
    );
  } catch (error) {
    spinner.fail(chalk.red(`Failed to add plugin.`));
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(message));
    process.exit(1);
  }
}
