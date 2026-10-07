import { execFile } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, cp, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const extract = promisify(execFile);
const archiveURL = "https://codeload.github.com/timoniq/telegrinder/tar.gz/refs/heads/dev";

/** Fetch one snapshot so docs, README and version metadata cannot come from different revisions. */
export async function syncDocs(root) {
  if (process.env.TELEGRINDER_DOCS_DIR) {
    const directory = path.resolve(root, process.env.TELEGRINDER_DOCS_DIR);
    await access(path.join(directory, "tutorial/en"));
    console.log(`[docs] Using local documentation: ${directory}`);
    return;
  }

  const cache = path.join(root, ".cache");
  await mkdir(cache, { recursive: true });
  const temporary = await mkdtemp(path.join(cache, "telegrinder-"));
  try {
    console.log("[docs] Fetching timoniq/telegrinder dev snapshot...");
    const response = await fetch(archiveURL, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok || !response.body) {
      throw new Error(`Documentation download failed: HTTP ${response.status}`);
    }
    const archive = path.join(temporary, "source.tar.gz");
    await pipeline(Readable.fromWeb(response.body), createWriteStream(archive));
    await extract("tar", ["-xzf", archive, "-C", temporary]);
    const source = path.join(temporary, "telegrinder-dev");
    const snapshot = path.join(temporary, "snapshot");
    await mkdir(snapshot);
    for (const file of ["docs", "readme.md", "pyproject.toml", "typegen/config.toml"]) {
      await cp(path.join(source, file), path.join(snapshot, file), { recursive: true });
    }
    await access(path.join(snapshot, "docs/tutorial/en"));
    await rm(path.join(cache, "telegrinder"), { recursive: true, force: true });
    await rename(snapshot, path.join(cache, "telegrinder"));
    console.log("[docs] Fresh documentation ready.");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
