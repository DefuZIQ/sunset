import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const svg = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");
const browser = await chromium.launch({
  channel: process.env.ICON_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : "chromium"),
});
const icoEntries = [];

try {
  for (const size of [32, 64, 192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    const png = await page.locator("svg").screenshot();
    if (size === 192 || size === 512) {
      await writeFile(new URL(`../public/logo${size}.png`, import.meta.url), png);
    }
    if (size === 32 || size === 64) {
      icoEntries.push({ size, png });
    }
    await page.close();
  }

  const header = Buffer.alloc(6 + icoEntries.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(icoEntries.length, 4);
  let offset = header.length;
  icoEntries.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  await writeFile(new URL("../public/favicon.ico", import.meta.url), Buffer.concat([header, ...icoEntries.map(({ png }) => png)]));
} finally {
  await browser.close();
}
