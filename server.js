"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.env.SOURCE_DIR || ".");
const port = Number(process.env.PORT || 8887);
const dataFile = path.resolve(process.env.DATA_FILE || path.join(root, "data", "yuanbao.json"));
const MAX_BODY_SIZE = 1024 * 1024;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

let persistedState = loadState();
let saveQueue = Promise.resolve();

function emptyState() {
  return { profile: null, records: [] };
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return {
      profile: parsed.profile && typeof parsed.profile === "object" ? parsed.profile : null,
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
  } catch (error) {
    if (error.code !== "ENOENT") console.error(`读取数据文件失败：${error.message}`);
    return emptyState();
  }
}

function persistState() {
  const snapshot = JSON.stringify(persistedState, null, 2);
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    await fs.promises.mkdir(path.dirname(dataFile), { recursive: true });
    const temporaryFile = `${dataFile}.tmp`;
    await fs.promises.writeFile(temporaryFile, snapshot, "utf8");
    await fs.promises.rename(temporaryFile, dataFile);
  });
  return saveQueue;
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
        const error = new Error("请求内容过大");
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        const error = new Error("JSON 格式无效");
        error.statusCode = 400;
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

async function handleApi(request, response, requestPath) {
  if (requestPath === "/api/state" && request.method === "GET") {
    return sendJson(response, 200, persistedState);
  }

  if (requestPath === "/api/profile" && request.method === "PUT") {
    const profile = await readJson(request);
    if (profile.id !== "main" || typeof profile.name !== "string" || ![3, 4, 5, 6].includes(profile.age)) {
      return sendJson(response, 400, { error: "宝宝资料无效" });
    }
    persistedState.profile = profile;
    await persistState();
    return sendJson(response, 200, profile);
  }

  if (requestPath === "/api/progress" && request.method === "PUT") {
    const record = await readJson(request);
    if (typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      return sendJson(response, 400, { error: "学习记录无效" });
    }
    const index = persistedState.records.findIndex(item => item.date === record.date);
    if (index === -1) persistedState.records.push(record);
    else persistedState.records[index] = record;
    await persistState();
    return sendJson(response, 200, record);
  }

  if (requestPath === "/api/state" && request.method === "DELETE") {
    persistedState = emptyState();
    await persistState();
    return sendJson(response, 200, persistedState);
  }

  sendJson(response, 404, { error: "Not Found" });
}

const server = http.createServer(async (request, response) => {
  const requestPath = decodeURIComponent(request.url.split("?")[0]);

  if (requestPath.startsWith("/api/")) {
    try {
      return await handleApi(request, response, requestPath);
    } catch (error) {
      console.error(error);
      if (!response.headersSent) sendJson(response, error.statusCode || 500, { error: error.message || "服务器错误" });
      return;
    }
  }

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
