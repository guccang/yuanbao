"use strict";

const DB_NAME = "yuanbao-learning";
const DB_VERSION = 1;
const DAY_MS = 86400000;
const app = document.querySelector("#app");
let feedbackAudioContext;
let feedbackMasterGain;

const SUCCESS_SOUNDS = [
  { name: "火车", emoji: "🚂", cheer: "呜——呜——！火车带着小星星进站啦！", sound: "train" },
  { name: "消防车", emoji: "🚒", cheer: "呜啦呜啦！消防车送来勇敢奖励！", sound: "firetruck" },
  { name: "警车", emoji: "🚓", cheer: "哔啵哔啵！警车为你亮起胜利灯！", sound: "police" },
  { name: "校车", emoji: "🚌", cheer: "嘟嘟！校车载着你的星星出发喽！", sound: "bus" }
];

const SUBJECT_META = {
  math:    { label: "数学", emoji: "🔢", color: "var(--orange)",   soft: "var(--orange-soft)", desc: "数感训练" },
  physics: { label: "物理", emoji: "⚡", color: "var(--purple)",   soft: "#f3edff",             desc: "物理启蒙" },
  english: { label: "英语", emoji: "🔤", color: "var(--blue)",     soft: "var(--blue-soft)",   desc: "英语启蒙" }
};

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

// ---- 应用状态 ----
const state = {
  accountId: null,
  profile: null,
  records: [],
  schedule: {},
  view: "login",
  selectedAge: 4,
  selectedSubject: null,
  lesson: null,
  activityIndex: 0,
  answers: [],
  feedback: null,
  isReview: false,
  completionCelebrated: false,
  todaySubjects: [],
  subjectLessonDays: {} // { subject: dayNumber }
};

// ---- API 帮助函数 ----
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "请求失败（" + response.status + "）");
  }
  return response.json();
}

const saveProfile = profile => api("/api/profile", { method: "PUT", body: JSON.stringify(profile) });

async function saveRecord(record) {
  await api("/api/progress", { method: "PUT", body: JSON.stringify(record) });
  const index = state.records.findIndex(r => r.date === record.date && r.subject === record.subject);
  if (index === -1) state.records.push(record);
  else state.records[index] = record;
}

