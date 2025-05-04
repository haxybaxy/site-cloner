const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { URL } = require('url');

const downloadResource = async (resourceUrl, savePath) => {
  try {
    const res = await axios.get(resourceUrl, { responseType: 'arraybuffer' });
    await fs.ensureDir(path.dirname(savePath));
    await fs.writeFile(savePath, res.data);
    console.log(`Downloaded: ${resourceUrl}`);
  } catch (err) {
    console.warn(`Failed to download ${resourceUrl}: ${err.message}`);
  }
};

(async () => {
  const url = 'https://www.blockchainrobotics.org/'; // change to your actual site
  const baseDomain = new URL(url).origin;
  const saveDir = path.resolve(__dirname, 'cloned-site');
  const assetsDir = path.join(saveDir, 'assets');

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle0' });

  // Extract HTML
  let html = await page.content();

  // Extract all asset URLs from the DOM
  const assetUrls = await page.evaluate(() => {
    const srcs = [...document.querySelectorAll('img, script, link[rel="stylesheet"]')].map(el => {
      return el.src || el.href;
    });
    return srcs.filter(Boolean);
  });

  // Download assets
  const localAssetsMap = {};
  for (const assetUrl of assetUrls) {
    try {
      const u = new URL(assetUrl, url);
      if (!u.href.startsWith('http')) continue; // skip data: and other schemas

      const assetPath = u.pathname.startsWith('/')
        ? u.pathname.slice(1)
        : u.pathname;

      const localPath = path.join(assetsDir, assetPath);
      await downloadResource(u.href, localPath);

      // Replace URLs in HTML
      localAssetsMap[u.href] = path.relative(saveDir, localPath).replace(/\\/g, '/');
    } catch (e) {
      console.warn(`Error processing asset URL: ${assetUrl}`, e.message);
    }
  }

  // Rewrite asset URLs in HTML
  for (const [original, local] of Object.entries(localAssetsMap)) {
    html = html.split(original).join(local);
  }

  // Save HTML
  await fs.ensureDir(saveDir);
  await fs.writeFile(path.join(saveDir, 'index.html'), html);

  await browser.close();
  console.log('✅ Cloning complete!');
})();
