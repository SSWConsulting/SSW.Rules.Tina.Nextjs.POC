import fs from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { execSync } from "child_process";

const copyAndMoveJsonFile = (fileName, scriptsPath) => {
  const output = join(scriptsPath, fileName);
  const dest = resolve(__dirname, `../${fileName}`);

  if (!fs.existsSync(output)) {
    console.error(`Expected file not found: ${output}`);
    process.exit(1);
  }
  fs.copyFileSync(output, dest);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const relPath = process.env.LOCAL_CONTENT_RELATIVE_PATH;
if (!relPath) {
  console.error("Missing LOCAL_CONTENT_RELATIVE_PATH");
  process.exit(1);
}

const contentAbsPath = resolve(__dirname, relPath);
const scriptsPath = join(contentAbsPath, "scripts/tina-migration");
const buildMapScript = join(scriptsPath, "build-rule-category-map.py");
const orphanedCheckScript = join(scriptsPath, "orphaned_rules_check.py");
const buildRedirectMapScript = join(scriptsPath, "build-redirect-map.py");
const rulesDirAbs = join(contentAbsPath, "public/uploads/rules");

execSync(`python3 "${buildMapScript}"`, { stdio: "inherit", cwd: scriptsPath });
execSync(`python3 "${orphanedCheckScript}"`, { stdio: "inherit", cwd: scriptsPath });

// Only run redirect map script if it exists
if (fs.existsSync(buildRedirectMapScript)) {
  execSync(`python3 "${buildRedirectMapScript}"`, { stdio: "inherit", cwd: scriptsPath });
} else {
  console.warn(`Warning: ${buildRedirectMapScript} not found, skipping redirect map generation`);
}

copyAndMoveJsonFile("category-uri-title-map.json", scriptsPath);
copyAndMoveJsonFile("rule-to-categories.json", scriptsPath);
copyAndMoveJsonFile("orphaned_rules.json", scriptsPath);

// Only copy redirects.json if it exists
const redirectsPath = join(scriptsPath, "redirects.json");
if (fs.existsSync(redirectsPath)) {
  copyAndMoveJsonFile("redirects.json", scriptsPath);
} else {
  // Create an empty redirects.json if the script didn't run
  const emptyRedirectsDest = resolve(__dirname, "../redirects.json");
  fs.writeFileSync(emptyRedirectsDest, "[]");
  console.warn("Created empty redirects.json");
}