// ---- 旧版兼容 ----
function openLegacyDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("profile")) db.createObjectStore("profile", { keyPath: "id" });
      if (!db.objectStoreNames.contains("progress")) {
        const store = db.createObjectStore("progress", { keyPath: "date" });
        store.createIndex("completedAt", "completedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function legacyDbRequest(db, store, action) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readonly");
    const request = action(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadLegacyState() {
  if (!("indexedDB" in window)) return { profile: null, records: [] };
  const db = await openLegacyDatabase();
  try {
    const profile = await legacyDbRequest(db, "profile", store => store.get("main"));
    const records = await legacyDbRequest(db, "progress", store => store.getAll());
    return { profile: profile || null, records: records || [] };
  } finally {
    db.close();
  }
}

// ---- 日期工具 ----
function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function todayDayOfWeek() {
  return new Date().getDay(); // 0=周日
}

// ---- 计算每个学科的学习天数 ----
function computeSubjectDays() {
  const startedAt = state.profile?.startedAt;
  if (!startedAt) return { math: 1, physics: 1, english: 1 };
  const start = dateFromKey(startedAt);
  const today = dateFromKey(localDate());
  const totalDays = Math.max(1, Math.floor((today - start) / DAY_MS) + 1);

  // 按学科统计已完成的课程数
  const counts = {};
  for (const subj of ["math", "physics", "english"]) {
    const completed = state.records.filter(r => r.subject === subj && r.completed).length;
    counts[subj] = Math.max(1, completed + 1);
  }
  return counts;
}

// ---- 课程生成 ----
function loadSubjectModule(subject) {
  if (subject === "math") return window.MathModule;
  if (subject === "physics") return window.PhysicsModule;
  if (subject === "english") return window.EnglishModule;
  return null;
}

function makeSubjectLesson(subject, day, age) {
  const mod = loadSubjectModule(subject);
  if (mod) return mod.generateLesson(day, age);
  // fallback — 模块未加载时提供占位课程，避免 renderLesson 崩溃
  const meta = SUBJECT_META[subject] || { label: subject, emoji: "📖" };
  return {
    subject, day, age,
    title: meta.label,
    subtitle: "课程模块暂未加载，请刷新页面后重试",
    activities: [{
      title: "课程模块加载失败",
      hint: "请刷新页面后重试，或联系管理员检查服务配置",
      visual: "⚠️",
      answer: "true",
      options: ["刷新页面"],
      learn: true
    }]
  };
}

// ---- 今日课表 ----
function getTodaySubjects() {
  const schedule = state.schedule || {};
  const dow = String(todayDayOfWeek());
  return schedule[dow] || [];
}

// ---- 进度工具 ----
function completedTodaySubject(subject) {
  return state.records.find(r => r.date === localDate() && r.subject === subject && r.completed);
}

function todayDraftSubject(subject) {
  return state.records.find(r => r.date === localDate() && r.subject === subject && !r.completed);
}

function streak() {
  const completeDates = new Set(state.records.filter(r => r.completed).map(r => r.date));
  let cursor = new Date();
  if (!completeDates.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (completeDates.has(localDate(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

// ---- UI 组件 ----
function nav(active) {
  return `<nav class="nav" aria-label="主导航">
    <button data-nav="home" class="${active === "home" ? "active" : ""}" ${active === "home" ? 'aria-current="page"' : ""}><span>🏡</span>今日</button>
    <button data-nav="schedule" class="${active === "schedule" ? "active" : ""}" ${active === "schedule" ? 'aria-current="page"' : ""}><span>📅</span>课表</button>
    <button data-nav="progress" class="${active === "progress" ? "active" : ""}" ${active === "progress" ? 'aria-current="page"' : ""}><span>🌈</span>成长</button>
    <button data-nav="profile" class="${active === "profile" ? "active" : ""}" ${active === "profile" ? 'aria-current="page"' : ""}><span>🐣</span>我的</button>
  </nav>`;
}

function topbar() {
  return `<header class="topbar">
    <div class="brand"><span class="brand-mark">🌱</span><div><strong>元宝成长乐园</strong><small>每天进步一点点</small></div></div>
    <button class="avatar" data-nav="profile" aria-label="打开宝宝资料">${state.profile?.avatar || "🐣"}</button>
  </header>`;
}

function weekday(date) {
  return ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
}

function renderWeek() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 3);
  const complete = new Set(state.records.filter(r => r.completed).map(r => r.date));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = localDate(date);
    const classes = ["day"];
    if (complete.has(key)) classes.push("done");
    if (key === localDate()) classes.push("today");
    return `<div class="${classes.join(" ")}"><span>${weekday(date)}</span><b>${complete.has(key) ? "✓" : date.getDate()}</b></div>`;
  }).join("");
}

// ---- 登录/注册 ----
function renderLogin() {
  app.innerHTML = `<main class="onboarding">
    <div class="onboarding-art">🌱</div>
    <h1>元宝成长乐园</h1>
    <p>数学 · 物理 · 英语<br>专为 3–6 岁宝宝设计</p>
    <form class="form-card" id="loginForm">
      <label class="field">用户名
        <input id="loginUsername" maxlength="20" placeholder="家长用户名" autocomplete="username" required>
      </label>
      <label class="field">密码
        <input id="loginPassword" type="password" maxlength="32" placeholder="登录密码" autocomplete="current-password" required>
      </label>
      <button class="primary-btn green" type="submit">登录</button>
      <p class="switch-link">还没有账户？<button type="button" class="link-btn" id="goRegister">注册新账户 →</button></p>
    </form>
    <p class="error-msg" id="loginError" style="display:none"></p>
  </main>`;

  document.querySelector("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.querySelector("#loginUsername").value.trim();
    const password = document.querySelector("#loginPassword").value;
    const errEl = document.querySelector("#loginError");
    try {
      const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      state.accountId = result.accountId;
      await loadUserState();
      toast("欢迎回来，" + state.profile.name + "！");
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
    }
  });
  document.querySelector("#goRegister").addEventListener("click", () => { state.view = "register"; render(); });
}

function renderRegister() {
  app.innerHTML = `<main class="onboarding">
    <div class="onboarding-art">🌱</div>
    <h1>创建新账户</h1>
    <p>为宝宝开启成长之旅</p>
    <form class="form-card" id="registerForm">
      <label class="field">家长用户名
        <input id="regUsername" maxlength="20" placeholder="用于登录" autocomplete="off" required>
      </label>
      <label class="field">登录密码
        <input id="regPassword" type="password" maxlength="32" placeholder="至少 4 个字符" autocomplete="new-password" required>
      </label>
      <label class="field">宝宝的小名
        <input id="regChildName" maxlength="8" placeholder="例如：元宝" value="元宝" autocomplete="off" required>
      </label>
      <strong>宝宝几岁啦？</strong>
      <div class="age-picker" role="group" aria-label="选择宝宝年龄">
        ${[3,4,5,6].map(age => `<button type="button" data-age="${age}" class="${age === state.selectedAge ? "active" : ""}">${age} 岁</button>`).join("")}
      </div>
      <button class="primary-btn green" type="submit">一起出发吧 →</button>
      <p class="switch-link">已有账户？<button type="button" class="link-btn" id="goLogin">返回登录 →</button></p>
    </form>
    <p class="error-msg" id="regError" style="display:none"></p>
  </main>`;

  document.querySelectorAll("[data-age]").forEach(btn => btn.addEventListener("click", () => {
    state.selectedAge = Number(btn.dataset.age);
    document.querySelectorAll("[data-age]").forEach(b => b.classList.toggle("active", b === btn));
  }));
  document.querySelector("#registerForm").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.querySelector("#regUsername").value.trim();
    const password = document.querySelector("#regPassword").value;
    const childName = document.querySelector("#regChildName").value.trim();
    const errEl = document.querySelector("#regError");
    try {
      const result = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password, childName, childAge: state.selectedAge })
      });
      state.accountId = result.accountId;
      state.profile = result.profile;
      state.records = [];
      state.schedule = {};
      state.view = "home";
      render();
      toast("欢迎你，" + result.profile.name + "！");
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
    }
  });
  document.querySelector("#goLogin").addEventListener("click", () => { state.view = "login"; render(); });
}

