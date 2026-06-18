import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function readCargoVersion(relativePath) {
  const source = readFileSync(path.join(root, relativePath), "utf8");
  const packageSection = source.match(/\[package\]([\s\S]*?)(?:\n\[|$)/);
  const version = packageSection?.[1].match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1];
  if (!version) {
    throw new Error(`Could not find [package] version in ${relativePath}`);
  }
  return version;
}

function normalizeVersion(version) {
  return version.trim().replace(/^v/i, "");
}

function readTagArg() {
  const tagIndex = process.argv.indexOf("--tag");
  if (tagIndex === -1) return "";
  const tag = process.argv[tagIndex + 1];
  if (!tag) throw new Error("--tag requires a value");
  return tag;
}

const versions = {
  "package.json": readJson("package.json").version,
  "src-tauri/tauri.conf.json": readJson("src-tauri/tauri.conf.json").version,
  "src-tauri/Cargo.toml": readCargoVersion("src-tauri/Cargo.toml"),
};

const uniqueVersions = new Set(Object.values(versions));
if (uniqueVersions.size !== 1) {
  console.error("Version mismatch:");
  for (const [file, version] of Object.entries(versions)) {
    console.error(`  ${file}: ${version}`);
  }
  process.exit(1);
}

const [appVersion] = uniqueVersions;
const tag = readTagArg();
if (tag && normalizeVersion(tag) !== normalizeVersion(appVersion)) {
  console.error(`Release tag ${tag} does not match app version ${appVersion}.`);
  process.exit(1);
}

console.log(tag ? `Version ${appVersion} matches tag ${tag}.` : `Version ${appVersion} is in sync.`);
