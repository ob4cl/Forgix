import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import { containedPath, validateTemplateTree } from "./paths.js";

export interface TemplateLayer {
  name: string;
  description?: string;
  path: string;
  conflicts?: "overwrite" | "skip" | "merge";
  condition?: string;
}

export interface CompositionConfig {
  base: string;
  layers: TemplateLayer[];
  variables?: Record<string, string>;
}

const COMPOSITION_FILE = "composition.yaml";

export function loadComposition(
  templatePath: string,
): CompositionConfig | null {
  const compPath = path.join(templatePath, COMPOSITION_FILE);
  if (!fs.existsSync(compPath)) return null;

  try {
    const content = fs.readFileSync(compPath, "utf-8");
    return YAML.parse(content) as CompositionConfig;
  } catch {
    return null;
  }
}

export function isComposable(templatePath: string): boolean {
  return fs.existsSync(path.join(templatePath, COMPOSITION_FILE));
}

export function listLayers(templatePath: string): TemplateLayer[] {
  const comp = loadComposition(templatePath);
  return comp?.layers || [];
}

export function applyLayer(
  layerDir: string,
  targetDir: string,
  mode: "overwrite" | "skip" | "merge" = "overwrite",
): string[] {
  if (!["overwrite", "skip", "merge"].includes(mode))
    throw new Error("Unknown layer conflict policy.");
  const applied: string[] = [];

  if (mode === "merge")
    throw new Error(
      "Merge layers are not supported; choose overwrite or skip.",
    );
  validateTemplateTree(layerDir);
  if (!fs.existsSync(layerDir)) return applied;

  function walk(src: string, rel: string) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;

      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(targetDir, relPath);

      if (entry.isDirectory()) {
        fs.ensureDirSync(destPath);
        walk(srcPath, relPath);
      } else {
        const exists = fs.existsSync(destPath);
        if (exists && mode === "skip") continue;

        fs.ensureDirSync(path.dirname(destPath));
        fs.copyFileSync(srcPath, destPath);
        applied.push(relPath);
      }
    }
  }

  walk(layerDir, "");
  return applied;
}

export function resolveCompositionLayers(
  templatePath: string,
  selectedLayers: string[],
): { path: string; layer: TemplateLayer }[] {
  const comp = loadComposition(templatePath);
  if (!comp) throw new Error("Template has no valid composition.yaml.");

  const resolved: { path: string; layer: TemplateLayer }[] = [];

  // Base is always included
  const basePath = containedPath(templatePath, comp.base);
  if (!fs.existsSync(basePath) || !fs.statSync(basePath).isDirectory())
    throw new Error("Composition base directory not found.");
  if (fs.existsSync(basePath)) {
    resolved.push({
      path: basePath,
      layer: {
        name: "base",
        description: "Base template",
        path: comp.base,
        conflicts: "overwrite",
      },
    });
  }

  // Selected layers
  for (const layerName of selectedLayers) {
    const layer = comp.layers.find((l) => l.name === layerName);
    if (!layer) throw new Error(`Unknown layer: ${layerName}`);

    if (layer.condition) throw new Error("Layer conditions are unsupported.");
    const layerPath = containedPath(templatePath, layer.path);
    if (!fs.existsSync(layerPath) || !fs.statSync(layerPath).isDirectory())
      throw new Error(`Layer directory not found: ${layerName}`);
    if (fs.existsSync(layerPath)) {
      resolved.push({ path: layerPath, layer });
    }
  }

  return resolved;
}
