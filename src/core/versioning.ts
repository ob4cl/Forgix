import fs from "fs-extra";
import path from "path";
import YAML from "yaml";

export interface ScaffoldLock {
  template: {
    name: string;
    version: string;
    source: "local" | "registry" | "github";
    registry?: string;
  };
  scaffolded_at: string;
  engine_version: string;
  files_generated: string[];
  variables: Record<string, string>;
  hooks_ran: string[];
  patches_applied: PatchRecord[];
}

export interface PatchRecord {
  from_version: string;
  to_version: string;
  applied_at: string;
  files_changed: string[];
  conflicts: string[];
}

export interface TemplateManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  min_engine_version?: string;
  layers?: string[];
  hooks?: boolean;
  compatibility?: {
    generated_projects_compatible?: string;
    breaking_changes?: string[];
  };
}

const LOCK_FILE = ".scaffold-lock.yaml";
const MANIFEST_FILE = "template.yaml";

export function loadTemplateManifest(
  templatePath: string,
): TemplateManifest | null {
  const manifestPath = path.join(templatePath, MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const content = fs.readFileSync(manifestPath, "utf-8");
    return YAML.parse(content) as TemplateManifest;
  } catch {
    return null;
  }
}

export function writeLockFile(targetDir: string, lock: ScaffoldLock): void {
  const lockPath = path.join(targetDir, LOCK_FILE);
  const content = YAML.stringify(lock, { lineWidth: 120 });
  fs.writeFileSync(lockPath, content);
}

export function loadLockFile(projectDir: string): ScaffoldLock | null {
  const lockPath = path.join(projectDir, LOCK_FILE);
  if (!fs.existsSync(lockPath)) return null;

  try {
    const content = fs.readFileSync(lockPath, "utf-8");
    return YAML.parse(content) as ScaffoldLock;
  } catch {
    return null;
  }
}

export function collectGeneratedFiles(targetDir: string): string[] {
  const files: string[] = [];

  function walk(dir: string, prefix: string = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === ".scaffold-lock.yaml"
      )
        continue;
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), relPath);
      } else {
        files.push(relPath);
      }
    }
  }

  walk(targetDir);
  return files.sort();
}

export function createLockFile(
  templateName: string,
  templateVersion: string,
  source: "local" | "registry" | "github",
  targetDir: string,
  variables: Record<string, string>,
  hooksRan: string[] = [],
  registry?: string,
): ScaffoldLock {
  const lock: ScaffoldLock = {
    template: {
      name: templateName,
      version: templateVersion,
      source,
      ...(registry && { registry }),
    },
    scaffolded_at: new Date().toISOString(),
    engine_version: "1.1.0",
    files_generated: collectGeneratedFiles(targetDir),
    variables,
    hooks_ran: hooksRan,
    patches_applied: [],
  };

  writeLockFile(targetDir, lock);
  return lock;
}
