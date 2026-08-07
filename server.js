"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const root = path.resolve(process.env.SOURCE_DIR || ".");
const port = Number(process.env.PORT || 8887);
const dataFile = path.resolve(process.env.DATA_FILE || path.join(root, "data", "yuanbao.json"));
const MAX_BODY_SIZE = 1024 * 1024;
const SESSION_MAX_AGE_MS = 7 * 24 * 3600 * 1000; // 7 天
const SESSION_RENEW_AFTER_MS = 3 * 24 * 3600 * 1000; // 3 天续签

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

// ---- 默认课表 ----
const DEFAULT_SCHEDULE = {
  0: [],                      // 周日 — 自由
  1: ["math", "english"],     // 周一
  2: ["physics", "math"],     // 周二
  3: ["english", "physics"],  // 周三
  4: ["math", "english"],     // 周四
  5: ["physics", "math"],     // 周五
  6: ["english"]              // 周六
};

// ---- 登录频率限制 ----
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 分钟
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const rateLimitStore = new Map();

function rateLimit(request) {
  const ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || request.socket?.remoteAddress
    || "unknown";
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, attempts: 0 };
    rateLimitStore.set(ip, entry);
  }
  entry.attempts++;
  if (entry.attempts > RATE_LIMIT_MAX_ATTEMPTS) {
    return Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
  }
  return 0;
}

function rateLimitReset(request) {
  const ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || request.socket?.remoteAddress
    || "unknown";
  rateLimitStore.delete(ip);
}

// 定期清理过期条目，防止内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}, 60000);

// ---- 密码工具 ----
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 310000, 64, "sha512").toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ---- 持久化 ----
let persistedState = loadState();
let saveQueue = Promise.resolve();

function emptyState() {
  return { accounts: {}, sessions: {} };
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return {
      accounts: (parsed.accounts && typeof parsed.accounts === "object") ? parsed.accounts : {},
      sessions: (parsed.sessions && typeof parsed.sessions === "object") ? parsed.sessions : {}
    };
  } catch (error) {
    if (error.code !== "ENOENT") console.error("读取数据文件失败：" + error.message);
    return emptyState();
  }
}

function persistState() {
  const snapshot = JSON.stringify(persistedState, null, 2);
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    await fs.promises.mkdir(path.dirname(dataFile), { recursive: true });
    const temporaryFile = dataFile + ".tmp";
    await fs.promises.writeFile(temporaryFile, snapshot, "utf8");
    await fs.promises.rename(temporaryFile, dataFile);
  });
  return saveQueue;
}

// ---- CSRF 防护 ----
function csrfCheck(request) {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.origin;
  const referer = request.headers.referer;
  if (!origin && !referer) return true; // 允许无来源的 API 调用（如 curl）
  const host = request.headers.host || "";
  const check = (url) => {
    try { return new URL(url).host === host; } catch { return false; }
  };
  return (origin && check(origin)) || (referer && check(referer));
}

// ---- 会话管理 ----
function getAccountId(request, response) {
  const cookie = request.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)yuanbao_session=([^;]*)/);
  if (!match) return null;
  const token = match[1];
  const session = persistedState.sessions[token];
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_MAX_AGE_MS) {
    delete persistedState.sessions[token];
    return null;
  }
  // 滑动过期：超过 3 天自动续签
  if (response && Date.now() - session.createdAt > SESSION_RENEW_AFTER_MS) {
    session.createdAt = Date.now();
    response.setHeader("Set-Cookie", `yuanbao_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_MS / 1000}`);
  }
  return session.accountId;
}

function createSession(response, accountId) {
  const token = generateToken();
  persistedState.sessions[token] = { accountId, createdAt: Date.now() };
  response.setHeader("Set-Cookie", `yuanbao_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_MS / 1000}`);
  return token;
}