// ---- 加载用户状态 ----
async function loadUserState() {
  const saved = await api("/api/state");
  state.profile = saved.profile;
  state.records = saved.records || [];
  state.schedule = saved.schedule || {};
  state.view = "home";
  state.selectedAge = state.profile?.age || 4;
  state.subjectLessonDays = computeSubjectDays();
  render();
}

// ---- 首页 ----
function renderHome() {
  const todaySubjs = getTodaySubjects();
  state.todaySubjects = todaySubjs;
  const finished = state.records.filter(r => r.completed).length;
  const days = state.subjectLessonDays;

  // 今日课程卡片
  const subjectCards = todaySubjs.length ? todaySubjs.map(subj => {
    const meta = SUBJECT_META[subj];
    const done = completedTodaySubject(subj);
    const draft = todayDraftSubject(subj);
    const dayNum = days[subj] || 1;
    const lesson = makeSubjectLesson(subj, dayNum, state.profile.age);
    return `<div class="subject-card" style="--subject-color:${meta.color};--subject-soft:${meta.soft}">
      <div class="subject-card-header">
        <span class="subject-emoji">${meta.emoji}</span>
        <span class="subject-label">${meta.label}</span>
        ${done ? '<span class="done-badge">✓</span>' : draft ? '<span class="draft-badge">⋯</span>' : ''}
      </div>
      <h3>${done ? "已完成 ✓" : lesson.title}</h3>
      <p>${done ? `答对 ${done.correct}/${done.total} 题` : meta.desc}</p>
      <button class="subject-start-btn" data-subject="${subj}">
        ${done ? "再练一次 ↻" : draft ? "继续学习 →" : "开始学习 →"}
      </button>
    </div>`;
  }).join("") : `<div class="empty"><p>今天没有安排课程 📅<br>去「课表」页面设置今天的学习内容吧</p></div>`;

  app.innerHTML = `${topbar()}
    <section class="hello">
      <p class="eyebrow">${new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</p>
      <h1>${state.profile.name}，准备好<br>今天的小冒险了吗？</h1>
      <p>${todaySubjs.length} 个学科 · 每科约 5 分钟</p>
    </section>
    <section class="streak-card">
      <div class="streak-icon">${streak() ? "🔥" : "🌟"}</div>
      <div><strong>${streak() ? "连续学习 " + streak() + " 天" : "今天开始打卡吧"}</strong><p>${finished ? "已经完成 " + finished + " 节课，真了不起！" : "完成第一课，点亮宝宝的成长记录"}</p></div>
    </section>
    <div class="section-heading"><h2>今日课程</h2><span>${todaySubjs.length ? "按课表安排" : "今日休息"}</span></div>
    <div class="subject-grid">${subjectCards}</div>
    <div class="section-heading"><h2>本周打卡</h2><span>${finished} 节课已完成</span></div>
    <div class="week-strip">${renderWeek()}</div>
    ${nav("home")}`;

  // 绑定学科按钮
  document.querySelectorAll(".subject-start-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const subj = btn.dataset.subject;
      const restart = Boolean(completedTodaySubject(subj));
      startSubjectLesson(subj, restart);
    });
  });
  bindNavigation();
}

// ---- 开始学科课程 ----
async function startSubjectLesson(subject, restart = false) {
  const days = state.subjectLessonDays;
  const dayNum = days[subject] || 1;
  const lesson = makeSubjectLesson(subject, dayNum, state.profile.age);
  const draft = restart ? null : todayDraftSubject(subject);
  state.selectedSubject = subject;
  state.lesson = lesson;
  state.isReview = restart;
  state.activityIndex = draft?.activityIndex || 0;
  state.answers = draft?.answers || [];
  state.feedback = null;
  state.completionCelebrated = false;
  state.view = "lesson";
  render();
}

// ---- 课程页面 ----
function promptVisual(activity) {
  if (activity.learn) {
    if (activity.word) {
      return `<div><div class="emoji-group">${activity.visual}</div><div class="big-word">${activity.word.en}</div><div class="word-meaning">${activity.word.cn}</div>
        <button class="listen-btn" data-speak="${activity.word.en}">🔊 听发音</button></div>`;
    }
    return `<div><div class="emoji-group">${activity.visual}</div><p class="learn-concept">${activity.hint}</p></div>`;
  }
  if (activity.subject === "english" && activity.visual === "🔊") {
    return `<div><div class="emoji-group">🎧</div><button class="listen-btn" data-speak="${activity.word?.en || ''}">🔊 再听一遍</button></div>`;
  }
  if (activity.word && !activity.learn && activity.visual !== "🔊") {
    return `<div class="emoji-group">${activity.visual}</div>`;
  }
  return `<div class="emoji-group">${activity.visual}</div>`;
}

