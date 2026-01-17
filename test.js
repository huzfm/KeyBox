
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const ALLOWED_EXT = [".js", ".ts", ".jsx", ".tsx"];
const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", ".next", "out"];

function stripComments(code) {
      return code

            .replace(/\/\*[\s\S]*?\*\//g, "")

            .replace(/(^|\s)\/\/.*$/gm, "")

            .replace(/\n\s*\n/g, "\n\n");
}

function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                  if (!IGNORE_DIRS.includes(entry.name)) {
                        walk(fullPath);
                  }
            } else {
                  const ext = path.extname(entry.name);
                  if (ALLOWED_EXT.includes(ext)) {
                        const original = fs.readFileSync(fullPath, "utf8");
                        const cleaned = stripComments(original);

                        if (original !== cleaned) {
                              fs.writeFileSync(fullPath, cleaned, "utf8");
                              console.log("✔ cleaned:", path.relative(ROOT, fullPath));
                        }
                  }
            }
      }
}

console.log("🚀 Stripping comments...");
walk(ROOT);
console.log("✅ Done.");
