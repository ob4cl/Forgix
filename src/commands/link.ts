import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { validateName, validateTemplateTree } from "../core/paths.js";

// Where we store custom template links on the user's computer
const CONFIG_PATH = path.join(os.homedir(), ".forgix-links.json");

// Sensitive directories that should never be used as template sources
const SENSITIVE_DIRS = [
  ".ssh",
  ".gnupg",
  ".aws",
  ".npm",
  ".cache",
  ".config",
  ".local",
];

export const linkCommand = new Command("link")
  .description("Link a local folder as a custom Forgix template")
  .argument("<name>", "The nickname for your template")
  .argument("[path]", "The folder path (defaults to current directory)", ".")
  .option("-n, --non-interactive", "Skip confirmation prompts (for CI/agents)")
  .action(async (name, folderPath, options) => {
    validateName(name);
    const absolutePath = path.resolve(folderPath);
    validateTemplateTree(absolutePath);
    const nonInteractive =
      options.nonInteractive ||
      process.env.FORGIX_NON_INTERACTIVE === "1" ||
      !process.stdout.isTTY;

    if (!fs.existsSync(absolutePath)) {
      console.log(
        chalk.red(`\n❌ Error: The path '${absolutePath}' does not exist.`),
      );
      process.exit(1);
    }

    // SECURITY: Verify it's a directory, not a file
    const stat = fs.statSync(absolutePath);
    if (!stat.isDirectory()) {
      console.log(
        chalk.red(`\n❌ Error: '${absolutePath}' is not a directory.`),
      );
      process.exit(1);
    }

    // SECURITY: Block linking sensitive system directories at link-time
    const normalizedPath = path.normalize(absolutePath);
    if (normalizedPath.includes("..") || !path.isAbsolute(absolutePath)) {
      console.log(
        chalk.red(`\n❌ Error: Invalid path — path traversal detected.`),
      );
      process.exit(1);
    }

    for (const dir of SENSITIVE_DIRS) {
      if (
        absolutePath.includes(`/${dir}`) ||
        absolutePath.includes(`\\${dir}`) ||
        absolutePath.endsWith(`/${dir}`) ||
        absolutePath.endsWith(`\\${dir}`)
      ) {
        console.log(
          chalk.red(
            `\n❌ Error: Cannot link sensitive directory '${dir}'. This path is blocked for security.`,
          ),
        );
        process.exit(1);
      }
    }

    // Load existing links or start fresh
    let links: Record<string, string> = {};

    if (fs.existsSync(CONFIG_PATH)) {
      try {
        links = fs.readJsonSync(CONFIG_PATH);
      } catch {
        // If file is corrupted, we start with an empty record
        links = {};
      }
    }

    // Add or update the link
    links[name] = absolutePath;
    // Write with restrictive permissions atomically
    const fd = fs.openSync(CONFIG_PATH, "w", 0o600);
    try {
      fs.writeSync(fd, JSON.stringify(links, null, 2));
    } finally {
      fs.closeSync(fd);
    }

    console.log(
      chalk.green(`\n✅ Success! '${name}' is now linked to: ${absolutePath}`),
    );
    console.log(
      chalk.gray(
        `You can now use: forgix create my-project --template ${name}\n`,
      ),
    );

    // Non-interactive JSON output for agents
    if (nonInteractive) {
      process.stdout.write(
        JSON.stringify(
          {
            status: "linked",
            name,
            path: absolutePath,
            links: Object.keys(links),
          },
          null,
          2,
        ) + "\n",
      );
    }
  });
