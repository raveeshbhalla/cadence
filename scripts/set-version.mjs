import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextVersion = process.argv[2]?.trim().replace(/^v/i, "");

if (!nextVersion || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(nextVersion)) {
  console.error("Usage: pnpm version:set <semver-or-tag>");
  process.exit(1);
}

function updateJson(relativePath, updater) {
  const filePath = path.join(root, relativePath);
  const json = JSON.parse(readFileSync(filePath, "utf8"));
  updater(json);
  writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

function replaceVersion(relativePath, pattern, replacement) {
  const filePath = path.join(root, relativePath);
  const source = readFileSync(filePath, "utf8");
  const updated = source.replace(pattern, replacement);
  if (updated === source) {
    throw new Error(`Could not update version in ${relativePath}`);
  }
  writeFileSync(filePath, updated);
}

updateJson("package.json", (json) => {
  json.version = nextVersion;
});

updateJson("src-tauri/tauri.conf.json", (json) => {
  json.version = nextVersion;
});

replaceVersion("src-tauri/Cargo.toml", /^version = ".*"$/m, `version = "${nextVersion}"`);
replaceVersion(
  "src-tauri/Cargo.lock",
  /(\[\[package\]\]\nname = "cadence"\nversion = ")[^"]+(")/,
  `$1${nextVersion}$2`,
);

console.log(`Set Cadence version to ${nextVersion}.`);
