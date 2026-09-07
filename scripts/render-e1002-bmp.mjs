import fs from "fs";
import http from "http";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const artifactsDir = path.join(repoRoot, "artifacts");

fs.mkdirSync(artifactsDir, { recursive: true });

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".bmp":
      return "image/bmp";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url, "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);

      if (pathname === "/") {
        pathname = "/index.html";
      }

      const requestedPath = path.normalize(path.join(rootDir, pathname));

      if (!requestedPath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      let filePath = requestedPath;

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": getContentType(filePath),
        "Cache-Control": "no-store"
      });

      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function renderPageToPng(browser, baseUrl, outputPath) {
  const page = await browser.newPage({
    viewport: {
      width: 800,
      height: 480
    },
    deviceScaleFactor: 1
  });

  const url = `${baseUrl}/index.html`;

  console.log(`Rendering ${url}`);
  console.log(`PNG output: ${outputPath}`);

  await page.goto(url, {
    waitUntil: "networkidle"
  });

  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });

  await page.waitForTimeout(500);

  const dimensions = await page.evaluate(() => ({
    htmlWidth: document.documentElement.scrollWidth,
    htmlHeight: document.documentElement.scrollHeight,
    bodyWidth: document.body.scrollWidth,
    bodyHeight: document.body.scrollHeight
  }));

  console.log("Rendered dimensions:", dimensions);

  if (
    dimensions.htmlWidth > 800 ||
    dimensions.htmlHeight > 480 ||
    dimensions.bodyWidth > 800 ||
    dimensions.bodyHeight > 480
  ) {
    throw new Error(
      `E1002 dashboard exceeds 800x480: ${JSON.stringify(dimensions)}`
    );
  }

  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false
  });

  await page.close();
}

function convertPngToBmp(inputPng, outputBmp) {
  const converter = path.join(__dirname, "png_to_bmp.py");

  const result = spawnSync(
    "python",
    [converter, inputPng, outputBmp],
    {
      stdio: "inherit"
    }
  );

  if (result.status !== 0) {
    throw new Error("PNG to BMP conversion failed.");
  }
}

async function main() {
  const { server, port } = await startStaticServer(repoRoot);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const browser = await chromium.launch({
      headless: true
    });

    try {
      const pngPath = path.join(
        artifactsDir,
        "arsenal-e1002.png"
      );

      const bmpPath = path.join(
        repoRoot,
        "arsenal.bmp"
      );

      await renderPageToPng(
        browser,
        baseUrl,
        pngPath
      );

      convertPngToBmp(
        pngPath,
        bmpPath
      );

      console.log("Generated E1002 production file:");
      console.log("- arsenal.bmp");
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
