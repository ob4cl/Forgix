import { Command } from "commander";
import { input, select, checkbox, Separator } from "@inquirer/prompts";
import { runCreate } from "../core/create.js";
import { getConfig } from "../core/config.js";
import { PackageManager } from "../core/install.js";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createCommand = new Command("create")
  .description("Scaffold a new project")
  .argument("[name]", "Name of your project")
  .option(
    "-t, --template <type>",
    "Template to use (react-vite, vue-app, node-api, python-script, nextjs, express, svelte, shadcn-next, express-ts, react-vite-ts, fastapi)",
  )
  .option("--skip-install", "Skip dependency installation")
  .option("--git", "Initialize a git repository")
  .option("--open", "Open the project in VS Code")
  .option(
    "--pm, --package-manager <pm>",
    "Package manager to use (npm, yarn, pnpm)",
  )
  .option("-a, --author <name>", "Author name")
  .option("-l, --license <type>", "License (MIT, ISC, Apache-2.0, GPL-3.0)")
  .option(
    "-p, --plugins <plugins...>",
    "Plugins to inject (comma or space separated)",
  )
  .option(
    "--trust-remote",
    "Auto-accept remote template clones (for CI/agents)",
  )
  .option(
    "--allow-hooks",
    "Run reviewed template hooks (executes shell commands)",
  )
  .option("--allow-scripts", "Allow dependency install lifecycle scripts")
  .option(
    "--dry-run",
    "Preview files that would be created without making changes",
  )
  .option(
    "--layers <layers...>",
    "Template layers to apply (for composable templates)",
  )
  .option(
    "-n, --non-interactive",
    "Skip all prompts, use defaults and provided flags (for CI/agents)",
  )
  .action(async (nameArg, options) => {
    const nonInteractive =
      options.nonInteractive ||
      process.env.FORGIX_NON_INTERACTIVE === "1" ||
      !process.stdout.isTTY;
    const config = await getConfig();

    try {
      // --- Project Name ---
      let projectName: string;
      if (nameArg) {
        projectName = nameArg;
      } else if (nonInteractive) {
        projectName = "my-app";
        console.log(chalk.gray(`Using default project name: ${projectName}`));
      } else {
        projectName = await input({
          message: "Project name:",
          default: "my-app",
        });
      }

      // --- Template ---
      const templateChoices = [
        new Separator(chalk.yellow("--- React ---")),
        { name: "React (Vite)", value: "react-vite" },
        { name: "React + TypeScript (Vite)", value: "react-vite-ts" },
        { name: "React + shadcn/ui (Next.js)", value: "shadcn-next" },
        new Separator(chalk.green("--- Vue ---")),
        { name: "Vue.js 3", value: "vue-app" },
        new Separator(chalk.blue("--- Next.js ---")),
        { name: "Next.js 16", value: "nextjs" },
        new Separator(chalk.magenta("--- Svelte ---")),
        { name: "Svelte 5", value: "svelte" },
        new Separator(chalk.red("--- Backend Node ---")),
        { name: "Node.js Express API", value: "node-api" },
        { name: "Express + TypeScript", value: "express-ts" },
        new Separator(chalk.cyan("--- Python ---")),
        { name: "Python Script", value: "python-script" },
        { name: "Python FastAPI", value: "fastapi" },
        new Separator(chalk.gray("--- Remote ---")),
        { name: "GitHub Repository", value: "github-prompt" },
      ];

      let template: string;
      if (options.template) {
        template = options.template;
      } else if (nonInteractive) {
        template = config.defaultTemplate || "react-vite";
        console.log(chalk.gray(`Using default template: ${template}`));
      } else {
        template = await select({
          message: "Select a Template:",
          choices: templateChoices,
          default: config.defaultTemplate,
        });
      }

      if (template === "github-prompt") {
        if (nonInteractive)
          throw new Error(
            "Specify github:owner/repository in non-interactive mode.",
          );
        template = `github:${await input({ message: "GitHub repository (owner/repo):" })}`;
      }

      // --- Package Manager ---
      const validPM: PackageManager[] = ["npm", "yarn", "pnpm"];
      const packageManagerInput =
        options.packageManager || config.defaultPackageManager || "npm";
      if (!validPM.includes(packageManagerInput as PackageManager))
        throw new Error("Unsupported package manager.");
      const packageManager = packageManagerInput as PackageManager;

      // --- Author ---
      let author: string;
      if (options.author) {
        author = options.author;
      } else if (nonInteractive) {
        author = config.defaultAuthor || "Developer";
        console.log(chalk.gray(`Using default author: ${author}`));
      } else {
        author = await input({
          message: "Author Name:",
          default: config.defaultAuthor,
        });
      }

      // --- License ---
      const validLicenses = ["MIT", "ISC", "Apache-2.0", "GPL-3.0"];
      let license: string;
      if (options.license && validLicenses.includes(options.license)) {
        license = options.license;
      } else if (nonInteractive) {
        license = config.defaultLicense || "MIT";
        console.log(chalk.gray(`Using default license: ${license}`));
      } else {
        license = await select({
          message: "Select License:",
          choices: [
            { name: "MIT", value: "MIT" },
            { name: "ISC", value: "ISC" },
            { name: "Apache-2.0", value: "Apache-2.0" },
            { name: "GPL-3.0", value: "GPL-3.0" },
          ],
          default: config.defaultLicense,
        });
      }

      // --- Plugins ---
      const pluginsPath = path.join(__dirname, "../../plugins");
      let availablePlugins: string[] = [];
      if (fs.existsSync(pluginsPath))
        availablePlugins = fs.readdirSync(pluginsPath);

      let selectedPlugins: string[] = [];
      if (options.plugins) {
        // --plugins docker eslint prettier
        selectedPlugins = (
          Array.isArray(options.plugins) ? options.plugins : [options.plugins]
        )
          .flatMap((p: string) => p.split(","))
          .filter(Boolean);
      } else if (nonInteractive) {
        // No plugins by default in non-interactive mode
      } else {
        if (availablePlugins.length > 0) {
          selectedPlugins = await checkbox({
            message: "Select Plugins to inject:",
            choices: availablePlugins.map((p) => ({ name: p, value: p })),
          });
        }
      }

      // Apply default config flags (only if not explicitly overridden)
      const configFlags = config.defaultFlags || [];
      const git =
        options.git !== undefined
          ? options.git
          : configFlags.includes("--git") || config.autoGit;
      const open =
        options.open !== undefined
          ? options.open
          : configFlags.includes("--open");

      await runCreate({
        name: projectName,
        template,
        skipInstall: options.skipInstall,
        git,
        open,
        variables: { author, license },
        plugins: selectedPlugins,
        packageManager,
        trustRemote: options.trustRemote,
        allowHooks: options.allowHooks,
        allowScripts: options.allowScripts,
        dryRun: options.dryRun,
        layers: options.layers,
        nonInteractive,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (nonInteractive) {
        console.error(chalk.red(`Error: ${message}`));
      } else {
        console.log("\nExiting Forgix...");
      }
      process.exit(1);
    }
  });
