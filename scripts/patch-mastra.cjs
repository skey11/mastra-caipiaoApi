// Ensures .mastra/output/mastra.mjs has a safe import.meta fallback for Cloudflare Workers.
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', '.mastra', 'output', 'mastra.mjs');

if (!fs.existsSync(target)) {
  console.log('mastra.mjs not found, skipping patch');
  process.exit(0);
}

const code = fs.readFileSync(target, 'utf8');

// Only patch if the fallback isn't present.
if (code.includes('__metaUrl')) {
  console.log('mastra.mjs already patched');
  process.exit(0);
}

const patched = code.replace(
  /const __filename = cjsUrl\.fileURLToPath\(import\.meta\.url\);\s*const __dirname = cjsPath\.dirname\(__filename\);\s*const require = cjsModule\.createRequire\(import\.meta\.url\);/,
  [
    "const __metaUrl = (typeof import\\.meta !== 'undefined' && import.meta.url) ? import.meta.url : 'file:///mastra.mjs';",
    "const __filename = cjsUrl.fileURLToPath(__metaUrl);",
    "const __dirname = cjsPath.dirname(__filename);",
    "const require = cjsModule.createRequire(__metaUrl);",
  ].join('\\n'),
);

fs.writeFileSync(target, patched);
console.log('Patched mastra.mjs with import.meta fallback for Cloudflare');
