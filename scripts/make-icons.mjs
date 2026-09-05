/** Renders src/app/icon.svg to the PNG sizes the manifest and iOS need. Run once after changing the icon. */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("src/app/icon.svg", "utf8");
const browser = await chromium.launch();
for (const [size, out] of [
  [180, "src/app/apple-icon.png"],
  [192, "public/icon-192.png"],
  [512, "public/icon-512.png"],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#e4702e">${svg.replace('width="64" height="64"', `width="${size}" height="${size}"`)}</body></html>`);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size }, omitBackground: false });
  writeFileSync(out, buf);
  await page.close();
  console.log("wrote", out);
}
await browser.close();
