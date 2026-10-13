import { Command } from "commander";
import chalk from "chalk";
import { createCommand } from "../commands/create.js";
import { addCommand } from "../commands/add.js";
import { listCommand } from "../commands/list.js";
import { doctorCommand } from "../commands/doctor.js";
import { linkCommand } from "../commands/link.js";
import { configCommand } from "../commands/config.js";
import { checkCommand } from "../commands/check.js";

const program = new Command();

function showBanner() {
  console.log(
    chalk.cyan(`
  ███████╗ ██████╗ ██████╗  ██████╗ ██╗██╗  ██╗
  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██║╚██╗██╔╝
  █████╗  ██║   ██║██████╔╝██║  ███╗██║ ╚███╔╝ 
  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██║ ██╔██╗ 
  ██║     ╚██████╔╝██║  ██║╚██████╔╝██║██╔╝ ██╗
  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝╚═╝  ╚═╝
  `),
  );
  console.log(chalk.gray(`  v1.1.0 - Agent-Aware Edition\n`));
}

program
  .name("forgix")
  .description("Reusable project templates with explicit execution controls")
  .version("1.1.0");

const machine =
  process.argv.includes("--json") ||
  process.argv.includes("--non-interactive") ||
  process.argv.includes("-n") ||
  process.env.FORGIX_NON_INTERACTIVE === "1" ||
  !process.stdout.isTTY;
if (machine) console.log = (...args: unknown[]) => console.error(...args);
else showBanner();

program.addCommand(createCommand);
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(doctorCommand);
program.addCommand(linkCommand);
program.addCommand(configCommand);
program.addCommand(checkCommand);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