function renderAnswers(activity) {
  if (Array.isArray(activity.pictureOptions)) {
    return activity.pictureOptions.map(opt => {
      const text = typeof opt === "string" ? opt : (opt.cn || opt.en || opt);
      const emoji = typeof opt === "object" ? (opt.emoji || "") : "";
      const label = typeof opt === "object" ? (opt.cn || opt.en) : text;
      return `<button class="answer" data-answer="${typeof opt === "object" ? opt.en : opt}" aria-label="${label}">${emoji}<br><small>${label}</small></button>`;
    }).join("");
  }
  return activity.options.map(opt => `<button class="answer" data-answer="${opt}">${opt}</button>`).join("");
}

function renderLesson() {
  const lesson = state.lesson;
  const activity = lesson?.activities?.[state.activityIndex];
  if (!lesson || !activity) {
    console.error("renderLesson: 缺少课程数据", { lesson, activityIndex: state.activityIndex });
    state.view = "home";
    render();
    toast("课程数据加载失败，请返回首页重试");
    return;
  }
  const total = lesson.activities.length;
  const percent = Math.round(state.activityIndex / total * 100);
  const meta = SUBJECT_META[state.selectedSubject] || { label: "学习", emoji: "📖" };

  app.innerHTML = `<header class="lesson-top">
    <button class="icon-btn" id="exitLesson" aria-label="退出课程">‹</button>
    <div class="step-progress"><i style="width:${percent}%"></i></div>
    <div class="step-count">${state.activityIndex + 1}/${total}</div>
  </header>
  <main class="activity">
    <span class="subject-tag" style="--tag-color:${meta.color};--tag-soft:${meta.soft};--tag-text:${meta.color}">${meta.emoji} ${meta.label}</span>
    <h1>${activity.title}</h1>
    <p class="instruction">${activity.hint}</p>
    <section class="prompt-card">${promptVisual(activity)}</section>
    <div class="answers">${renderAnswers(activity)}</div>
  </main>`;

  document.querySelector("#exitLesson").addEventListener("click", exitLesson);
  document.querySelectorAll("[data-speak]").forEach(btn => btn.addEventListener("click", () => speak(btn.dataset.speak)));
  document.querySelectorAll(".answer").forEach(btn => btn.addEventListener("click", () => answerQuestion(btn, activity)));
  if (activity.visual === "🔊" && activity.word) setTimeout(() => speak(activity.word.en), 250);
}

// ---- 音效 ----
function audioTone(context, output, { start, duration, frequency, endFrequency = frequency, type = "sine", volume = .1 }) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain).connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + .02);
}

function playVehicleSound(context, output, start, vehicle) {
  if (vehicle === "train") {
    audioTone(context, output, { start, duration: .52, frequency: 440, endFrequency: 660, type: "triangle", volume: .14 });
    audioTone(context, output, { start: start + .58, duration: .38, frequency: 660, endFrequency: 520, type: "triangle", volume: .12 });
    [0, .14, .28, .42].forEach(offset => audioTone(context, output, { start: start + offset, duration: .06, frequency: 120, type: "square", volume: .045 }));
  } else if (vehicle === "firetruck" || vehicle === "police") {
    const tones = vehicle === "firetruck" ? [660, 880] : [740, 520];
    [0, .2, .4, .6].forEach((offset, index) => audioTone(context, output, {
      start: start + offset, duration: .19, frequency: tones[index % 2], type: "sine", volume: .105
    }));
  } else {
    audioTone(context, output, { start, duration: .16, frequency: 310, endFrequency: 390, type: "square", volume: .095 });
    audioTone(context, output, { start: start + .24, duration: .2, frequency: 390, endFrequency: 300, type: "square", volume: .095 });
  }
}

function playFeedbackSound(type = "correct", vehicle) {
  if (!(window.AudioContext || window.webkitAudioContext)) return;
  try {
    feedbackAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const context = feedbackAudioContext;
    const start = context.currentTime;
    const celebration = type === "complete";
    const notes = celebration ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
    const duration = celebration ? .26 : .16;
    feedbackMasterGain ||= context.createGain();
    feedbackMasterGain.gain.value = .72;
    feedbackMasterGain.connect(context.destination);
    if (context.state === "suspended") context.resume().catch(() => {});
    if (vehicle) playVehicleSound(context, feedbackMasterGain, start + .34, vehicle);
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * (celebration ? .13 : .105);
      oscillator.type = index === notes.length - 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(celebration ? .16 : .12, noteStart + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, noteStart + duration);
      oscillator.connect(gain).connect(feedbackMasterGain);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + duration + .02);
    });
  } catch (error) {
    console.debug("无法播放反馈音效", error);
  }
}

