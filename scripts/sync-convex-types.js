const path = require("path");
const fs = require("fs");

const src = path.resolve(__dirname, "../../Landingpage-HAG-Partner/convex/_generated");
const dest = path.resolve(__dirname, "../src/convex-generated");

if (!fs.existsSync(src)) {
  console.error("ERROR: HAG Partner convex/_generated not found.");
  console.error("Run `npx convex dev` in Landingpage-HAG-Partner first, then retry.");
  process.exit(1);
}

fs.cpSync(src, dest, { recursive: true });
console.log("✓ Convex types synced to src/convex-generated/");
console.log("  Remember to commit src/convex-generated/ if schema changed.");
