import fs from "fs-extra";
import path from "node:path";
export function validateName(name: string): void {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)
  )
    throw new Error(
      "Use a simple name containing letters, numbers, hyphens, or underscores.",
    );
}
export function containedPath(root: string, relative: string): string {
  const result = path.resolve(root, relative);
  const rel = path.relative(path.resolve(root), result);
  if (
    path.isAbsolute(relative) ||
    rel === ".." ||
    rel.startsWith(`..${path.sep}`) ||
    path.isAbsolute(rel)
  )
    throw new Error("Path must stay inside its source directory.");
  return result;
}
export function validateTemplateTree(root: string): void {
  if (fs.lstatSync(root).isSymbolicLink())
    throw new Error("Template symbolic links are not supported.");
  if (
    fs
      .realpathSync(root)
      .split(/[\\/]/)
      .some((p) =>
        [
          ".ssh",
          ".gnupg",
          ".aws",
          ".npm",
          ".cache",
          ".config",
          ".local",
        ].includes(p.toLowerCase()),
      )
  )
    throw new Error("Sensitive directories cannot be templates.");
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      if (entry.isSymbolicLink())
        throw new Error("Template symbolic links are not supported.");
      if (entry.isDirectory()) walk(path.join(dir, entry.name));
    }
  }
  walk(root);
}
