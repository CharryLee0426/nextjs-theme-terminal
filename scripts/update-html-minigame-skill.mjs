/**
 * Upload a new immutable version of the vendored html-minigame skill to OpenAI.
 *
 * Usage:
 *   node scripts/update-html-minigame-skill.mjs
 *     → uploads files from src/lib/gameCreator/html-minigame/
 *
 *   node scripts/update-html-minigame-skill.mjs --default
 *     → upload and set the new version as default
 *
 *   node scripts/update-html-minigame-skill.mjs --dry-run
 *     → list files that would be uploaded (no API call)
 *
 *   node scripts/update-html-minigame-skill.mjs --zip
 *     → also write src/lib/gameCreator/html-minigame.zip (for manual curl)
 *
 * Environment:
 *   OPENAI_API_KEY                  (required unless --dry-run)
 *   OPENAI_HTML_MINIGAME_SKILL_ID   (optional; has a project default)
 *
 * Reads OPENAI_API_KEY from .env.local when not set in the shell.
 *
 * @see https://developers.openai.com/api/reference/resources/skills/
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const SKILL_SOURCE_DIR = join(root, "src/lib/gameCreator/html-minigame");
const SKILL_FOLDER_NAME = "html-minigame";
const DEFAULT_SKILL_ID = "skill_6a40208961188198ad19d4df039c20a40e193ab2fc8911f2";
const OPENAI_SKILLS_BASE = "https://api.openai.com/v1/skills";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const setDefault = args.has("--default");
const writeZip = args.has("--zip");

function readEnvLocalValue(name) {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return null;
  const text = readFileSync(envPath, "utf8");
  const re = new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, "m");
  const match = text.match(re);
  if (!match) return null;
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value || null;
}

function mimeTypeFor(filePath) {
  switch (basename(filePath).toLowerCase()) {
    case "skill.md":
      return "text/markdown";
    case "template.html":
      return "text/html";
    default:
      if (filePath.endsWith(".md")) return "text/markdown";
      if (filePath.endsWith(".html")) return "text/html";
      if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/plain";
      if (filePath.endsWith(".json")) return "application/json";
      return "application/octet-stream";
  }
}

async function walkSkillFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".DS_Store" || entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkSkillFiles(fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    files.push({
      absolutePath: fullPath,
      relativePath: relative(SKILL_SOURCE_DIR, fullPath),
      uploadName: `${SKILL_FOLDER_NAME}/${relative(SKILL_SOURCE_DIR, fullPath)}`,
    });
  }

  return files.sort((a, b) => a.uploadName.localeCompare(b.uploadName));
}

function validateSkillBundle(files) {
  const manifest = files.find((file) => basename(file.absolutePath).toLowerCase() === "skill.md");
  if (!manifest) {
    throw new Error(`Missing SKILL.md in ${SKILL_SOURCE_DIR}`);
  }

  const manifestText = readFileSync(manifest.absolutePath, "utf8");
  if (!manifestText.startsWith("---")) {
    throw new Error("SKILL.md must start with YAML frontmatter (---).");
  }
  const frontmatterEnd = manifestText.indexOf("---", 3);
  if (frontmatterEnd === -1) {
    throw new Error("SKILL.md frontmatter is not closed with ---.");
  }
  const frontmatter = manifestText.slice(3, frontmatterEnd);
  if (!/^name:\s*.+$/m.test(frontmatter)) {
    throw new Error("SKILL.md frontmatter must include name.");
  }
  if (!/^description:\s*.+$/m.test(frontmatter)) {
    throw new Error("SKILL.md frontmatter must include description.");
  }
  if (!manifestText.includes("Output contract")) {
    throw new Error('SKILL.md is missing the "Output contract" section.');
  }
}

async function writeSkillZip(files) {
  const stagingDir = join(root, ".tmp-skill-upload");
  const stagedSkillDir = join(stagingDir, SKILL_FOLDER_NAME);
  const zipPath = join(dirname(SKILL_SOURCE_DIR), `${SKILL_FOLDER_NAME}.zip`);

  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagedSkillDir, { recursive: true });

  for (const file of files) {
    const target = join(stagedSkillDir, file.relativePath);
    await mkdir(dirname(target), { recursive: true });
    await cp(file.absolutePath, target);
  }

  const zipResult = spawnSync(
    "zip",
    ["-r", "-X", zipPath, SKILL_FOLDER_NAME],
    {
      cwd: stagingDir,
      stdio: "pipe",
      encoding: "utf8",
    },
  );

  if (zipResult.error?.code === "ENOENT") {
    throw new Error(
      "The `zip` CLI is not available. Re-run without --zip, or install zip and try again.",
    );
  }
  if (zipResult.status !== 0) {
    throw new Error(zipResult.stderr || zipResult.stdout || "zip command failed.");
  }

  const listing = spawnSync("unzip", ["-l", zipPath], {
    stdio: "pipe",
    encoding: "utf8",
  });
  if (listing.status === 0) {
    console.log(listing.stdout.trim());
  }

  await rm(stagingDir, { recursive: true, force: true });
  return zipPath;
}

async function buildFormData(files) {
  const form = new FormData();
  for (const file of files) {
    const content = await readFile(file.absolutePath);
    form.append(
      "files[]",
      new Blob([content], { type: mimeTypeFor(file.absolutePath) }),
      file.uploadName,
    );
  }
  if (setDefault) {
    form.append("default", "true");
  }
  return form;
}

async function uploadSkillVersion({ apiKey, skillId, form }) {
  const response = await fetch(`${OPENAI_SKILLS_BASE}/${skillId}/versions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.raw ||
      `OpenAI API returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function main() {
  const skillDirStat = await stat(SKILL_SOURCE_DIR).catch(() => null);
  if (!skillDirStat?.isDirectory()) {
    throw new Error(`Skill source directory not found: ${SKILL_SOURCE_DIR}`);
  }

  const files = await walkSkillFiles(SKILL_SOURCE_DIR);
  if (files.length === 0) {
    throw new Error(`No files found under ${SKILL_SOURCE_DIR}`);
  }

  validateSkillBundle(files);

  const skillId =
    process.env.OPENAI_HTML_MINIGAME_SKILL_ID ||
    readEnvLocalValue("OPENAI_HTML_MINIGAME_SKILL_ID") ||
    DEFAULT_SKILL_ID;

  console.log(`Skill source: ${SKILL_SOURCE_DIR}`);
  console.log(`Skill id:     ${skillId}`);
  console.log(`Files (${files.length}):`);
  for (const file of files) {
    const fileStat = await stat(file.absolutePath);
    console.log(`  - ${file.uploadName} (${fileStat.size} bytes)`);
  }

  if (writeZip) {
    const zipPath = await writeSkillZip(files);
    console.log(`\nWrote zip: ${zipPath}`);
  }

  if (dryRun) {
    console.log("\nDry run only. No upload performed.");
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || readEnvLocalValue("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Set it in the environment or .env.local before uploading.",
    );
  }

  console.log("\nUploading new skill version…");
  const form = await buildFormData(files);
  const result = await uploadSkillVersion({ apiKey, skillId, form });

  console.log("\nUpload complete:");
  console.log(JSON.stringify(result, null, 2));

  if (setDefault) {
    console.log("\nThis version was marked as default.");
  } else {
    console.log(
      "\nTip: pass --default if you want the new version to become the default pointer.",
    );
  }
}

main().catch((error) => {
  console.error(`\n[update-html-minigame-skill] ${error.message}`);
  process.exit(1);
});
