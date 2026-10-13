import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const hasShell = spawnSync("sh", ["-c", "exit 0"]).status === 0;
const cli = fileURLToPath(new URL("../../bin/forgix.js", import.meta.url));
function sandbox(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forgix-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const home = path.join(dir, "home");
  fs.mkdirSync(home);
  const template = path.join(dir, "template");
  fs.mkdirSync(template);
  fs.writeFileSync(
    path.join(template, "hello.txt"),
    "Hello {{projectName}} {{unknown}}",
  );
  fs.writeFileSync(
    path.join(template, "template.yaml"),
    "name: fixture\nversion: 2.3.4\n",
  );
  fs.writeFileSync(
    path.join(home, ".forgix-links.json"),
    JSON.stringify({ fixture: template }),
  );
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], {
      cwd: dir,
      env: {
        ...process.env,
        HOME: home,
        USERPROFILE: home,
        FORGIX_NON_INTERACTIVE: "1",
      },
      encoding: "utf8",
      timeout: 20000,
    });
  return { dir, home, template, run };
}
test("JSON listing contains one valid document", (t) => {
  const { run } = sandbox(t);
  const result = run("list", "--json");
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).templates.includes("node-api"));
});
test("creation substitutes known variables and records actual linked manifest", (t) => {
  const { run, dir } = sandbox(t);
  const result = run("create", "app", "-t", "fixture", "--skip-install", "-n");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "created");
  assert.equal(
    fs.readFileSync(path.join(dir, "app/hello.txt"), "utf8"),
    "Hello app {{unknown}}",
  );
  assert.match(
    fs.readFileSync(path.join(dir, "app/.scaffold-lock.yaml"), "utf8"),
    /2\.3\.4/,
  );
  assert.equal(fs.existsSync(path.join(dir, "app/.git")), false);
});
test("dry run describes new files and never creates the destination", (t) => {
  const { run, dir } = sandbox(t);
  const result = run("create", "preview", "-t", "fixture", "--dry-run", "-n");
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    JSON.parse(result.stdout).files.every((f) => f.action === "create"),
  );
  assert.equal(fs.existsSync(path.join(dir, "preview")), false);
});
test("existing destinations are preserved", (t) => {
  const { run, dir } = sandbox(t);
  fs.mkdirSync(path.join(dir, "app"));
  fs.writeFileSync(path.join(dir, "app/keep"), "original");
  assert.notEqual(
    run("create", "app", "-t", "fixture", "--skip-install").status,
    0,
  );
  assert.equal(fs.readFileSync(path.join(dir, "app/keep"), "utf8"), "original");
});
test("path traversal in project, template and plugin names is rejected", (t) => {
  const { run } = sandbox(t);
  for (const args of [
    ["create", "../escape", "-t", "fixture"],
    ["create", "app", "-t", "../src"],
    ["create", "app", "-t", "fixture", "--plugins", "../src"],
    ["add", "../src"],
  ]) {
    const result = run(...args);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  }
});
test("remote sources require explicit trust before clone", (t) => {
  const { run, dir } = sandbox(t);
  const result = run(
    "create",
    "app",
    "-t",
    "github:example/repo",
    "--skip-install",
    "-n",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--trust-remote/);
  assert.equal(fs.existsSync(path.join(dir, "app")), false);
});
test("remote dry run fails before clone or destination writes", (t) => {
  const { run, dir } = sandbox(t);
  const r = run(
    "create",
    "app",
    "-t",
    "github:example/repo",
    "--trust-remote",
    "--dry-run",
  );
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Remote dry runs/);
  assert.equal(fs.existsSync(path.join(dir, "app")), false);
});
test("hooks are skipped by default and excluded from completed hooks", (t) => {
  const { run, dir, template } = sandbox(t);
  fs.writeFileSync(
    path.join(template, "hooks.yaml"),
    "post_scaffold:\n  - id: fail\n    run: exit 1\n",
  );
  const r = run("create", "app", "-t", "fixture", "--skip-install");
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    fs.readFileSync(path.join(dir, "app/.scaffold-lock.yaml"), "utf8"),
    /hooks_ran: \[\]/,
  );
});
test("explicit hook failures produce failure and preserve partial output", (t) => {
  const { run, dir, template } = sandbox(t);
  fs.writeFileSync(
    path.join(template, "hooks.yaml"),
    "post_scaffold:\n  - id: fail\n    run: exit 1\n",
  );
  const r = run(
    "create",
    "app",
    "-t",
    "fixture",
    "--skip-install",
    "--allow-hooks",
  );
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout, "");
  assert.equal(fs.existsSync(path.join(dir, "app/hello.txt")), true);
  assert.equal(fs.existsSync(path.join(dir, "app/.scaffold-lock.yaml")), false);
});
test("layer path escape fails without reading outside source", (t) => {
  const { run, dir, template } = sandbox(t);
  fs.writeFileSync(
    path.join(template, "composition.yaml"),
    "base: ../home\nlayers: []\n",
  );
  const r = run(
    "create",
    "app",
    "-t",
    "fixture",
    "--layers",
    "bad",
    "--skip-install",
  );
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /inside/);
  assert.equal(fs.existsSync(path.join(dir, "app")), false);
});
test("binary data and unknown variables remain intact", (t) => {
  const { run, dir, template } = sandbox(t);
  const bytes = Buffer.from([0, 255, 100, 123, 123, 120, 125, 125]);
  fs.writeFileSync(path.join(template, "asset.dat"), bytes);
  const r = run("create", "app", "-t", "fixture", "--skip-install");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(fs.readFileSync(path.join(dir, "app/asset.dat")), bytes);
});
test("removed incomplete options fail explicitly", (t) => {
  const { run } = sandbox(t);
  assert.notEqual(run("create", "app", "--docker").status, 0);
  assert.notEqual(run("registry", "list").status, 0);
});
test("composition copies base and selected layer without leaking unselected layers", (t) => {
  const { run, dir, template } = sandbox(t);
  for (const name of ["base", "auth", "unused"])
    fs.mkdirSync(path.join(template, name));
  fs.writeFileSync(path.join(template, "base", "base.txt"), "base");
  fs.writeFileSync(path.join(template, "auth", "auth.txt"), "auth");
  fs.writeFileSync(path.join(template, "unused", "secret.txt"), "unused");
  fs.writeFileSync(
    path.join(template, "composition.yaml"),
    "base: base\nlayers:\n  - name: auth\n    path: auth\n",
  );
  const r = run(
    "create",
    "app",
    "-t",
    "fixture",
    "--skip-install",
    "--layers",
    "auth",
  );
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(dir, "app/base.txt")));
  assert.ok(fs.existsSync(path.join(dir, "app/auth.txt")));
  assert.equal(fs.existsSync(path.join(dir, "app/unused")), false);
  assert.equal(fs.existsSync(path.join(dir, "app/auth")), false);
});
test("dependency lifecycle scripts are disabled by default", (t) => {
  const { run, dir, template } = sandbox(t);
  fs.writeFileSync(
    path.join(template, "package.json"),
    JSON.stringify({
      name: "fixture",
      version: "1.0.0",
      scripts: {
        postinstall:
          "node -e \"require('fs').writeFileSync('script-ran','yes')\"",
      },
    }),
  );
  const r = run("create", "app", "-t", "fixture");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(path.join(dir, "app/script-ran")), false);
});

