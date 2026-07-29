"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.env.SOURCE_DIR || ".");
const port = Number(process.env.PORT || 8887);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(request.url.split("?")[0]);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    response.writeHead(403);
    return response.end("Forbidden");
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Not Found");
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`元宝成长乐园运行在 http://0.0.0.0:${port}`);
});
