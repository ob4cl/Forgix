import { Command } from "commander";
import { execa } from "execa";
export const doctorCommand = new Command("doctor")
  .description(
    "Report available development tools without changing your system",
  )
  .option("-n, --non-interactive", "Output JSON")
  .option("--json", "Output JSON")
  .action(async (options) => {
    const tools = [
      { name: "Node.js", cmd: process.execPath, args: ["--version"] },
      { name: "Git", cmd: "git", args: ["--version"] },
      { name: "npm", cmd: "npm", args: ["--version"] },
    ];
    const checks = await Promise.all(
      tools.map(async (tool) => {
        try {
          const { stdout } = await execa(tool.cmd, tool.args, {
            timeout: 10000,
          });
          return { tool: tool.name, status: "pass", version: stdout.trim() };
        } catch {
          return { tool: tool.name, status: "missing", version: null };
        }
      }),
    );
    if (
      options.json ||
      options.nonInteractive ||
      process.env.FORGIX_NON_INTERACTIVE === "1" ||
      !process.stdout.isTTY
    )
      process.stdout.write(JSON.stringify({ checks }, null, 2) + "\n");
    else
      for (const check of checks)
        console.log(`${check.tool}: ${check.version || "not found"}`);
  });
