// After vite build, copy manifest, background, content scripts and icons to dist
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = resolve(root, "dist");

// Ensure dirs
mkdirSync(`${dist}/icons`, { recursive: true });

// Copy manifest
copyFileSync(`${root}/manifest.json`, `${dist}/manifest.json`);
console.log("✓ manifest.json");

// Copy background and content scripts
copyFileSync(`${root}/src/background.js`, `${dist}/background.js`);
copyFileSync(`${root}/src/content.js`,    `${dist}/content.js`);
console.log("✓ background.js + content.js");

// Copy icons (we generate SVG-based icons)
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const iconPath = `${root}/public/icons/icon${size}.png`;
  if (existsSync(iconPath)) {
    copyFileSync(iconPath, `${dist}/icons/icon${size}.png`);
    console.log(`✓ icon${size}.png`);
  } else {
    console.log(`⚠ icon${size}.png not found — add PNG icons to public/icons/`);
  }
});

console.log("\n✅ Extension built → dist/");
console.log("   Load in Chrome: chrome://extensions → Load unpacked → select dist/");