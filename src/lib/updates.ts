import pkg from "../../package.json";

const OWNER = "raveeshbhalla";
const REPO = "cadence";
const LATEST_RELEASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

export interface UpdateInfo {
  current: string;
  latest: string;
  available: boolean;
  url: string;
}

interface GitHubRelease {
  tag_name?: string;
  html_url?: string;
}

function normalizeVersion(v: string): string {
  return v.trim().replace(/^v/i, "");
}

function compareVersions(a: string, b: string): number {
  const aa = normalizeVersion(a).split(/[.-]/).map((p) => Number.parseInt(p, 10) || 0);
  const bb = normalizeVersion(b).split(/[.-]/).map((p) => Number.parseInt(p, 10) || 0);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const diff = (aa[i] || 0) - (bb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = pkg.version;
  const res = await fetch(LATEST_RELEASE_URL, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 404) {
    return { current, latest: current, available: false, url: `https://github.com/${OWNER}/${REPO}/releases` };
  }
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);

  const release = (await res.json()) as GitHubRelease;
  const latest = release.tag_name || current;
  return {
    current,
    latest,
    available: compareVersions(latest, current) > 0,
    url: release.html_url || `https://github.com/${OWNER}/${REPO}/releases/latest`,
  };
}

