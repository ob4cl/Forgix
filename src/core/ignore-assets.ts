import fs from "fs-extra";
import path from "node:path";

export function materializeIgnoreAssets(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const source = path.join(dir, entry.name);
    if (entry.isDirectory()) materializeIgnoreAssets(source);
    else if (entry.name === "_gitignore") {
      const destination = path.join(dir, ".gitignore");
      if (fs.existsSync(destination)) {
        if (!fs.readFileSync(source).equals(fs.readFileSync(destination))) {
          throw new Error(
            "Conflicting _gitignore and .gitignore assets; existing ignore file was preserved.",
          );
        }
        fs.unlinkSync(source);
      } else fs.renameSync(source, destination);
    }
  }
}