test(
  "successful hooks receive variables as data and only completed IDs are recorded",
  { skip: !hasShell },
  (t) => {
    const { run, dir, template } = sandbox(t);
    const author = "$(touch injected)";
    fs.writeFileSync(
      path.join(template, "hooks.yaml"),
      'post_scaffold:\n  - id: skipped\n    run: exit 1\n    condition: exists(missing)\n  - id: completed\n    run: |\n      printf "%s" "$FORGIX_AUTHOR" > author.txt\n',
    );
    const r = run(
      "create",
      "app",
      "-t",
      "fixture",
      "--skip-install",
      "--allow-hooks",
      "--author",
      author,
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      fs.readFileSync(path.join(dir, "app/author.txt"), "utf8"),
      author,
    );
    assert.equal(fs.existsSync(path.join(dir, "app/injected")), false);
    const lock = fs.readFileSync(
      path.join(dir, "app/.scaffold-lock.yaml"),
      "utf8",
    );
    assert.match(lock, /hooks_ran:\s*- completed/);
    assert.doesNotMatch(lock, /hooks_ran:\s*- skipped/);
  },
);

test("plugin collisions preserve existing files and fail", (t) => {
  const { run, dir, template } = sandbox(t);
  fs.writeFileSync(path.join(template, "Dockerfile"), "original");
  const r = run(
    "create",
    "app",
    "-t",
    "fixture",
    "--skip-install",
    "--plugins",
    "docker",
  );
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout, "");
  assert.equal(
    fs.readFileSync(path.join(dir, "app/Dockerfile"), "utf8"),
    "original",
  );
});