function celebrateWithParticles(kind, count = 16, successSound) {
  const effect = document.createElement("div");
  effect.className = "celebration-particles " + kind;
  effect.setAttribute("aria-hidden", "true");
  const symbols = kind === "complete"
    ? ["🎉", "✦", "⭐", "●", "❤"]
    : ["🎊", "✨", "⭐", "🌟", "💛", successSound?.emoji || "✦"];
  effect.innerHTML = Array.from({ length: count }, (_, index) => {
    const angle = (360 / count) * index + (index % 2) * 8;
    const distance = kind === "complete" ? 130 + (index % 4) * 24 : 110 + (index % 5) * 26;
    return `<i style="--angle:${angle}deg;--distance:${distance}px;--delay:${index * 22}ms">${symbols[index % symbols.length]}</i>`;
  }).join("");
  document.body.appendChild(effect);
  window.setTimeout(() => effect.remove(), kind === "complete" ? 1700 : 1100);
}

function showSuccessBadge(successSound) {
  const badge = document.createElement("div");
  badge.className = "success-badge";
  badge.setAttribute("aria-hidden", "true");
  badge.innerHTML = `<span class="success-badge-emoji">${successSound.emoji}</span><strong>答对啦！</strong><small>${successSound.name}来庆祝</small>`;
  document.body.appendChild(badge);
  window.setTimeout(() => badge.remove(), 1250);
}

function showAnswerEffect(correct) {
  const activity = document.querySelector(".activity");
  const prompt = document.querySelector(".prompt-card");
  activity?.classList.add(correct ? "answer-is-correct" : "answer-is-wrong");
  prompt?.classList.add(correct ? "prompt-celebrate" : "prompt-try-again");

  if (correct) {
    const successSound = SUCCESS_SOUNDS[Math.floor(Math.random() * SUCCESS_SOUNDS.length)];
    celebrateWithParticles("correct", 30, successSound);
    showSuccessBadge(successSound);
    playFeedbackSound("correct", successSound.sound);
    if (navigator.vibrate) navigator.vibrate(35);
    return successSound;
  }
  return null;
}

