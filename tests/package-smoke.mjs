import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execa } from "execa";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "forgix-package-"));
try {
  const { stdout } = await execa("npm", [
    "pack",
    "--json",
    "--pack-destination",
    temp,
  ]);
  const packed = JSON.parse(stdout)[0];
  const files = packed.files.map((f) => f.path);
  assert.ok(files.includes("dist/cli/index.js"));
  assert.ok(files.includes("LICENSE"));
  assert.ok(files.includes("templates/node-api/index.js"));
  assert.ok(
    !files.some(
      (f) =>
        f.includes("tests/") ||
        f.includes("elite-vue-project") ||
        f.includes("test-speed"),
    ),
  );
  const prefix = path.join(temp, "prefix");
  await execa("npm", [
    "install",
    "--global",
    "--prefix",
    prefix,
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    path.join(temp, packed.filename),
  ]);
  const installed = path.join(
    prefix,
    process.platform === "win32" ? "node_modules" : "lib/node_modules",
    "forgix",
    "bin/forgix.js",
  );
  const listed = await execa(process.execPath, [installed, "list", "--json"]);
  assert.ok(JSON.parse(listed.stdout).templates.includes("node-api"));
  const created = await execa(
    process.execPath,
    [installed, "create", "app", "-t", "node-api", "--skip-install", "-n"],
    { cwd: temp, env: { HOME: temp, USERPROFILE: temp } },
  );
  assert.equal(JSON.parse(created.stdout).status, "created");
  assert.ok(fs.existsSync(path.join(temp, "app", "index.js")));
  console.log("Packed CLI installs and creates a project successfully.");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
