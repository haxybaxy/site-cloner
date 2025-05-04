// clone.js
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

(async () => {
  const url = 'https://www.blockchainrobotics.org/'; 
  const saveDir = path.resolve(__dirname, 'cloned-site');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle0' });

  // Save rendered HTML
  const html = await page.content();
  await fs.ensureDir(saveDir);
  await fs.writeFile(path.join(saveDir, 'index.html'), html);

  // Save screenshot for reference
  await page.screenshot({ path: path.join(saveDir, 'screenshot.png'), fullPage: true });

  console.log('Site cloned!');

  await browser.close();
})();
