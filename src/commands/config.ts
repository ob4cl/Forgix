import { Command } from "commander";
import { input, select, confirm, checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import { saveConfig, getConfig, ForgixConfig } from "../core/config.js";

export const configCommand = new Command("config")
  .description("Configure your global Forgix Developer Profile")
  .option("--show", "Show current configuration")
  .option(
    "--set <key=value...>",
    "Set config values non-interactively (e.g., --set defaultAuthor=John defaultTemplate=react-vite)",
  )
  .option("--json", "Output configuration as JSON (for agents)")
  .option("-n, --non-interactive", "Skip interactive prompts (for CI/agents)")
  .action(async (options) => {
    const nonInteractive =
      options.nonInteractive ||
      process.env.FORGIX_NON_INTERACTIVE === "1" ||
      !process.stdout.isTTY;

    // --show or --json: display current config
    if (options.show || options.json) {
      const current = await getConfig();
      if (options.json) {
        process.stdout.write(JSON.stringify(current, null, 2) + "\n");
      } else {
        console.log(chalk.cyan("\n🛠️  Current Forgix Configuration:\n"));
        console.log(
          `  Default Author:      ${chalk.white(current.defaultAuthor)}`,
        );
        console.log(
          `  Default License:     ${chalk.white(current.defaultLicense)}`,
        );
        console.log(
          `  Preferred Editor:    ${chalk.white(current.preferredEditor)}`,
        );
        console.log(
          `  Auto Git:            ${chalk.white(current.autoGit ? "yes" : "no")}`,
        );
        console.log(
          `  Default Template:    ${chalk.white(current.defaultTemplate)}`,
        );
        console.log(
          `  Default PM:          ${chalk.white(current.defaultPackageManager)}`,
        );
        console.log(
          `  Default Flags:       ${chalk.white(current.defaultFlags.join(", ") || "(none)")}`,
        );
        console.log();
      }
      return;
    }

    // --set: non-interactive config update
    if (options.set && Array.isArray(options.set) && options.set.length > 0) {
      const updates: Partial<ForgixConfig> = {};
      const validKeys: (keyof ForgixConfig)[] = [
        "defaultAuthor",
        "defaultLicense",
        "preferredEditor",
        "autoGit",
        "defaultTemplate",
        "defaultPackageManager",
        "defaultFlags",
      ];

      for (const entry of options.set) {
        const eqIndex = entry.indexOf("=");
        if (eqIndex === -1) {
          console.log(
            chalk.red(
              `Invalid format: '${entry}'. Use key=value (e.g., defaultAuthor=John)`,
            ),
          );
          process.exit(1);
        }
        const key = entry.substring(0, eqIndex) as keyof ForgixConfig;
        const value = entry.substring(eqIndex + 1);

        if (!validKeys.includes(key)) {
          console.log(
            chalk.red(
              `Unknown config key: '${key}'. Valid keys: ${validKeys.join(", ")}`,
            ),
          );
          process.exit(1);
        }

        // Type coercion for boolean and array keys
        if (key === "autoGit") {
          (updates as any)[key] = value === "true" || value === "1";
        } else if (key === "defaultFlags") {
          (updates as any)[key] = value
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
        } else {
          (updates as any)[key] = value;
        }
      }

      await saveConfig(updates);
      const saved = await getConfig();
      console.log(chalk.green("\n✨ Configuration updated!\n"));
      process.stdout.write(JSON.stringify(saved, null, 2) + "\n");
      return;
    }

    // Interactive mode
    if (nonInteractive && !options.set) {
      console.log(
        chalk.yellow(
          "No --set values provided. Use --set key=value or remove --non-interactive for interactive mode.",
        ),
      );
      console.log(chalk.gray("Current config:"));
      const current = await getConfig();
      process.stdout.write(JSON.stringify(current, null, 2) + "\n");
      return;
    }

    const current = await getConfig();

    console.log(chalk.cyan("\n🛠️  Forgix Profile Configuration\n"));

    const defaultAuthor = await input({
      message: "Default Author Name:",
      default: current.defaultAuthor,
    });

    const defaultLicense = await select({
      message: "Default License:",
      choices: [
        { name: "MIT", value: "MIT" },
        { name: "ISC", value: "ISC" },
        { name: "Apache-2.0", value: "Apache-2.0" },
        { name: "GPL-3.0", value: "GPL-3.0" },
      ],
      default: current.defaultLicense,
    });

    const preferredEditor = await select({
      message: "Preferred Editor Command:",
      choices: [
        { name: "VS Code (code)", value: "code" },
        { name: "Cursor (cursor)", value: "cursor" },
        { name: "Vim", value: "vim" },
        { name: "None", value: "none" },
      ],
      default: current.preferredEditor,
    });

    const autoGit = await confirm({
      message: "Always initialize Git by default?",
      default: current.autoGit,
    });

    const defaultTemplate = await select({
      message: "Default Template:",
      choices: [
        { name: "React + Vite", value: "react-vite" },
        { name: "React + Vite (TypeScript)", value: "react-vite-ts" },
        { name: "Vue.js 3", value: "vue-app" },
        { name: "Next.js", value: "nextjs" },
        { name: "Svelte", value: "svelte" },
        { name: "Node.js Express API", value: "node-api" },
        { name: "Express + TypeScript", value: "express-ts" },
        { name: "Python Script", value: "python-script" },
        { name: "Python FastAPI", value: "fastapi" },
      ],
      default: current.defaultTemplate,
    });

    const packageManagerChoice = await select({
      message: "Default Package Manager:",
      choices: [
        { name: "npm", value: "npm" },
        { name: "yarn", value: "yarn" },
        { name: "pnpm", value: "pnpm" },
      ],
      default: current.defaultPackageManager,
    });
    const defaultPackageManager = packageManagerChoice as
      "npm" | "yarn" | "pnpm";

    const defaultFlags = await checkbox({
      message: "Default Flags (select all you want always applied):",
      choices: [
        { name: "--git (auto git init)", value: "--git" },
        { name: "--open (auto open VS Code)", value: "--open" },
      ],
    });

    await saveConfig({
      defaultAuthor,
      defaultLicense,
      preferredEditor,
      autoGit,
      defaultTemplate,
      defaultPackageManager,
      defaultFlags,
    });

    console.log(
      chalk.green("\n✨ Profile saved! Forgix is now personalized to you.\n"),
    );
  });
