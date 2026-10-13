import { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const listCommand = new Command("list")
  .description("List all available templates and plugins")
  .option("--json", "Output as JSON (for agents and scripting)")
  .action((options) => {
    const templatesPath = path.join(__dirname, "../../templates");
    const pluginsPath = path.join(__dirname, "../../plugins");
    const linksPath = path.join(os.homedir(), ".forgix-links.json");

    const templates = fs.existsSync(templatesPath)
      ? fs
          .readdirSync(templatesPath, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : [];

    const plugins = fs.existsSync(pluginsPath)
      ? fs
          .readdirSync(pluginsPath, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : [];

    let customLinks: Record<string, string> = {};
    if (fs.existsSync(linksPath)) {
      try {
        customLinks = fs.readJsonSync(linksPath);
      } catch {
        customLinks = {};
      }
    }

    if (options.json) {
      // Machine-readable JSON output for agents
      process.stdout.write(
        JSON.stringify(
          {
            templates,
            plugins,
            customLinks,
          },
          null,
          2,
        ) + "\n",
      );
      return;
    }

    // Human-readable output
    console.log(chalk.cyan("\n📋 Available Project Templates:"));
    templates.forEach((t) => console.log(`  - ${t}`));

    console.log(chalk.magenta("\n🧩 Available Plugins:"));
    plugins.forEach((p) => console.log(`  - ${p}`));

    if (Object.keys(customLinks).length > 0) {
      console.log(chalk.yellow("\n🔗 Linked Custom Templates:"));
      Object.entries(customLinks).forEach(([name, linkPath]) => {
        console.log(`  - ${name} ${chalk.gray(`(${linkPath})`)}`);
      });
    }

    console.log(
      chalk.gray(
        "\n💡 Use 'forgix create --template <name>' to start a new project.",
      ),
    );
    console.log(
      chalk.gray("💡 Use 'forgix add <plugin>' inside an existing project.\n"),
    );
  });
