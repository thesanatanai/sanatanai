import { readdirSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A package that is imported but not listed in package.json only works while
// some other dependency happens to install it (hoisting). It breaks, without
// warning and in CI only, the day that other dependency drops it. `pnpm install --frozen-lockfile`
// cannot detect this, so this test does.

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as Record<
  string,
  Record<string, string> | undefined
>;
const declared = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {}),
  ...Object.keys(manifest.optionalDependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(?:[cm]?[jt]sx?)$/.test(name) && !name.endsWith(".d.ts") ? [path] : [];
  });
}

/** Package names used by runtime (non type-only) imports of a source file. */
function runtimeImports(code: string): string[] {
  const specifiers = new Set<string>();
  const patterns = [
    // import x from "p" / import { x } from "p" / export * from "p"  (not `import type`)
    /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^;'"]*?\bfrom\s+["']([^"']+)["']/g,
    // import "p"
    /(?:^|\n)\s*import\s+["']([^"']+)["']/g,
    // import("p") and require("p")
    /\b(?:import|require)\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

// Handled by Next.js itself: the bundler resolves these without an install.
const handledByNext = new Set(["server-only", "client-only"]);

const packageName = (specifier: string) => {
  const [first, second] = specifier.split("/");
  return first.startsWith("@") ? `${first}/${second}` : first;
};

const isBuiltin = (specifier: string) =>
  specifier.startsWith("node:") || builtinModules.includes(specifier.split("/")[0]);
const isLocal = (specifier: string) => specifier.startsWith(".") || specifier.startsWith("@/");

function undeclaredIn(directories: string[], files: string[] = []) {
  const found = new Map<string, string[]>();
  for (const file of [...directories.flatMap((dir) => sourceFiles(join(root, dir))), ...files.map((f) => join(root, f))]) {
    if (file.endsWith("dependencies.test.ts")) continue; // its sample imports are fake
    for (const specifier of runtimeImports(readFileSync(file, "utf8"))) {
      if (isLocal(specifier) || isBuiltin(specifier) || handledByNext.has(specifier)) continue;
      const name = packageName(specifier);
      if (declared.has(name)) continue;
      found.set(name, [...(found.get(name) ?? []), file.replace(`${root}/`, "")]);
    }
  }
  return Object.fromEntries(found);
}

describe("dependencies", () => {
  it("every package the application imports is declared in package.json", () => {
    expect(undeclaredIn(["src"])).toEqual({});
  });

  it("every package the tests and tool configs import is declared in package.json", () => {
    expect(undeclaredIn(["tests"], ["vitest.config.mts", "vitest.smoke.config.mts", "next.config.ts", "eslint.config.mjs"])).toEqual({});
  });

  it("the scanner itself recognises the import forms used in this project", () => {
    const sample = `
      import a from "pkg-a";
      import { b,
        c } from "@scope/pkg-b/sub";
      import "side-effect";
      export * from "pkg-d";
      import type { T } from "types-only";
      const x = await import("pkg-e");
      const y = require("pkg-f");
    `;
    expect(runtimeImports(sample).sort()).toEqual(
      ["@scope/pkg-b/sub", "pkg-a", "pkg-d", "pkg-e", "pkg-f", "side-effect"].sort(),
    );
  });
});