// ---- 答题 ----
async function answerQuestion(button, activity) {
  if (state.feedback) return;
  const chosen = button.dataset.answer;
  const correct = activity.learn ? true : chosen.toLowerCase() === String(activity.answer).toLowerCase();
  document.querySelectorAll(".answer").forEach(item => {
    item.disabled = true;
    if (item.dataset.answer.toLowerCase() === String(activity.answer).toLowerCase()) item.classList.add("correct");
  });
  if (!correct) button.classList.add("wrong");
  const successSound = showAnswerEffect(correct);
  state.answers[state.activityIndex] = { subject: state.selectedSubject, correct, chosen, answer: activity.answer };
  state.feedback = { correct, answer: activity.answer };

  const sheet = document.createElement("div");
  sheet.className = "feedback-sheet " + (correct ? "feedback-correct" : "feedback-wrong");
  sheet.innerHTML = `<div class="feedback-inner">
    <div class="feedback-face ${correct ? "feedback-star" : ""}">${correct ? "🌟" : "💪"}</div>
    <div class="feedback-copy"><strong>${correct ? "答对啦，真棒！" : "差一点，也很棒！"}</strong><span>${correct ? successSound.cheer : "正确答案是 " + activity.answer}</span></div>
    <button class="primary-btn green" id="nextActivity">${state.activityIndex === (state.lesson?.activities?.length || 1) - 1 ? "完成" : "继续 →"}</button>
  </div>`;
  document.body.appendChild(sheet);
  document.querySelector("#nextActivity").addEventListener("click", nextActivity);

  if (!state.isReview) {
    try {
      await saveRecord({
        date: localDate(),
        subject: state.selectedSubject,
        day: state.lesson?.day || 1,
        completed: false,
        activityIndex: state.activityIndex + 1,
        answers: state.answers,
        total: state.lesson?.activities?.length || state.answers.length,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
      toast("学习进度暂未保存，请稍后重试");
    }
  }
}

async function nextActivity() {
  document.querySelector(".feedback-sheet")?.remove();
  state.feedback = null;
  state.activityIndex++;
  const lesson = state.lesson;
  if (!lesson || state.activityIndex >= lesson.activities.length) {
    const correct = state.answers.filter(a => a.correct).length;
    const total = lesson?.activities?.length || state.answers.length;
    const record = {
      date: localDate(),
      subject: state.selectedSubject,
      day: lesson?.day || 1,
      completed: true,
      correct,
      total,
      stars: Math.max(1, Math.round(correct / 2)),
      answers: state.answers,
      completedAt: new Date().toISOString()
    };
    if (!state.isReview) {
      await saveRecord(record);
    }
    state.view = "complete";
  }
  render();
}

function exitLesson() {
  state.view = "home";
  state.feedback = null;
  document.querySelector(".feedback-sheet")?.remove();
  render();
}

function speak(word) {
  if (!("speechSynthesis" in window)) return toast("当前浏览器暂不支持语音");
  speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(word);
  speech.lang = "en-US";
  speech.rate = .72;
  speech.pitch = 1.08;
  speechSynthesis.speak(speech);
}

// ---- 完成页面 ----
function renderComplete() {
  const correct = state.answers.filter(a => a.correct).length;
  const total = state.lesson?.activities?.length || state.answers.length;
  const meta = SUBJECT_META[state.selectedSubject] || { label: "学习", emoji: "📖" };
  const remainingSubjects = (state.todaySubjects || []).filter(s => s !== state.selectedSubject && !completedTodaySubject(s));

  app.innerHTML = `<main class="celebrate">
    <p class="eyebrow">${meta.label} · 课程完成</p>
    <div class="medal">🏅</div>
    <h1>${state.profile.name}，太棒啦！</h1>
    <p>${meta.emoji} ${meta.label}能量收集完成<br>${remainingSubjects.length ? "还有 " + remainingSubjects.length + " 个学科等着你哦" : "今天的课程全部完成！"}</p>
    <div class="result-grid">
      <div class="result"><b>${correct}/${total}</b><span>答对题目</span></div>
      <div class="result"><b>${Math.max(1, Math.round(correct / 2))} ⭐</b><span>获得星星</span></div>
      <div class="result"><b>${streak()} 天</b><span>连续学习</span></div>
    </div>
    ${remainingSubjects.length ? remainingSubjects.map(s => {
      const m = SUBJECT_META[s];
      return `<button class="primary-btn" style="margin-bottom:10px;background:${m.color};color:white;box-shadow:0 6px 0 ${m.color}dd" id="nextSubject-${s}">${m.emoji} 继续学${m.label} →</button>`;
    }).join("") : ""}
    <button class="primary-btn green" id="backHome">回到首页</button>
  </main>`;

  document.querySelector("#backHome").addEventListener("click", () => { state.view = "home"; render(); });
  remainingSubjects.forEach(s => {
    const btn = document.querySelector("#nextSubject-" + s);
    if (btn) btn.addEventListener("click", () => startSubjectLesson(s, false));
  });

  if (!state.completionCelebrated) {
    state.completionCelebrated = true;
    requestAnimationFrame(() => {
      celebrateWithParticles("complete", 24);
      playFeedbackSound("complete");
      if (navigator.vibrate) navigator.vibrate([35, 45, 70]);
    });
  }
}

// ---- 课表页面 ----
function renderSchedule() {
  const schedule = state.schedule || {};
  const todayDow = todayDayOfWeek();
  const rows = [0, 1, 2, 3, 4, 5, 6].map(dow => {
    const subs = schedule[String(dow)] || [];
    const isToday = dow === todayDow;
    const subjectTags = subs.length ? subs.map(s => {
      const m = SUBJECT_META[s];
      return `<span class="schedule-subject-tag" style="background:${m.soft};color:${m.color}">${m.emoji} ${m.label}</span>`;
    }).join("") : `<span class="schedule-empty">休息日 🌟</span>`;
    return `<div class="schedule-row ${isToday ? "schedule-today" : ""}">
      <div class="schedule-dow">${WEEKDAY_NAMES[dow]}${isToday ? ' <small>今天</small>' : ''}</div>
      <div class="schedule-subs">${subjectTags}</div>
      <button class="schedule-edit-btn" data-dow="${dow}" aria-label="编辑${WEEKDAY_NAMES[dow]}课表">✎</button>
    </div>`;
  }).join("");

  app.innerHTML = `${topbar()}
    <p class="eyebrow">课程表</p>
    <h1 class="page-title">每周学习计划</h1>
    <p class="page-subtitle">点击 ✎ 编辑每天的学科安排</p>
    <div class="schedule-list">${rows}</div>
    <div class="schedule-actions">
      <button class="secondary-btn" id="resetSchedule">恢复默认课表</button>
    </div>
    ${nav("schedule")}`;

  document.querySelectorAll(".schedule-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => editScheduleDay(Number(btn.dataset.dow)));
  });
  document.querySelector("#resetSchedule").addEventListener("click", async () => {
    if (!confirm("确定恢复默认课表吗？")) return;
    try {
      await api("/api/schedule", { method: "PUT", body: JSON.stringify({
        0: [], 1: ["math", "english"], 2: ["physics", "math"],
        3: ["english", "physics"], 4: ["math", "english"],
        5: ["physics", "math"], 6: ["english"]
      })});
      const stateData = await api("/api/state");
      state.schedule = stateData.schedule || {};
      render();
      toast("课表已恢复默认");
    } catch (err) {
      toast(err.message);
    }
  });
  bindNavigation();
}

async function editScheduleDay(dow) {
  const schedule = state.schedule || {};
  const current = schedule[String(dow)] || [];
  const allSubjects = ["math", "physics", "english"];
  const options = allSubjects.map(s => {
    const m = SUBJECT_META[s];
    const checked = current.includes(s);
    return `<label class="schedule-checkbox" style="--check-color:${m.color}">
      <input type="checkbox" value="${s}" ${checked ? "checked" : ""}>
      <span>${m.emoji} ${m.label}</span>
    </label>`;
  }).join("");

  const dialog = document.createElement("div");
  dialog.className = "schedule-dialog-overlay";
  dialog.innerHTML = `<div class="schedule-dialog">
    <h3>编辑${WEEKDAY_NAMES[dow]}课表</h3>
    <div class="schedule-checkboxes">${options}</div>
    <div class="schedule-dialog-btns">
      <button class="secondary-btn" id="cancelSchedule">取消</button>
      <button class="primary-btn green" id="saveSchedule">保存</button>
    </div>
  </div>`;
  document.body.appendChild(dialog);

  dialog.querySelector("#cancelSchedule").addEventListener("click", () => dialog.remove());
  dialog.querySelector("#saveSchedule").addEventListener("click", async () => {
    const selected = [...dialog.querySelectorAll("input:checked")].map(cb => cb.value);
    const newSchedule = { ...schedule };
    newSchedule[String(dow)] = selected;
    try {
      await api("/api/schedule", { method: "PUT", body: JSON.stringify(newSchedule) });
      state.schedule = newSchedule;
      dialog.remove();
      render();
      toast(WEEKDAY_NAMES[dow] + "课表已更新");
    } catch (err) {
      toast(err.message);
    }
  });
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.remove(); });
}

