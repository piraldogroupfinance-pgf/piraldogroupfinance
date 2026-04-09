const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const APP_USER = process.env.APP_USER || "";
const APP_PASS = process.env.APP_PASS || "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function unauthorized(res) {
  res.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="PGF Private Dashboard", charset="UTF-8"'
  });
  res.end("Authentication required.");
}

function isAuthorized(req) {
  if (!APP_USER || !APP_PASS) return false;
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const encoded = header.slice(6);
  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch (_) {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  return username === APP_USER && password === APP_PASS;
}

function safePathFromUrl(urlPath) {
  const normalized = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  return normalized === "/" ? "/index.html" : normalized;
}

const server = http.createServer((req, res) => {
  if (!isAuthorized(req)) {
    unauthorized(res);
    return;
  }

  const requestPath = safePathFromUrl(req.url.split("?")[0]);
  const filePath = path.join(__dirname, requestPath);

  fs.stat(filePath, (statErr, statResult) => {
    let finalPath = filePath;

    if (!statErr && statResult.isDirectory()) {
      finalPath = path.join(filePath, "index.html");
    }

    fs.readFile(finalPath, (readErr, content) => {
      if (readErr) {
        if (requestPath !== "/index.html") {
          fs.readFile(path.join(__dirname, "index.html"), (fallbackErr, fallbackContent) => {
            if (fallbackErr) {
              res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
              res.end("Not found.");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(fallbackContent);
          });
          return;
        }
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found.");
        return;
      }

      const ext = path.extname(finalPath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": mimeType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`PGF private dashboard listening on port ${PORT}`);
});
