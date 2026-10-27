import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const host = "127.0.0.1";
const port = 4173;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const resolvePath = (requestUrl) => {
  const requestPath = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath;
  const absolutePath = path.normalize(path.join(rootDir, cleanPath));
  if (!absolutePath.startsWith(rootDir)) {
    return null;
  }
  if (existsSync(absolutePath) && statSync(absolutePath).isFile()) {
    return absolutePath;
  }
  return null;
};

createServer((req, res) => {
  const filePath = resolvePath(req.url ?? "/");
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": contentTypes[extension] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(res);
}).listen(port, host, () => {
  process.stdout.write(`Static server running at http://${host}:${port}\n`);
});