// ---- 成长页面 ----
function renderProgress() {
  const completed = state.records.filter(r => r.completed).sort((a, b) => b.date.localeCompare(a.date));
  const totalStars = completed.reduce((sum, r) => sum + (r.stars || 0), 0);

  const subjectStats = (subj) => {
    const recs = completed.filter(r => r.subject === subj);
    const answers = recs.flatMap(r => r.answers || []);
    const acc = answers.length ? Math.round(answers.filter(a => a.correct).length / answers.length * 100) : 0;
    return { count: recs.length, accuracy: acc, stars: recs.reduce((s, r) => s + (r.stars || 0), 0) };
  };

  const mathStats = subjectStats("math");
  const physicsStats = subjectStats("physics");
  const englishStats = subjectStats("english");

  const historyItems = completed.length ? completed.slice(0, 10).map(r => {
    const meta = SUBJECT_META[r.subject] || { label: r.subject, emoji: "📖", color: "var(--ink)" };
    const day = r.day || 1;
    const lesson = makeSubjectLesson(r.subject, day, state.profile.age);
    return `<article class="history-item">
      <div class="history-icon" style="background:${meta.soft};color:${meta.color}">${meta.emoji}</div>
      <div class="history-copy"><strong>${meta.label} · ${lesson.title}</strong><small>${r.date} · ${r.correct || 0}/${r.total || 0} 题</small></div>
      <div class="history-score">${"⭐".repeat(r.stars || 0)}</div>
    </article>`;
  }).join("") : `<div class="empty">完成课程后，成长记录会出现在这里 🌱</div>`;

  app.innerHTML = `${topbar()}
    <p class="eyebrow">成长中心</p>
    <h1 class="page-title">${state.profile.name} 的成长足迹</h1>
    <p class="page-subtitle">每一次尝试都值得被看见。</p>
    <section class="stats-grid">
      <div class="stat-card"><i>📚</i><b>${completed.length}</b><span>完成课程</span></div>
      <div class="stat-card"><i>⭐</i><b>${totalStars}</b><span>收集星星</span></div>
      <div class="stat-card"><i>🔥</i><b>${streak()}</b><span>连续天数</span></div>
    </section>
    <div class="section-heading"><h2>学科能力</h2><span>按答题正确率</span></div>
    <section class="subject-progress">
      <div class="bar-row"><header><span>🔢 数学</span><span>${mathStats.count} 课 · ${mathStats.accuracy}%</span></header><div class="bar"><i style="width:${mathStats.accuracy}%;background:var(--orange)"></i></div></div>
      <div class="bar-row"><header><span>⚡ 物理</span><span>${physicsStats.count} 课 · ${physicsStats.accuracy}%</span></header><div class="bar"><i style="width:${physicsStats.accuracy}%;background:var(--purple)"></i></div></div>
      <div class="bar-row"><header><span>🔤 英语</span><span>${englishStats.count} 课 · ${englishStats.accuracy}%</span></header><div class="bar"><i style="width:${englishStats.accuracy}%;background:var(--blue)"></i></div></div>
    </section>
    <div class="section-heading"><h2>课程记录</h2><span>最近 10 节</span></div>
    <section class="history-list">${historyItems}</section>
    ${nav("progress")}`;
  bindNavigation();
}

