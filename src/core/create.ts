import fs from "fs-extra";
import { materializeIgnoreAssets } from "./ignore-assets.js";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { confirm } from "@inquirer/prompts";
import { execa } from "execa";
import { replaceVariablesInDir } from "./template-engine.js";
import { installDependencies, PackageManager } from "./install.js";
import { loadHooks, runHooks } from "./hooks.js";
import { loadTemplateManifest, createLockFile } from "./versioning.js";
import { scanTemplate, printDryRun, exportDryRunJSON } from "./dry-run.js";
import {
  resolveCompositionLayers,
  applyLayer,
  isComposable,
} from "./composition.js";
import { validateName, validateTemplateTree } from "./paths.js";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export interface CreateOptions {
  name: string;
  template: string;
  skipInstall?: boolean;
  git?: boolean;
  open?: boolean;
  variables?: { author: string; license: string };
  plugins?: string[];
  packageManager?: PackageManager;
  trustRemote?: boolean;
  dryRun?: boolean;
  layers?: string[];
  nonInteractive?: boolean;
  allowHooks?: boolean;
  allowScripts?: boolean;
}
export async function runCreate(options: CreateOptions) {
  validateName(options.name);
  const target = path.join(process.cwd(), options.name);
  if (fs.existsSync(target))
    throw new Error(`Folder '${options.name}' already exists.`);
  const pm = options.packageManager || "npm";
  if (!["npm", "yarn", "pnpm"].includes(pm))
    throw new Error("Unsupported package manager.");
  const remote = options.template.startsWith("github:");
  let source: string;
  let temporary: string | undefined;
  let created = false;
  try {
    if (remote) {
      const repo = options.template.slice(7);
      if (
        !/^[a-zA-Z0-9][a-zA-Z0-9_-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(repo) ||
        repo.includes("..")
      )
        throw new Error("Use github:owner/repository.");
      if (options.dryRun)
        throw new Error(
          "Remote dry runs are not supported. Link an inspected local checkout to preview it.",
        );
      if (
        !options.trustRemote &&
        (options.nonInteractive ||
          !process.stdin.isTTY ||
          !(await confirm({
            message: "Trust this remote repository?",
            default: false,
          })))
      )
        throw new Error(
          "Remote templates require --trust-remote in non-interactive mode.",
        );
      temporary = fs.mkdtempSync(path.join(os.tmpdir(), "forgix-"));
      source = path.join(temporary, "source");
      await execa("git", [
        "clone",
        "--depth",
        "1",
        `https://github.com/${repo}.git`,
        source,
      ]);
    } else {
      const linksFile = path.join(os.homedir(), ".forgix-links.json");
      const links: Record<string, string> = fs.existsSync(linksFile)
        ? fs.readJsonSync(linksFile)
        : {};
      if (Object.hasOwn(links, options.template))
        source = links[options.template];
      else {
        validateName(options.template);
        source = path.join(root, "templates", options.template);
      }
    }
    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory())
      throw new Error(`Template '${options.template}' not found.`);
    validateTemplateTree(source);
    const manifest = loadTemplateManifest(source);
    const layers =
      isComposable(source) || options.layers?.length
        ? resolveCompositionLayers(source, options.layers || [])
        : [];
    const pluginPaths = (options.plugins || []).map((name) => {
      validateName(name);
      const dir = path.join(root, "plugins", name);
      if (!fs.existsSync(dir)) throw new Error(`Plugin '${name}' not found.`);
      validateTemplateTree(dir);
      return dir;
    });
    const vars = {
      projectName: options.name,
      author: options.variables?.author || "Developer",
      license: options.variables?.license || "MIT",
    };
    if (options.dryRun) {
      if (layers.length || pluginPaths.length)
        throw new Error(
          "Dry run previews the base template only; omit --layers and --plugins.",
        );
      const preview = scanTemplate(source, target);
      if (options.nonInteractive)
        process.stdout.write(
          JSON.stringify(exportDryRunJSON(preview), null, 2) + "\n",
        );
      else printDryRun(preview);
      return;
    }
    fs.mkdirSync(target);
    created = true;
    const copySource = layers.length ? layers[0].path : source;
    fs.copySync(copySource, target, {
      filter: (src) =>
        !path
          .relative(copySource, src)
          .split(path.sep)
          .some((p) =>
            [
              ".git",
              "node_modules",
              "hooks.yaml",
              "template.yaml",
              "composition.yaml",
            ].includes(p),
          ),
    });
    for (const layer of layers.slice(1))
      applyLayer(layer.path, target, layer.layer.conflicts);
    for (const plugin of pluginPaths)
      fs.copySync(plugin, target, { overwrite: false, errorOnExist: true });
    materializeIgnoreAssets(target);
    await replaceVariablesInDir(target, vars);
    const hooks = loadHooks(source);
    const hooksRan: string[] = [];
    if (hooks && !options.allowHooks)
      console.error(
        "Template hooks skipped. Use --allow-hooks only after reviewing them.",
      );
    if (
      hooks &&
      options.allowHooks &&
      !(await runHooks("pre_scaffold", hooks, target, vars, hooksRan))
    )
      throw new Error("Pre-scaffold hook failed.");
    const installed =
      !options.skipInstall && fs.existsSync(path.join(target, "package.json"));
    if (installed) await installDependencies(target, pm, options.allowScripts);
    if (hooks && options.allowHooks) {
      if (
        installed &&
        !(await runHooks("post_install", hooks, target, vars, hooksRan))
      )
        throw new Error("Post-install hook failed.");
      if (!(await runHooks("post_scaffold", hooks, target, vars, hooksRan)))
        throw new Error("Post-scaffold hook failed.");
    }
    createLockFile(
      options.template,
      manifest?.version || "unversioned",
      remote ? "github" : "local",
      target,
      vars,
      hooksRan,
    );
    if (options.git) await execa("git", ["init"], { cwd: target });
    if (options.open) await execa("code", ["."], { cwd: target });
    if (options.nonInteractive)
      process.stdout.write(
        JSON.stringify(
          {
            status: "created",
            name: options.name,
            template: options.template,
            path: target,
            packageManager: pm,
            git: !!options.git,
            plugins: options.plugins || [],
          },
          null,
          2,
        ) + "\n",
      );
    else console.log(`Created ${options.name} at ${target}`);
  } catch (error) {
    if (created)
      console.error(
        `Creation failed; inspect the partial project at ${target}.`,
      );
    throw error;
  } finally {
    if (temporary) fs.removeSync(temporary);
  }
}
export function detectPackageManager(dir: string): PackageManager {
  return fs.existsSync(path.join(dir, "pnpm-lock.yaml"))
    ? "pnpm"
    : fs.existsSync(path.join(dir, "yarn.lock"))
      ? "yarn"
      : "npm";
}
