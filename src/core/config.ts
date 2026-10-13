import fs from "fs-extra";
import path from "path";
import os from "os";

const CONFIG_PATH = path.join(os.homedir(), ".forgix-config.json");

export interface ForgixConfig {
  defaultAuthor: string;
  defaultLicense: string;
  preferredEditor: string;
  autoGit: boolean;
  defaultTemplate: string;
  defaultPackageManager: "npm" | "yarn" | "pnpm";
  defaultFlags: string[];
}

const defaultConfig: ForgixConfig = {
  defaultAuthor: "Developer",
  defaultLicense: "MIT",
  preferredEditor: "code",
  autoGit: false,
  defaultTemplate: "react-vite",
  defaultPackageManager: "npm",
  defaultFlags: [],
};

export async function getConfig(): Promise<ForgixConfig> {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const userConfig = await fs.readJson(CONFIG_PATH);
      return { ...defaultConfig, ...userConfig };
    } catch {
      return defaultConfig;
    }
  }
  return defaultConfig;
}

export async function saveConfig(config: Partial<ForgixConfig>) {
  const current = await getConfig();
  const updated = { ...current, ...config };
  // Write with restrictive permissions atomically (0600 = owner read/write only)
  const fd = fs.openSync(CONFIG_PATH, "w", 0o600);
  try {
    fs.writeSync(fd, JSON.stringify(updated, null, 2));
  } finally {
    fs.closeSync(fd);
  }
}