// ---- 我的页面 ----
function renderProfile() {
  const days = state.subjectLessonDays;
  app.innerHTML = `${topbar()}
    <p class="eyebrow">宝宝资料</p>
    <h1 class="page-title">学习设置</h1>
    <section class="profile-card">
      <div class="profile-hero"><div class="large-avatar">${state.profile?.avatar || "🐣"}</div><h2>${state.profile.name}</h2><p>${state.profile.age} 岁 · 已学习 ${Math.max(...Object.values(days)) || 1} 天</p></div>
      <div class="section-heading"><h2>课程信息</h2></div>
      <div class="setting-row"><div><strong>每日学科</strong><br><span>按课表自动安排</span></div><b>最多 3 科</b></div>
      <div class="setting-row"><div><strong>课程难度</strong><br><span>依据年龄自动调整</span></div><b>${state.profile.age} 岁阶段</b></div>
      <div class="setting-row"><div><strong>数据保存</strong><br><span>安全保存在应用服务</span></div><b>已开启</b></div>
      <button class="secondary-btn" id="editProfile">修改宝宝资料</button>
      <button class="secondary-btn" id="exportData">📥 导出学习报告 (HTML)</button>
      <button class="secondary-btn" id="logoutBtn">🚪 退出登录</button>
      <button class="danger-btn" id="resetData">清除全部学习数据</button>
    </section>
    ${nav("profile")}`;

  document.querySelector("#editProfile").addEventListener("click", editProfile);
  document.querySelector("#exportData").addEventListener("click", exportData);
  document.querySelector("#logoutBtn").addEventListener("click", logout);
  document.querySelector("#resetData").addEventListener("click", resetData);
  bindNavigation();
}

async function editProfile() {
  const name = prompt("宝宝的小名", state.profile.name);
  if (name === null || !name.trim()) return;
  const age = Number(prompt("宝宝年龄（3–6 岁）", state.profile.age));
  if (![3, 4, 5, 6].includes(age)) return toast("年龄请输入 3、4、5 或 6");
  state.profile = { ...state.profile, name: name.trim().slice(0, 8), age };
  await saveProfile(state.profile);
  state.selectedAge = age;
  state.subjectLessonDays = computeSubjectDays();
  render();
  toast("宝宝资料已更新");
}

async function exportData() {
  try {
    const resp = await fetch("/api/export/html");
    if (!resp.ok) throw new Error("导出失败");
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yuanbao-report-" + (state.profile.name || "宝宝") + ".html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("学习报告已下载");
  } catch (err) {
    toast(err.message);
  }
}

async function logout() {
  if (!confirm("确定退出登录吗？")) return;
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (e) { /* ignore */ }
  state.accountId = null;
  state.profile = null;
  state.records = [];
  state.schedule = {};
  state.view = "login";
  render();
}

async function resetData() {
  if (!confirm("确定清除宝宝资料和全部学习记录吗？此操作无法撤销。")) return;
  await api("/api/state", { method: "DELETE" });
  if ("indexedDB" in window) indexedDB.deleteDatabase(DB_NAME);
  state.records = [];
  state.view = "home";
  render();
  toast("学习数据已清除");
}

// ---- 导航 ----
function bindNavigation() {
  document.querySelectorAll("[data-nav]").forEach(btn => btn.addEventListener("click", () => {
    state.view = btn.dataset.nav;
    if (state.view === "home") state.subjectLessonDays = computeSubjectDays();
    window.scrollTo({ top: 0, behavior: "smooth" });
    render();
  }));
}

// ---- Toast ----
function toast(message) {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2200);
}

// ---- 渲染入口 ----
function render() {
  if (state.view === "login") return renderLogin();
  if (state.view === "register") return renderRegister();
  if (!state.profile) return renderLogin();
  if (state.view === "lesson") return renderLesson();
  if (state.view === "complete") return renderComplete();
  if (state.view === "schedule") return renderSchedule();
  if (state.view === "progress") return renderProgress();
  if (state.view === "profile") return renderProfile();
  renderHome();
}

// ---- 初始化 ----
async function init() {
  // 尝试加载已登录状态
  try {
    const saved = await api("/api/state");
    if (saved.profile) {
      state.profile = saved.profile;
      state.records = saved.records || [];
      state.schedule = saved.schedule || {};
      state.view = "home";
      state.selectedAge = state.profile.age || 4;
      state.subjectLessonDays = computeSubjectDays();
      render();
      return;
    }
  } catch (err) {
    // 未登录，显示登录页面
    if (err.message.includes("401") || err.message.includes("登录")) {
      state.view = "login";
      render();
      return;
    }
  }

  // 尝试旧版迁移
  try {
    const legacy = await loadLegacyState();
    if (legacy.profile) {
      // 有旧数据，提示注册
      state.view = "register";
      state.selectedAge = legacy.profile.age || 4;
      document.querySelector("#regChildName") && (document.querySelector("#regChildName").value = legacy.profile.name || "元宝");
      render();
      return;
    }
  } catch (e) { /* ignore */ }

  state.view = "login";
  render();
}

// 加载学科模块（由 index.html 的 script 标签提供）
document.addEventListener("DOMContentLoaded", () => {
  // 模块由单独的 <script> 标签加载到 window 全局
  window.MathModule = window.MathModule || null;
  window.PhysicsModule = window.PhysicsModule || null;
  window.EnglishModule = window.EnglishModule || null;
  init();
});