function destroySession(request, response) {
  const cookie = request.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)yuanbao_session=([^;]*)/);
  if (match) delete persistedState.sessions[match[1]];
  response.setHeader("Set-Cookie", "yuanbao_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

// ---- 辅助函数 ----
function localDate(date) {
  if (!date) date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

// ---- 错误页面 ----
function sendErrorPage(response, status, title, message) {
  const html = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — 元宝成长乐园</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: #fff9f3; color: #403b46; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; text-align: center; }
  .emoji { font-size: 72px; margin-bottom: 16px; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  p { color: #807987; margin-bottom: 24px; line-height: 1.6; }
  a { display: inline-flex; align-items: center; gap: 6px; padding: 12px 24px; border-radius: 17px; background: #55b98b; color: white; font-weight: 800; text-decoration: none; box-shadow: 0 5px 0 #2a8064; }
  a:hover { transform: translateY(-2px); }
</style></head>
<body>
  <div class="emoji">${status === 404 ? "🔍" : "🛡️"}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="/">🏡 回到首页</a>
</body></html>`;
  response.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(html);
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

// ---- 故事场景数据 ----
const STORY_SCENES = [
  { id: "park", title: "公园玩耍", setting: "🌳🌞🌷 一个阳光明媚的早晨，小公园里开满了鲜花，小鸟在树上唱歌。", characters: ["👧 小女孩", "🐕 小狗", "🦆 小鸭子"], objects: ["🪁 风筝", "⚽ 皮球", "🍞 面包"], actions: ["小女孩在草地上追着皮球跑", "小狗在旁边摇着尾巴跳来跳去", "小鸭子在水池里游来游去"] },
  { id: "zoo", title: "动物园", setting: "🐘🦒🐒 动物园里好热闹，好多小朋友来看动物。", characters: ["👦 小男孩", "🦒 长颈鹿", "🐒 猴子"], objects: ["🍌 香蕉", "📷 相机", "🎈 气球"], actions: ["长颈鹿伸着长长的脖子吃树叶", "猴子在树上跳来跳去", "小男孩举着相机拍照"] },
  { id: "kitchen", title: "厨房小帮手", setting: "🍳🥘🧑‍🍳 厨房里飘着香喷喷的味道，妈妈正在准备晚餐。", characters: ["👩 妈妈", "👧 小女孩", "🐱 小花猫"], objects: ["🥕 胡萝卜", "🍅 西红柿", "🥄 勺子"], actions: ["妈妈在切菜", "小女孩帮忙摆碗筷", "小花猫蹲在门口喵喵叫"] },
  { id: "rainy", title: "下雨天", setting: "🌧️☁️💧 窗外下起了大雨，雨点噼里啪啦地敲着窗户。", characters: ["👦 小男孩", "🐸 小青蛙", "🐌 小蜗牛"], objects: ["☂️ 雨伞", "👢 雨靴", "🌊 水坑"], actions: ["小男孩穿上雨靴去踩水坑", "小青蛙在荷叶上呱呱叫", "小蜗牛慢慢地爬过小路"] },
  { id: "farm", title: "农场的一天", setting: "🌾🐄🐓 农场里空气清新，小动物们都在忙碌着。", characters: ["👨‍🌾 农夫", "🐄 奶牛", "🐑 小羊"], objects: ["🌽 玉米", "🪣 水桶", "🚜 拖拉机"], actions: ["农夫在给奶牛挤奶", "小羊在草地上吃草", "拖拉机在田里突突地开"] },
  { id: "beach", title: "海边玩耍", setting: "🏖️🌊☀️ 蓝蓝的大海，金色的沙滩，真美啊！", characters: ["👧 小女孩", "🐚 小螃蟹", "🐦 海鸥"], objects: ["🏐 沙滩球", "🪣 小桶", "⛱️ 遮阳伞"], actions: ["小女孩在沙滩上堆城堡", "小螃蟹在沙子里钻来钻去", "海鸥在天上飞过"] },
  { id: "supermarket", title: "逛超市", setting: "🛒🏪🍎 超市里好多人，货架上摆满了各种各样的东西。", characters: ["👩 妈妈", "👦 小男孩", "🧑 收银员"], objects: ["🛒 购物车", "🍎 苹果", "🧸 玩具熊"], actions: ["妈妈在挑选水果", "小男孩想买一个玩具熊", "收银员在扫码结账"] },
  { id: "birthday", title: "生日派对", setting: "🎂🎉🎈 今天是小朋友的生日，家里布置得好漂亮！", characters: ["🧒 小寿星", "👧 好朋友", "🤡 小丑"], objects: ["🎂 蛋糕", "🎁 礼物", "🎈 气球"], actions: ["小寿星吹灭了蜡烛", "好朋友送来了礼物", "小丑在表演魔术"] },
  { id: "forest", title: "森林散步", setting: "🌲🌿🍄 森林里静悄悄的，阳光透过树叶洒下来。", characters: ["👦 小男孩", "🦊 小狐狸", "🦌 小鹿"], objects: ["🍓 草莓", "🌰 松果", "🧺 篮子"], actions: ["小男孩在采蘑菇", "小狐狸从树后探出脑袋", "小鹿在溪边喝水"] },
  { id: "garden", title: "花园里", setting: "🌺🌻🦋 花园里开满了五颜六色的花，好香啊！", characters: ["👧 小女孩", "🐝 小蜜蜂", "🦋 蝴蝶"], objects: ["🌻 向日葵", "💧 洒水壶", "🧤 手套"], actions: ["小女孩在给花浇水", "小蜜蜂在花丛中采蜜", "蝴蝶在花朵上跳舞"] },
  { id: "space", title: "太空探险", setting: "🌍🚀⭐ 无边的太空中，星星在闪闪发光。", characters: ["🧑‍🚀 宇航员", "🤖 机器人", "👽 外星人"], objects: ["🚀 火箭", "🛸 飞碟", "🔭 望远镜"], actions: ["宇航员在太空漫步", "机器人在修理飞船", "外星人从飞碟里探出头打招呼"] },
  { id: "ocean", title: "海底世界", setting: "🌊🐠🪸 海底世界真奇妙，五颜六色的鱼游来游去。", characters: ["🤿 潜水员", "🐙 小章鱼", "🐢 海龟"], objects: ["🐚 海螺", "💎 宝石", "🪸 珊瑚"], actions: ["潜水员在探索海底", "小章鱼的触手在舞动", "海龟慢悠悠地游过"] },
  { id: "playground", title: "游乐场", setting: "🎡🎠🎢 游乐场里好热闹，到处是小朋友的欢笑声。", characters: ["👦 小男孩", "👧 小女孩", "🧒 小朋友"], objects: ["🎡 摩天轮", "🎠 旋转木马", "🍭 棒棒糖"], actions: ["小男孩在坐旋转木马", "小女孩在玩滑梯", "小朋友们排队买棉花糖"] },
  { id: "school", title: "幼儿园", setting: "🏫🎒📚 幼儿园里，小朋友们正在上课。", characters: ["👩‍🏫 老师", "👦 小朋友", "👧 小朋友"], objects: ["📖 故事书", "🖍️ 蜡笔", "🧩 拼图"], actions: ["老师在讲故事", "小朋友们在画画", "两个小朋友一起拼拼图"] },
  { id: "hospital", title: "看医生", setting: "🏥🩺💊 医院里，熊医生正在给小动物们看病。", characters: ["🧑‍⚕️ 熊医生", "🐻 小熊", "🐰 小兔子"], objects: ["🩺 听诊器", "💉 针筒", "🍬 糖果"], actions: ["熊医生给小熊量体温", "小兔子在排队等候", "小熊勇敢地伸出手打针"] },
  { id: "grandma", title: "外婆家", setting: "🏠🌳🍵 外婆家的小院子里，大树下放着摇椅。", characters: ["👵 外婆", "👦 小男孩", "🐶 小狗"], objects: ["🍪 饼干", "📚 故事书", "🪑 摇椅"], actions: ["外婆在摇椅上织毛衣", "小男孩在吃饼干", "小狗趴在脚边睡觉"] },
  { id: "restaurant", title: "餐厅吃饭", setting: "🍜🥢🏮 餐厅里飘着饭菜的香味，灯笼红彤彤的。", characters: ["👨‍🍳 厨师", "👧 小女孩", "👨 爸爸"], objects: ["🍜 面条", "🥟 饺子", "🥢 筷子"], actions: ["厨师在厨房里炒菜", "小女孩用筷子夹饺子", "爸爸在倒茶"] },
  { id: "snow", title: "下雪天", setting: "❄️⛄🌨️ 窗外飘起了雪花，整个世界都变白了。", characters: ["👦 小男孩", "☃️ 雪人", "🐧 小企鹅"], objects: ["⛷️ 雪橇", "🧣 围巾", "🥕 胡萝卜"], actions: ["小男孩在堆雪人", "雪人戴着围巾微笑", "小企鹅在雪地上滑冰"] },
  { id: "sports", title: "动物运动会", setting: "🏟️🏅🎉 森林里正在开运动会，小动物们都来参加。", characters: ["🐰 小兔子", "🐢 小乌龟", "🦘 袋鼠"], objects: ["🏅 金牌", "🏁 终点线", "🥇 奖杯"], actions: ["小兔子飞快地跑着", "小乌龟慢慢地但坚持着", "袋鼠跳得最高"] },
  { id: "dinosaur", title: "恐龙世界", setting: "🌋🌿🦕 回到恐龙时代，巨大的恐龙在丛林里漫步。", characters: ["🦕 梁龙", "🦖 霸王龙", "🐣 小恐龙"], objects: ["🌴 大树", "🪨 大石头", "🥚 恐龙蛋"], actions: ["梁龙伸着长脖子吃树叶", "霸王龙在远处咆哮", "小恐龙从蛋里钻出来"] },
  { id: "castle", title: "童话城堡", setting: "🏰👑✨ 美丽的城堡里，公主和王子正在跳舞。", characters: ["👸 公主", "🤴 王子", "🐉 小龙"], objects: ["👑 王冠", "💎 宝石", "🪄 魔法棒"], actions: ["公主在花园里散步", "王子骑着白马赶来", "小龙在城堡上空飞翔"] },
  { id: "traffic", title: "交通工具", setting: "🚗🚌🚂 马路上来来往往的车辆，真热闹。", characters: ["👮 交警", "🚌 公交车司机", "🚗 小汽车司机"], objects: ["🚦 红绿灯", "🚧 路标", "🚒 消防车"], actions: ["交警在指挥交通", "公交车载着乘客行驶", "消防车鸣着笛开过去"] },
  { id: "camping", title: "去露营", setting: "🏕️🔥🌌 夜晚的星空下，帐篷搭在小河边。", characters: ["👨 爸爸", "👦 小男孩", "🦝 小浣熊"], objects: ["🏕️ 帐篷", "🔥 篝火", "⭐ 星星"], actions: ["爸爸在搭帐篷", "小男孩在数星星", "小浣熊偷偷靠近食物"] },
  { id: "circus", title: "马戏团", setting: "🎪🤹🎭 大大的马戏团帐篷里，观众们都在鼓掌。", characters: ["🤹 小丑", "🐘 大象", "🦁 狮子"], objects: ["🎪 帐篷", "🔥 火圈", "⚽ 彩球"], actions: ["小丑在抛彩球", "大象用鼻子卷起木头", "狮子跳过火圈"] },
  { id: "spring", title: "春天来了", setting: "🌸🌱🐦 春天来了，花儿开了，小草绿了。", characters: ["👧 小女孩", "🐰 小兔子", "🐦 小鸟"], objects: ["🌸 花朵", "🪴 花盆", "💧 水壶"], actions: ["小女孩在种花", "小兔子在草地上打滚", "小鸟在树上筑巢"] }
];

// 确定性选择故事场景
function getStoryScene(dateKey, age) {
  const dayNum = dateKey.split("-").reduce((a, b) => a + parseInt(b, 10), 0);
  const index = (dayNum + age * 7) % STORY_SCENES.length;
  const scene = { ...STORY_SCENES[index] };
  scene.prompt = age <= 4
    ? "看一看这幅图，告诉妈妈/爸爸你看到了什么？"
    : "仔细观察这幅图，用完整的句子描述一下发生了什么事？";
  scene.challenge = age >= 5
    ? "你觉得接下来会发生什么？给这个故事编一个结尾吧！"
    : "";
  return scene;
}

// ---- 导出 HTML ----
function generateExportHtml(account) {
  const profile = account.profile || {};
  const records = account.records || [];
  const completed = records.filter(r => r.completed).sort((a, b) => b.date.localeCompare(a.date));
  const totalStars = completed.reduce((sum, r) => sum + (r.stars || 0), 0);
  const mathRecords = completed.filter(r => r.subject === "math");
  const physicsRecords = completed.filter(r => r.subject === "physics");
  const englishRecords = completed.filter(r => r.subject === "english");

  const accuracy = (list) => {
    const answers = list.flatMap(r => r.answers || []);
    return answers.length ? Math.round(answers.filter(a => a.correct).length / answers.length * 100) : 0;
  };

  function streakDays() {
    const dates = new Set(completed.map(r => r.date));
    let cursor = new Date();
    const local = localDate();
    if (!dates.has(local)) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (dates.has(localDate(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  const subjectLabel = { math: "🔢 数学", physics: "⚡ 物理", english: "🔤 英语" };
  const rows = completed.slice(0, 50).map(r => {
    const label = subjectLabel[r.subject] || r.subject;
    return `<tr><td>${r.date}</td><td>${label}</td><td>${r.correct || 0}/${r.total || 0}</td><td>${"⭐".repeat(r.stars || 0)}</td></tr>`;
  }).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${profile.name || "宝宝"}的学习报告 — 元宝成长乐园</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: #fff9f3; color: #403b46; padding: 24px; max-width: 800px; margin: auto; }
  header { text-align: center; padding: 32px 0; border-bottom: 3px solid #f0e8d8; margin-bottom: 28px; }
  header h1 { font-size: 32px; margin-bottom: 6px; }
  header p { color: #807987; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 28px; }
  .card { text-align: center; padding: 20px 12px; border-radius: 18px; border: 2px solid #f0e8d8; background: white; }
  .card b { display: block; font-size: 26px; margin: 6px 0 2px; }
  .card span { color: #807987; font-size: 13px; }
  h2 { font-size: 20px; margin: 24px 0 12px; }
  .bar { margin-bottom: 18px; }
  .bar header { display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; padding: 0; border: 0; margin-bottom: 6px; text-align: left; }
  .bar-track { height: 12px; border-radius: 99px; background: #edf0ec; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: inherit; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 8px; border-bottom: 1px solid #f0e8d8; text-align: left; }
  th { font-size: 13px; color: #807987; }
  footer { text-align: center; margin-top: 36px; padding: 20px 0; color: #bbb; font-size: 12px; }
  @media print { body { background: white; } }
</style>
</head>
<body>
<header>
  <h1>🌱 ${profile.name || "宝宝"}的学习报告</h1>
  <p>${profile.age || "?"} 岁 · 导出时间 ${new Date().toLocaleString("zh-CN")}</p>
</header>
<section class="grid">
  <div class="card"><span>📚 完成课程</span><b>${completed.length}</b></div>
  <div class="card"><span>⭐ 收集星星</span><b>${totalStars}</b></div>
  <div class="card"><span>🔥 连续天数</span><b>${streakDays()}</b></div>
</section>
<h2>📊 学科能力</h2>
<div class="bar"><header><span>🔢 数学</span><span>${accuracy(mathRecords)}%</span></header><div class="bar-track"><div class="bar-fill" style="width:${accuracy(mathRecords)}%;background:#ff8d72"></div></div></div>
<div class="bar"><header><span>⚡ 物理</span><span>${accuracy(physicsRecords)}%</span></header><div class="bar-track"><div class="bar-fill" style="width:${accuracy(physicsRecords)}%;background:#a58ae5"></div></div></div>
<div class="bar"><header><span>🔤 英语</span><span>${accuracy(englishRecords)}%</span></header><div class="bar-track"><div class="bar-fill" style="width:${accuracy(englishRecords)}%;background:#75a7ed"></div></div></div>
<h2>📝 课程记录</h2>
<table>
<thead><tr><th>日期</th><th>学科</th><th>成绩</th><th>星星</th></tr></thead>
<tbody>${rows || "<tr><td colspan='4'>暂无记录</td></tr>"}</tbody>
</table>
<footer>元宝成长乐园 · 每天进步一点点 🌱</footer>
</body>
</html>`;
}

// ---- 生成可打印练习册 ----
function generateWorksheetsHtml(account) {
  const profile = account.profile || {};
  const age = profile.age || 4;
  const maxNum = age === 3 ? 5 : age === 4 ? 8 : age === 5 ? 12 : 20;

  // 生成数学计算题
  const mathProblems = Array.from({ length: 10 }, (_, i) => {
    const a = 1 + (i * 3 + 1) % Math.min(5, maxNum);
    const b = 1 + (i * 2 + 3) % Math.min(4, maxNum);
    const op = i % 2 === 0 ? "+" : "-";
    const answer = op === "+" ? a + b : Math.max(0, a - b);
    return { a, b, op, answer, text: `${a} ${op} ${b} = ____` };
  });

  // 生成英语单词描红
  const words = [
    { en: "apple", cn: "苹果", emoji: "🍎" },
    { en: "cat", cn: "小猫", emoji: "🐱" },
    { en: "dog", cn: "小狗", emoji: "🐶" },
    { en: "sun", cn: "太阳", emoji: "☀️" },
    { en: "red", cn: "红色", emoji: "🔴" },
    { en: "car", cn: "汽车", emoji: "🚗" },
    { en: "fish", cn: "小鱼", emoji: "🐟" },
    { en: "star", cn: "星星", emoji: "⭐" }
  ];

  // 物理分类题
  const physicsCategories = [
    { question: "圈出会浮在水面上的东西", items: ["🪵 木块 ✓", "🪨 石头", "🍎 苹果 ✓", "🔑 钥匙", "🎈 气球 ✓", "🪙 硬币"] },
    { question: "圈出磁铁能吸住的东西", items: ["🔩 铁钉 ✓", "🪵 木块", "📎 回形针 ✓", "🧴 塑料瓶", "🔑 铁钥匙 ✓", "📄 白纸"] },
    { question: "圈出速度快的东西", items: ["🐆 猎豹 ✓", "🐢 乌龟", "🚀 火箭 ✓", "🐌 蜗牛", "✈️ 飞机 ✓", "🐛 毛毛虫"] }
  ];

  const problemRows = mathProblems.map(p =>
    `<tr><td style="padding:14px 8px;border-bottom:1px solid #e8e0d4;font-size:22px;font-weight:800;text-align:center">${p.text}</td></tr>`
  ).join("");

  const wordRows = words.map(w =>
    `<tr><td style="padding:10px 0;border-bottom:1px dashed #e8e0d4"><span style="font-size:28px">${w.emoji}</span> <span style="font-size:20px;font-weight:800">${w.en}</span> <span style="color:#807987">${w.cn}</span><div style="margin-top:6px;font-size:28px;letter-spacing:6px;color:#d5d0d0;font-family:monospace">${w.en.replace(/./g, "_ ")}</div></td></tr>`
  ).join("");

  const physicsHtml = physicsCategories.map(cat =>
    `<div style="margin-bottom:24px"><h3 style="margin:0 0 10px;font-size:18px">${cat.question}</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${cat.items.map(item => `<div style="padding:16px;border:2px solid #e8e0d4;border-radius:16px;text-align:center;font-size:18px;font-weight:800">${item}</div>`).join("")}</div></div>`
  ).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${profile.name || "宝宝"}的练习册 — 元宝成长乐园</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: #fff9f3; color: #403b46; padding: 24px; max-width: 800px; margin: auto; }
  header { text-align: center; padding: 24px 0; border-bottom: 3px solid #f0e8d8; margin-bottom: 28px; }
  header h1 { font-size: 28px; margin-bottom: 4px; }
  header p { color: #807987; font-size: 14px; }
  h2 { font-size: 22px; margin: 28px 0 14px; padding-bottom: 6px; border-bottom: 2px solid #f0e8d8; }
  table { width: 100%; border-collapse: collapse; }
  .page-break { page-break-after: always; border-bottom: 2px dashed #e0d8d0; margin: 32px 0; padding-bottom: 16px; text-align: center; color: #bbb; font-size: 12px; }
  @media print { body { background: white; } .page-break { border: 0; } }
</style>
</head>
<body>
<header>
  <h1>🌱 ${profile.name || "宝宝"}的练习册</h1>
  <p>${age} 岁 · ${new Date().toLocaleDateString("zh-CN")}</p>
</header>

<h2>🔢 数学计算</h2>
<p style="color:#807987;margin-bottom:16px">数一数，算一算，把答案填在横线上</p>
<table>${problemRows}</table>

<div class="page-break">—— 下一页 ——</div>

<h2>🔤 英语描红</h2>
<p style="color:#807987;margin-bottom:16px">读一读，跟着描一描</p>
<table>${wordRows}</table>

<div class="page-break">—— 下一页 ——</div>

<h2>⚡ 物理分类</h2>
<p style="color:#807987;margin-bottom:16px">读题后，圈出正确的答案</p>
${physicsHtml}

<footer style="text-align:center;margin-top:36px;padding:20px 0;color:#bbb;font-size:12px">元宝成长乐园 · 每天进步一点点 🌱</footer>
</body>
</html>`;
}

// ---- API 路由 ----
async function handleApi(request, response, requestPath) {
  // ---- CSRF 防护 ----
  if (!csrfCheck(request)) {
    return sendJson(response, 403, { error: "请求来源不被允许" });
  }

  // ---- 认证 ----
  if (requestPath === "/api/auth/register" && request.method === "POST") {
    const retryAfter = rateLimit(request);
    if (retryAfter > 0) {
      response.setHeader("Retry-After", String(retryAfter));
      return sendJson(response, 429, { error: "操作过于频繁，请 " + retryAfter + " 秒后再试" });
    }
    const { username, password, childName, childAge } = await readJson(request);
    if (!username || typeof username !== "string" || username.trim().length < 2) {
      return sendJson(response, 400, { error: "用户名至少 2 个字符" });
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      return sendJson(response, 400, { error: "密码至少 4 个字符" });
    }
    if (!childName || typeof childName !== "string" || !childName.trim()) {
      return sendJson(response, 400, { error: "请输入宝宝的小名" });
    }
    if (![3, 4, 5, 6].includes(childAge)) {
      return sendJson(response, 400, { error: "宝宝年龄必须在 3–6 岁之间" });
    }
    // 检查用户名是否已存在
    const exists = Object.values(persistedState.accounts).some(a => a.username === username.trim());
    if (exists) {
      return sendJson(response, 409, { error: "该用户名已被注册" });
    }
    const accountId = generateToken();
    const salt = generateSalt();
    const now = new Date();
    const today = localDate(now);
    persistedState.accounts[accountId] = {
      username: username.trim(),
      passwordHash: hashPassword(password, salt),
      passwordSalt: salt,
      createdAt: now.toISOString(),
      profile: {
        name: childName.trim().slice(0, 8),
        age: childAge,
        startedAt: today,
        avatar: "🐣"
      },
      records: [],
      schedule: { ...DEFAULT_SCHEDULE },
      storyTasks: []
    };
    rateLimitReset(request);
    createSession(response, accountId);
    await persistState();
    return sendJson(response, 201, { accountId, profile: persistedState.accounts[accountId].profile });
  }

  if (requestPath === "/api/auth/login" && request.method === "POST") {
    const retryAfter = rateLimit(request);
    if (retryAfter > 0) {
      response.setHeader("Retry-After", String(retryAfter));
      return sendJson(response, 429, { error: "操作过于频繁，请 " + retryAfter + " 秒后再试" });
    }
    const { username, password } = await readJson(request);
    if (!username || !password) {
      return sendJson(response, 400, { error: "请输入用户名和密码" });
    }
    const entry = Object.entries(persistedState.accounts).find(([, a]) => a.username === username.trim());
    if (!entry) {
      return sendJson(response, 401, { error: "用户名或密码错误" });
    }
    const [accountId, account] = entry;
    const hash = hashPassword(password, account.passwordSalt);
    if (hash !== account.passwordHash) {
      return sendJson(response, 401, { error: "用户名或密码错误" });
    }
    rateLimitReset(request);
    createSession(response, accountId);
    return sendJson(response, 200, { accountId, profile: account.profile });
  }

  if (requestPath === "/api/auth/logout" && request.method === "POST") {
    destroySession(request, response);
    return sendJson(response, 200, { ok: true });
  }

  // ---- 会话校验（后续 API 均需登录） ----
  const accountId = getAccountId(request, response);
  if (!accountId || !persistedState.accounts[accountId]) {
    return sendJson(response, 401, { error: "请先登录" });
  }
  const account = persistedState.accounts[accountId];

  // ---- 用户状态 ----
  if (requestPath === "/api/state" && request.method === "GET") {
    return sendJson(response, 200, {
      profile: account.profile,
      records: account.records || [],
      schedule: account.schedule || DEFAULT_SCHEDULE,
      emotionCheckins: account.emotionCheckins || [],
      emotionGames: account.emotionGames || [],
      strategyRecords: account.strategyRecords || [],
      communicationLogs: account.communicationLogs || [],
      storyTasks: account.storyTasks || []
    });
  }

  // ---- 更新宝宝资料 ----
  if (requestPath === "/api/profile" && request.method === "PUT") {
    const profile = await readJson(request);
    if (typeof profile.name !== "string" || !profile.name.trim()) {
      return sendJson(response, 400, { error: "宝宝小名无效" });
    }
    if (![3, 4, 5, 6].includes(profile.age)) {
      return sendJson(response, 400, { error: "宝宝年龄无效" });
    }
    account.profile = {
      ...account.profile,
      name: profile.name.trim().slice(0, 8),
      age: profile.age,
      avatar: profile.avatar || account.profile.avatar || "🐣"
    };
    await persistState();
    return sendJson(response, 200, account.profile);
  }

  // ---- 保存学习进度 ----
  if (requestPath === "/api/progress" && request.method === "PUT") {
    const record = await readJson(request);
    if (typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
      return sendJson(response, 400, { error: "学习记录日期无效" });
    }
    if (!["math", "physics", "english"].includes(record.subject)) {
      return sendJson(response, 400, { error: "学科类型无效" });
    }
    if (!account.records) account.records = [];
    // 同一日期 + 同一学科 = 同一记录
    const index = account.records.findIndex(r => r.date === record.date && r.subject === record.subject);
    if (index === -1) account.records.push(record);
    else account.records[index] = record;
    await persistState();
    return sendJson(response, 200, record);
  }

  // ---- 重置数据 ----
  if (requestPath === "/api/state" && request.method === "DELETE") {
    account.records = [];
    account.profile.startedAt = new Date().toISOString().slice(0, 10);
    await persistState();
    return sendJson(response, 200, { profile: account.profile, records: [] });
  }

  // ---- 课表操作 ----
  if (requestPath === "/api/schedule" && request.method === "GET") {
    return sendJson(response, 200, account.schedule || DEFAULT_SCHEDULE);
  }

  if (requestPath === "/api/schedule" && request.method === "PUT") {
    const schedule = await readJson(request);
    if (typeof schedule !== "object" || schedule === null) {
      return sendJson(response, 400, { error: "课表格式无效" });
    }
    const validSubjects = ["math", "physics", "english"];
    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
      const subjects = schedule[String(day)] || schedule[day];
      if (subjects && !Array.isArray(subjects)) {
        return sendJson(response, 400, { error: `第 ${day} 天的课表格式无效` });
      }
      if (subjects && subjects.some(s => !validSubjects.includes(s))) {
        return sendJson(response, 400, { error: `第 ${day} 天包含无效学科` });
      }
    }
    account.schedule = {};
    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
      const subjects = schedule[String(day)] || schedule[day] || [];
      account.schedule[String(day)] = [...new Set(subjects)]; // 去重
    }
    await persistState();
    return sendJson(response, 200, account.schedule);
  }

  // ---- 导出 HTML ----
  if (requestPath === "/api/export/html" && request.method === "GET") {
    const html = generateExportHtml(account);
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"yuanbao-report.html\"",
      "Cache-Control": "no-store"
    });
    return response.end(html);
  }

  // ---- 导出可打印练习册 ----
  if (requestPath === "/api/export/worksheets" && request.method === "GET") {
    const html = generateWorksheetsHtml(account);
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"yuanbao-worksheets.html\"",
      "Cache-Control": "no-store"
    });
    return response.end(html);
  }

  // ---- 情绪分区自评 ----
  if (requestPath === "/api/emotion/checkin" && request.method === "POST") {
    const { zone } = await readJson(request);
    if (!["blue", "green", "yellow", "red"].includes(zone)) {
      return sendJson(response, 400, { error: "情绪分区无效" });
    }
    if (!account.emotionCheckins) account.emotionCheckins = [];
    const todayKey = localDate();
    // 同一天只保留最新的自评
    const existing = account.emotionCheckins.findIndex(c => c.date === todayKey);
    const checkin = { date: todayKey, zone, createdAt: new Date().toISOString() };
    if (existing === -1) account.emotionCheckins.push(checkin);
    else account.emotionCheckins[existing] = checkin;
    await persistState();
    return sendJson(response, 200, checkin);
  }

  // ---- 情绪调节策略记录 ----
  if (requestPath === "/api/emotion/strategy" && request.method === "POST") {
    const { zone, strategy } = await readJson(request);
    if (!["blue", "green", "yellow", "red"].includes(zone)) {
      return sendJson(response, 400, { error: "情绪分区无效" });
    }
    if (!strategy || typeof strategy !== "string") {
      return sendJson(response, 400, { error: "策略标识无效" });
    }
    if (!account.strategyRecords) account.strategyRecords = [];
    const todayKey = localDate();
    const record = {
      date: todayKey,
      zone,
      strategy,
      usedAt: new Date().toISOString()
    };
    account.strategyRecords.push(record);
    await persistState();
    return sendJson(response, 200, record);
  }

  // ---- 情绪调节策略统计 ----
  if (requestPath === "/api/emotion/strategy/stats" && request.method === "GET") {
    const records = account.strategyRecords || [];
    const byZone = {};
    const byStrategy = {};
    for (const r of records) {
      byZone[r.zone] = (byZone[r.zone] || 0) + 1;
      byStrategy[r.strategy] = (byStrategy[r.strategy] || 0) + 1;
    }
    return sendJson(response, 200, {
      total: records.length,
      byZone,
      byStrategy,
      recent: records.slice(-20).reverse()
    });
  }

  // ---- 情绪识别游戏 ----
  if (requestPath === "/api/emotion/game" && request.method === "POST") {
    const { answers, score, total } = await readJson(request);
    if (!Array.isArray(answers) || typeof score !== "number" || typeof total !== "number") {
      return sendJson(response, 400, { error: "游戏数据格式无效" });
    }
    if (!account.emotionGames) account.emotionGames = [];
    const todayKey = localDate();
    const game = {
      date: todayKey,
      answers,
      score,
      total,
      createdAt: new Date().toISOString()
    };
    account.emotionGames.push(game);
    await persistState();
    return sendJson(response, 200, game);
  }

  // ---- 沟通日志 ----
  if (requestPath === "/api/communication/log" && request.method === "POST") {
    const { vocabulary, sentences, conversationTurns, narrativeScore, initiativeScore } = await readJson(request);
    if (typeof vocabulary !== "number" || vocabulary < 0 || vocabulary > 200) {
      return sendJson(response, 400, { error: "词汇量数据无效" });
    }
    if (!Array.isArray(sentences) || sentences.length !== 3 || sentences.some(s => typeof s !== "string" || s.trim().length < 1)) {
      return sendJson(response, 400, { error: "请提供 3 句语言样本" });
    }
    if (typeof conversationTurns !== "number" || conversationTurns < 0 || conversationTurns > 50) {
      return sendJson(response, 400, { error: "对话轮次数据无效" });
    }
    if (typeof narrativeScore !== "number" || narrativeScore < 1 || narrativeScore > 5) {
      return sendJson(response, 400, { error: "叙事能力评分须在 1–5 之间" });
    }
    if (typeof initiativeScore !== "number" || initiativeScore < 1 || initiativeScore > 5) {
      return sendJson(response, 400, { error: "沟通主动性评分须在 1–5 之间" });
    }
    if (!account.communicationLogs) account.communicationLogs = [];

    // 计算 ISO 周编号
    const now = new Date();
    const localDateStr = localDate(now);
    const d = new Date(localDateStr);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const weekNumber = Math.ceil(((d - new Date(d.getFullYear(), 0, 4)) / 86400000 + 1) / 7);
    const year = d.getFullYear();
    const weekId = year + "-W" + String(weekNumber).padStart(2, "0");

    const log = {
      weekId,
      year,
      weekNumber,
      vocabulary,
      sentences: sentences.map(s => s.trim()),
      conversationTurns,
      narrativeScore,
      initiativeScore,
      createdAt: new Date().toISOString(),
      date: localDateStr
    };

    // 同一周覆盖旧记录
    const existing = account.communicationLogs.findIndex(l => l.weekId === weekId);
    if (existing === -1) account.communicationLogs.push(log);
    else account.communicationLogs[existing] = log;

    await persistState();
    return sendJson(response, 200, log);
  }

  if (requestPath === "/api/communication/log" && request.method === "GET") {
    return sendJson(response, 200, (account.communicationLogs || []).sort((a, b) => b.weekId.localeCompare(a.weekId)));
  }

  // ---- 今日故事任务 ----
  if (requestPath === "/api/communication/story" && request.method === "GET") {
    const now = new Date();
    const todayKey = localDate(now);
    const age = account.profile?.age || 4;
    const scene = getStoryScene(todayKey, age);
    const existing = (account.storyTasks || []).find(s => s.date === todayKey);
    return sendJson(response, 200, { scene, date: todayKey, hasResponse: !!existing, response: existing || null });
  }

  if (requestPath === "/api/communication/story" && request.method === "POST") {
    const { childResponse, narrativeScore, parentNotes, sceneId } = await readJson(request);
    if (!childResponse || typeof childResponse !== "string" || childResponse.trim().length < 1) {
      return sendJson(response, 400, { error: "请记录宝宝的故事描述" });
    }
    if (typeof narrativeScore !== "number" || narrativeScore < 1 || narrativeScore > 5) {
      return sendJson(response, 400, { error: "叙事能力评分须在 1–5 之间" });
    }
    if (!account.storyTasks) account.storyTasks = [];
    const now = new Date();
    const todayKey = localDate(now);
    const age = account.profile?.age || 4;
    const scene = getStoryScene(todayKey, age);
    const entry = {
      date: todayKey,
      sceneId: sceneId || scene.id,
      childResponse: childResponse.trim().slice(0, 500),
      narrativeScore,
      parentNotes: (parentNotes || "").trim().slice(0, 200),
      createdAt: new Date().toISOString()
    };
    const existing = account.storyTasks.findIndex(s => s.date === todayKey);
    if (existing === -1) account.storyTasks.push(entry);
    else account.storyTasks[existing] = entry;
    await persistState();
    return sendJson(response, 200, entry);
  }

  // ---- 列出账户（用于切换） ----
  if (requestPath === "/api/accounts" && request.method === "GET") {
    const list = Object.entries(persistedState.accounts).map(([id, acct]) => ({
      accountId: id,
      username: acct.username,
      profileName: acct.profile?.name || "未设置",
      profileAge: acct.profile?.age || 0
    }));
    return sendJson(response, 200, list);
  }

  sendJson(response, 404, { error: "Not Found" });
}

// ---- 创建服务器 ----
const server = http.createServer(async (request, response) => {
  const requestPath = decodeURIComponent(request.url.split("?")[0]);

  if (requestPath.startsWith("/api/")) {
    try {
      return await handleApi(request, response, requestPath);
    } catch (error) {
      console.error(error);
      if (!response.headersSent) {
        sendJson(response, error.statusCode || 500, { error: error.message || "服务器错误" });
      }
      return;
    }
  }

  // 静态文件
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    return sendErrorPage(response, 403, "访问被拒绝", "你没有权限访问此资源。");
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      return sendErrorPage(response, 404, "页面不见了", "咦，这里什么都没有……是不是走错路啦？");
    }

    const ext = path.extname(filePath);
    const contentType = types[ext] || "application/octet-stream";

    // Service Worker 必须每次重新检查，其他静态资源由服务端校验新鲜度。
    const cacheControl = relativePath === "sw.js" ? "no-store" : "no-cache";

    // gzip 压缩：仅对大于 1KB 的文本类响应启用
    const acceptsGzip = request.headers["accept-encoding"]?.includes("gzip");
    const useGzip = acceptsGzip && stats.size > 1024 && (ext === ".html" || ext === ".css" || ext === ".js");

    const headers = {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff"
    };
    if (useGzip) headers["Content-Encoding"] = "gzip";

    response.writeHead(200, headers);

    if (useGzip) {
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(response);
    } else {
      fs.createReadStream(filePath).pipe(response);
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log("元宝成长乐园运行在 http://0.0.0.0:" + port);
});
