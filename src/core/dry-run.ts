import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

export interface DryRunEntry {
  type: "create" | "copy" | "modify";
  path: string;
  source?: string;
  size?: number;
}

export interface DryRunResult {
  entries: DryRunEntry[];
  totalFiles: number;
  totalSize: number;
  directories: Set<string>;
}

const BINARY_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".webp",
  ".svg",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
];

function isBinaryFile(filePath: string): boolean {
  return BINARY_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

export function scanTemplate(
  sourcePath: string,
  targetBase: string,
): DryRunResult {
  const entries: DryRunEntry[] = [];
  const directories = new Set<string>();
  let totalSize = 0;

  function walk(src: string, rel: string) {
    const dirEntries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of dirEntries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      if (
        ["hooks.yaml", "template.yaml", "composition.yaml"].includes(entry.name)
      )
        continue;

      if (
        entry.name === "_gitignore" &&
        fs.existsSync(path.join(src, ".gitignore"))
      ) {
        if (
          !fs
            .readFileSync(path.join(src, "_gitignore"))
            .equals(fs.readFileSync(path.join(src, ".gitignore")))
        )
          throw new Error("Conflicting ignore assets.");
        continue;
      }
      const name = entry.name === "_gitignore" ? ".gitignore" : entry.name;
      const relPath = rel ? `${rel}/${name}` : name;
      const fullPath = path.join(src, entry.name);

      if (entry.isDirectory()) {
        directories.add(relPath);
        walk(fullPath, relPath);
      } else {
        const stat = fs.statSync(fullPath);
        const targetPath = path.join(targetBase, relPath);
        const exists = fs.existsSync(targetPath);

        entries.push({
          type: exists ? "modify" : "create",
          path: relPath,
          source: fullPath,
          size: stat.size,
        });
        totalSize += stat.size;
      }
    }
  }

  walk(sourcePath, "");

  return {
    entries,
    totalFiles: entries.length,
    totalSize,
    directories,
  };
}

export function printDryRun(result: DryRunResult): void {
  console.log(
    chalk.cyan("\n  Preview — files that would be created/modified:\n"),
  );

  // Group by directory
  const byDir = new Map<string, DryRunEntry[]>();
  for (const entry of result.entries) {
    const dir = path.dirname(entry.path);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(entry);
  }

  // Sort directories and print tree
  const sortedDirs = [...byDir.keys()].sort();
  for (const dir of sortedDirs) {
    if (dir !== ".") {
      console.log(chalk.gray(`  ${dir}/`));
    }
    const files = byDir.get(dir)!.sort((a, b) => a.path.localeCompare(b.path));
    for (const file of files) {
      const icon =
        file.type === "create" ? chalk.green("+") : chalk.yellow("~");
      const size = formatSize(file.size || 0);
      const binary = isBinaryFile(file.path) ? chalk.gray(" (binary)") : "";
      console.log(`  ${icon} ${file.path}${binary} ${chalk.gray(size)}`);
    }
  }

  // Summary
  const creates = result.entries.filter((e) => e.type === "create").length;
  const modifies = result.entries.filter((e) => e.type === "modify").length;

  console.log("");
  console.log(chalk.cyan("  Summary:"));
  console.log(`    ${chalk.green(`+ ${creates} files to create`)}`);
  if (modifies > 0) {
    console.log(`    ${chalk.yellow(`~ ${modifies} files to overwrite`)}`);
  }
  console.log(`    ${chalk.gray(`${result.directories.size} directories`)}`);
  console.log(`    ${chalk.gray(`Total: ${formatSize(result.totalSize)}`)}`);
  console.log("");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function exportDryRunJSON(result: DryRunResult): object {
  return {
    total_files: result.totalFiles,
    total_size: result.totalSize,
    total_size_human: formatSize(result.totalSize),
    directories: result.directories.size,
    files: result.entries.map((e) => ({
      action: e.type,
      path: e.path,
      size: e.size,
    })),
  };
}
