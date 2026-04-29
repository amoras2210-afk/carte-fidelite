import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const generatorFiles = ["index.html", "script.js", "style_1.css"];

// frontend-react/scripts -> repo root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const distFideliogenDir = path.resolve(process.cwd(), "dist", "fideliogen");

async function copyFile(src, dest) {
  const buf = await fs.readFile(src);
  await fs.writeFile(dest, buf);
}

async function main() {
  await fs.mkdir(distFideliogenDir, { recursive: true });

  await Promise.all(
    generatorFiles.map(async (file) => {
      const src = path.join(repoRoot, file);
      const dest = path.join(distFideliogenDir, file);
      await copyFile(src, dest);
      console.log(`[fideliogen] copied ${file}`);
    })
  );
}

main().catch((err) => {
  console.error("[fideliogen] copy failed:", err?.message || err);
  process.exit(1);
});

