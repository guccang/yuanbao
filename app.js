"use strict";

const DB_NAME = "yuanbao-learning";
const DB_VERSION = 1;
const DAY_MS = 86400000;
const app = document.querySelector("#app");

const MATH_THEMES = [
  { name: "果园数一数", emoji: "🍎", items: ["🍎", "🍐", "🍊", "🍓"] },
  { name: "海洋小队", emoji: "🐠", items: ["🐠", "🐟", "🐙", "🦀"] },
  { name: "太空探险", emoji: "🚀", items: ["⭐", "🌙", "🪐", "🚀"] },
  { name: "动物派对", emoji: "🐰", items: ["🐰", "🐼", "🐻", "🦊"] },
  { name: "花园朋友", emoji: "🌻", items: ["🌻", "🌷", "🌸", "🦋"] },
  { name: "汽车工厂", emoji: "🚗", items: ["🚗", "🚌", "🚕", "🚙"] },
  { name: "甜点小屋", emoji: "🧁", items: ["🧁", "🍪", "🍩", "🍰"] }
];

const WORDS = [
  { en: "apple", cn: "苹果", emoji: "🍎", group: "食物" },
  { en: "banana", cn: "香蕉", emoji: "🍌", group: "食物" },
  { en: "milk", cn: "牛奶", emoji: "🥛", group: "食物" },
  { en: "cake", cn: "蛋糕", emoji: "🍰", group: "食物" },
  { en: "cat", cn: "小猫", emoji: "🐱", group: "动物" },
  { en: "dog", cn: "小狗", emoji: "🐶", group: "动物" },
  { en: "rabbit", cn: "兔子", emoji: "🐰", group: "动物" },
  { en: "fish", cn: "小鱼", emoji: "🐟", group: "动物" },
  { en: "bird", cn: "小鸟", emoji: "🐦", group: "动物" },
  { en: "red", cn: "红色", emoji: "🔴", group: "颜色" },
  { en: "blue", cn: "蓝色", emoji: "🔵", group: "颜色" },
  { en: "yellow", cn: "黄色", emoji: "🟡", group: "颜色" },
  { en: "green", cn: "绿色", emoji: "🟢", group: "颜色" },
  { en: "sun", cn: "太阳", emoji: "☀️", group: "自然" },
  { en: "moon", cn: "月亮", emoji: "🌙", group: "自然" },
  { en: "star", cn: "星星", emoji: "⭐", group: "自然" },
  { en: "flower", cn: "花朵", emoji: "🌸", group: "自然" },
  { en: "car", cn: "汽车", emoji: "🚗", group: "交通" },
  { en: "bus", cn: "公交车", emoji: "🚌", group: "交通" },
  { en: "train", cn: "火车", emoji: "🚂", group: "交通" },
  { en: "boat", cn: "小船", emoji: "⛵", group: "交通" },
  { en: "one", cn: "一", emoji: "1️⃣", group: "数字" },
  { en: "two", cn: "二", emoji: "2️⃣", group: "数字" },
  { en: "three", cn: "三", emoji: "3️⃣", group: "数字" }
];

const state = {
  profile: null,
  records: [],
  view: "home",
  selectedAge: 4,
  lesson: null,
  activityIndex: 0,
  answers: [],
  feedback: null,
  isReview: false
};

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

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || `请求失败（${response.status}）`);
  }
  return response.json();
}

const saveProfile = profile => api("/api/profile", { method: "PUT", body: JSON.stringify(profile) });
async function saveRecord(record) {
  await api("/api/progress", { method: "PUT", body: JSON.stringify(record) });
  const index = state.records.findIndex(item => item.date === record.date);
  if (index === -1) state.records.push(record);
  else state.records[index] = record;
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

async function migrateLegacyState() {
  try {
    const legacy = await loadLegacyState();
    if (!legacy.profile) return legacy;
    await saveProfile(legacy.profile);
    for (const record of legacy.records) await saveRecord(record);
    return legacy;
  } catch (error) {
    console.warn("无法读取旧版浏览器数据，将使用服务端存储。", error);
    return { profile: null, records: [] };
  }
}

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayNumber() {
  if (!state.profile) return 1;
  const start = dateFromKey(state.profile.startedAt);
  const today = dateFromKey(localDate());
  return Math.max(1, Math.floor((today - start) / DAY_MS) + 1);
}

function seeded(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => (value = value * 16807 % 2147483647) / 2147483647;
}

function shuffle(list, random) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function numberOptions(answer, max, random) {
  const values = new Set([answer]);
  while (values.size < 4) values.add(1 + Math.floor(random() * max));
  return shuffle([...values], random);
}

function makeLesson(day, age) {
  const random = seeded(day * 7919 + age * 101);
  const theme = MATH_THEMES[(day - 1) % MATH_THEMES.length];
  const word = WORDS[(day - 1) % WORDS.length];
  const max = age === 3 ? 5 : age === 4 ? 8 : age === 5 ? 12 : 20;
  const count = 1 + Math.floor(random() * Math.min(max, 10));
  const other = 1 + Math.floor(random() * Math.min(max, 10));
  const larger = Math.max(count, other === count ? Math.min(10, other + 1) : other);
  const smaller = count === larger ? Math.max(1, count - 1) : count;
  const item = theme.items[day % theme.items.length];
  const distractors = shuffle(WORDS.filter(entry => entry.en !== word.en), random).slice(0, 3);
  const wordOptions = shuffle([word, ...distractors], random);
  const sequenceStart = 1 + Math.floor(random() * Math.max(2, max - 3));
  const activities = [
    {
      subject: "math", title: "数一数，有几个？", hint: "用小手指着，一个一个数",
      visual: item.repeat(count), answer: String(count),
      options: numberOptions(count, Math.max(5, Math.min(max, 10)), random)
    },
    {
      subject: "math", title: "哪一边更多？", hint: "看看两组小伙伴，选择更多的一组",
      visual: `${theme.emoji.repeat(smaller)}  ·  ${theme.emoji.repeat(larger)}`,
      answer: String(larger), options: shuffle([smaller, larger], random)
    },
    {
      subject: "math", title: age <= 4 ? "下一个数字是什么？" : "找出数字规律",
      hint: "顺着数字往后数一数",
      visual: `${sequenceStart}　${sequenceStart + 1}　?`,
      answer: String(sequenceStart + 2),
      options: numberOptions(sequenceStart + 2, Math.max(6, max), random)
    },
    {
      subject: "english", title: `今天的新单词：${word.en}`, hint: "点小喇叭听一听，再跟着读",
      visual: word.emoji, word, answer: word.en,
      options: shuffle([word.en, ...distractors.slice(0, 3).map(entry => entry.en)], random),
      learn: true
    },
    {
      subject: "english", title: `哪个是 ${word.en}？`, hint: "听一听，选出对应的图片",
      visual: "🔊", word, answer: word.en,
      options: wordOptions.map(entry => entry.en), pictureOptions: wordOptions
    },
    {
      subject: "english", title: `${word.cn} 用英语怎么说？`, hint: "选出今天刚认识的单词",
      visual: word.emoji, word, answer: word.en,
      options: shuffle([word.en, ...distractors.slice(0, 3).map(entry => entry.en)], random)
    }
  ];
  return {
    day, age, theme, word, activities,
    title: `${theme.name} · ${word.en}`,
    subtitle: `数学「${count} 以内数量」+ 英语「${word.group}单词」`
  };
}

function completedToday() {
  return state.records.find(record => record.date === localDate() && record.completed);
}

function todayDraft() {
  return state.records.find(record => record.date === localDate() && !record.completed);
}

function streak() {
  const completeDates = new Set(state.records.filter(item => item.completed).map(item => item.date));
  let cursor = new Date();
  if (!completeDates.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (completeDates.has(localDate(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function nav(active) {
  return `<nav class="nav" aria-label="主导航">
    <button data-nav="home" class="${active === "home" ? "active" : ""}" ${active === "home" ? 'aria-current="page"' : ""}><span>🏡</span>今日</button>
    <button data-nav="progress" class="${active === "progress" ? "active" : ""}" ${active === "progress" ? 'aria-current="page"' : ""}><span>🌈</span>成长</button>
    <button data-nav="profile" class="${active === "profile" ? "active" : ""}" ${active === "profile" ? 'aria-current="page"' : ""}><span>🐣</span>我的</button>
  </nav>`;
}

function topbar() {
  return `<header class="topbar">
    <div class="brand"><span class="brand-mark">🌱</span><div><strong>元宝成长乐园</strong><small>每天进步一点点</small></div></div>
    <button class="avatar" data-nav="profile" aria-label="打开宝宝资料">🐣</button>
  </header>`;
}

function weekday(date) {
  return ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
}

function renderWeek() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 3);
  const complete = new Set(state.records.filter(item => item.completed).map(item => item.date));
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

function renderHome() {
  const day = dayNumber();
  const lesson = makeLesson(day, state.profile.age);
  const done = completedToday();
  const draft = todayDraft();
  const finished = state.records.filter(item => item.completed).length;
  const progress = done ? 100 : draft ? Math.round((draft.activityIndex || 0) / 6 * 100) : 0;
  app.innerHTML = `${topbar()}
    <section class="hello">
      <p class="eyebrow">第 ${day} 天 · ${new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</p>
      <h1>${state.profile.name}，准备好<br>今天的小冒险了吗？</h1>
      <p>每天 8–10 分钟，收集知识、快乐长大。</p>
    </section>
    <section class="streak-card">
      <div class="streak-icon">${streak() ? "🔥" : "🌟"}</div>
      <div><strong>${streak() ? `连续学习 ${streak()} 天` : "今天开始打卡吧"}</strong><p>${finished ? `已经完成 ${finished} 节课，真了不起！` : "完成第一课，点亮宝宝的成长记录"}</p></div>
    </section>
    <section class="lesson-card">
      <div class="lesson-meta"><span class="pill">今日课程</span><span class="pill">约 8 分钟</span><span class="pill">6 个环节</span></div>
      <h2>${done ? "今天的课程完成啦！" : lesson.title}</h2>
      <p>${done ? `答对 ${done.correct} 题，获得 ${done.stars} 颗星星。明天有新冒险！` : lesson.subtitle}</p>
      <div class="lesson-progress"><i style="width:${progress}%"></i></div>
      <button class="primary-btn" id="startLesson">${done ? "再玩一次 ↻" : draft ? "继续小冒险 →" : "出发去冒险 →"}</button>
    </section>
    <div class="section-heading"><h2>本周打卡</h2><span>${finished} 节课已完成</span></div>
    <div class="week-strip">${renderWeek()}</div>
    ${nav("home")}`;
  document.querySelector("#startLesson").addEventListener("click", () => startLesson(Boolean(done)));
  bindNavigation();
}

function renderOnboarding() {
  app.innerHTML = `<main class="onboarding">
    <div class="onboarding-art">🌱</div>
    <h1>欢迎来到元宝乐园</h1>
    <p>每天一节数学 + 英语互动课<br>专为 3–6 岁宝宝设计</p>
    <form class="form-card" id="profileForm">
      <label class="field">宝宝的小名
        <input id="childName" maxlength="8" placeholder="例如：元宝" autocomplete="off" required>
      </label>
      <strong>宝宝几岁啦？</strong>
      <div class="age-picker" role="group" aria-label="选择宝宝年龄">
        ${[3,4,5,6].map(age => `<button type="button" data-age="${age}" class="${age === state.selectedAge ? "active" : ""}">${age} 岁</button>`).join("")}
      </div>
      <button class="primary-btn green" type="submit">一起出发吧 →</button>
    </form>
  </main>`;
  document.querySelectorAll("[data-age]").forEach(button => button.addEventListener("click", () => {
    state.selectedAge = Number(button.dataset.age);
    document.querySelectorAll("[data-age]").forEach(item => item.classList.toggle("active", item === button));
  }));
  document.querySelector("#profileForm").addEventListener("submit", async event => {
    event.preventDefault();
    const name = document.querySelector("#childName").value.trim();
    if (!name) return;
    state.profile = { id: "main", name, age: state.selectedAge, startedAt: localDate(), createdAt: new Date().toISOString() };
    await saveProfile(state.profile);
    state.view = "home";
    render();
    toast(`欢迎你，${name}！`);
  });
}

async function startLesson(restart = false) {
  const lesson = makeLesson(dayNumber(), state.profile.age);
  const draft = restart ? null : todayDraft();
  state.lesson = lesson;
  state.isReview = restart;
  state.activityIndex = draft?.activityIndex || 0;
  state.answers = draft?.answers || [];
  state.feedback = null;
  state.view = "lesson";
  render();
}

function promptVisual(activity) {
  if (activity.learn) {
    return `<div><div class="emoji-group">${activity.visual}</div><div class="big-word">${activity.word.en}</div><div class="word-meaning">${activity.word.cn}</div>
      <button class="listen-btn" data-speak="${activity.word.en}">🔊 听发音</button></div>`;
  }
  if (activity.subject === "english" && activity.visual === "🔊") {
    return `<div><div class="emoji-group">🎧</div><button class="listen-btn" data-speak="${activity.word.en}">🔊 再听一遍</button></div>`;
  }
  return `<div class="emoji-group">${activity.visual}</div>`;
}

function renderAnswers(activity) {
  if (activity.pictureOptions) {
    return activity.pictureOptions.map(option => `<button class="answer" data-answer="${option.en}" aria-label="${option.cn}">${option.emoji}<br><small>${option.cn}</small></button>`).join("");
  }
  return activity.options.map(option => `<button class="answer" data-answer="${option}">${option}</button>`).join("");
}

function renderLesson() {
  const activity = state.lesson.activities[state.activityIndex];
  const percent = Math.round(state.activityIndex / state.lesson.activities.length * 100);
  app.innerHTML = `<header class="lesson-top">
    <button class="icon-btn" id="exitLesson" aria-label="退出课程">‹</button>
    <div class="step-progress"><i style="width:${percent}%"></i></div>
    <div class="step-count">${state.activityIndex + 1}/6</div>
  </header>
  <main class="activity">
    <span class="subject-tag ${activity.subject}">${activity.subject === "math" ? "🔢 数学时间" : "🔤 English time"}</span>
    <h1>${activity.title}</h1>
    <p class="instruction">${activity.hint}</p>
    <section class="prompt-card">${promptVisual(activity)}</section>
    <div class="answers">${renderAnswers(activity)}</div>
  </main>`;
  document.querySelector("#exitLesson").addEventListener("click", exitLesson);
  document.querySelectorAll("[data-speak]").forEach(button => button.addEventListener("click", () => speak(button.dataset.speak)));
  document.querySelectorAll(".answer").forEach(button => button.addEventListener("click", () => answerQuestion(button, activity)));
  if (activity.subject === "english" && activity.visual === "🔊") setTimeout(() => speak(activity.word.en), 250);
}

async function answerQuestion(button, activity) {
  if (state.feedback) return;
  const chosen = button.dataset.answer;
  const correct = chosen.toLowerCase() === String(activity.answer).toLowerCase();
  document.querySelectorAll(".answer").forEach(item => {
    item.disabled = true;
    if (item.dataset.answer.toLowerCase() === String(activity.answer).toLowerCase()) item.classList.add("correct");
  });
  if (!correct) button.classList.add("wrong");
  state.answers[state.activityIndex] = { subject: activity.subject, correct, chosen, answer: activity.answer };
  state.feedback = { correct, answer: activity.answer };
  if (!state.isReview) {
    await saveRecord({
      date: localDate(), day: state.lesson.day, completed: false,
      activityIndex: state.activityIndex + 1, answers: state.answers,
      updatedAt: new Date().toISOString()
    });
  }
  const sheet = document.createElement("div");
  sheet.className = "feedback-sheet";
  sheet.innerHTML = `<div class="feedback-inner">
    <div class="feedback-face">${correct ? "🌟" : "💪"}</div>
    <div class="feedback-copy"><strong>${correct ? "答对啦，真棒！" : "差一点，也很棒！"}</strong><span>${correct ? "你的小脑袋又变聪明了一点" : `正确答案是 ${activity.answer}`}</span></div>
    <button class="primary-btn green" id="nextActivity">${state.activityIndex === 5 ? "完成" : "继续 →"}</button>
  </div>`;
  document.body.appendChild(sheet);
  document.querySelector("#nextActivity").addEventListener("click", nextActivity);
}

async function nextActivity() {
  document.querySelector(".feedback-sheet")?.remove();
  state.feedback = null;
  state.activityIndex++;
  if (state.activityIndex >= state.lesson.activities.length) {
    const correct = state.answers.filter(answer => answer.correct).length;
    const record = {
      date: localDate(), day: state.lesson.day, completed: true, correct,
      total: 6, stars: Math.max(1, Math.round(correct / 2)),
      answers: state.answers, completedAt: new Date().toISOString()
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

function renderComplete() {
  const correct = state.answers.filter(answer => answer.correct).length;
  app.innerHTML = `<main class="celebrate">
    <p class="eyebrow">今日课程完成</p>
    <div class="medal">🏅</div>
    <h1>${state.profile.name}，太棒啦！</h1>
    <p>数学和英语能量都收集完成<br>明天记得回来解锁新课程哦</p>
    <div class="result-grid">
      <div class="result"><b>${correct}/6</b><span>答对题目</span></div>
      <div class="result"><b>${Math.max(1, Math.round(correct / 2))} ⭐</b><span>获得星星</span></div>
      <div class="result"><b>${streak()} 天</b><span>连续学习</span></div>
    </div>
    <button class="primary-btn green" id="backHome">回到首页</button>
  </main>`;
  document.querySelector("#backHome").addEventListener("click", () => { state.view = "home"; render(); });
}

function renderProgress() {
  const completed = state.records.filter(item => item.completed).sort((a, b) => b.date.localeCompare(a.date));
  const allAnswers = completed.flatMap(item => item.answers || []);
  const math = allAnswers.filter(item => item.subject === "math");
  const english = allAnswers.filter(item => item.subject === "english");
  const accuracy = list => list.length ? Math.round(list.filter(item => item.correct).length / list.length * 100) : 0;
  const totalStars = completed.reduce((sum, item) => sum + (item.stars || 0), 0);
  app.innerHTML = `${topbar()}
    <p class="eyebrow">成长中心</p>
    <h1 class="page-title">${state.profile.name} 的成长足迹</h1>
    <p class="page-subtitle">每一次尝试都值得被看见。</p>
    <section class="stats-grid">
      <div class="stat-card"><i>📚</i><b>${completed.length}</b><span>完成课程</span></div>
      <div class="stat-card"><i>⭐</i><b>${totalStars}</b><span>收集星星</span></div>
      <div class="stat-card"><i>🔥</i><b>${streak()}</b><span>连续天数</span></div>
    </section>
    <div class="section-heading"><h2>能力成长</h2><span>按答题正确率</span></div>
    <section class="subject-progress">
      <div class="bar-row"><header><span>🔢 数学数感</span><span>${accuracy(math)}%</span></header><div class="bar"><i style="width:${accuracy(math)}%;background:var(--orange)"></i></div></div>
      <div class="bar-row"><header><span>🔤 英语启蒙</span><span>${accuracy(english)}%</span></header><div class="bar"><i style="width:${accuracy(english)}%;background:var(--blue)"></i></div></div>
    </section>
    <div class="section-heading"><h2>课程记录</h2><span>最近 10 节</span></div>
    <section class="history-list">${completed.length ? completed.slice(0, 10).map(record => {
      const lesson = makeLesson(record.day || 1, state.profile.age);
      return `<article class="history-item"><div class="history-icon">✓</div><div class="history-copy"><strong>第 ${record.day || 1} 课 · ${lesson.title}</strong><small>${record.date} · 数学 + 英语</small></div><div class="history-score">${record.correct}/6</div></article>`;
    }).join("") : `<div class="empty">完成今天的课程后，成长记录会出现在这里 🌱</div>`}</section>
    ${nav("progress")}`;
  bindNavigation();
}

function renderProfile() {
  app.innerHTML = `${topbar()}
    <p class="eyebrow">宝宝资料</p>
    <h1 class="page-title">学习设置</h1>
    <section class="profile-card">
      <div class="profile-hero"><div class="large-avatar">🐣</div><h2>${state.profile.name}</h2><p>${state.profile.age} 岁 · 已学习 ${dayNumber()} 天</p></div>
      <div class="section-heading"><h2>课程信息</h2></div>
      <div class="setting-row"><div><strong>每日课程</strong><br><span>数学 3 题 + 英语 3 题</span></div><b>约 8 分钟</b></div>
      <div class="setting-row"><div><strong>课程难度</strong><br><span>依据年龄自动调整</span></div><b>${state.profile.age} 岁阶段</b></div>
      <div class="setting-row"><div><strong>数据保存</strong><br><span>安全保存在应用服务</span></div><b>已开启</b></div>
      <button class="secondary-btn" id="editProfile">修改宝宝资料</button>
      <button class="danger-btn" id="resetData">清除全部学习数据</button>
    </section>
    ${nav("profile")}`;
  document.querySelector("#editProfile").addEventListener("click", editProfile);
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
  render();
  toast("宝宝资料已更新");
}

async function resetData() {
  if (!confirm("确定清除宝宝资料和全部学习记录吗？此操作无法撤销。")) return;
  await api("/api/state", { method: "DELETE" });
  if ("indexedDB" in window) indexedDB.deleteDatabase(DB_NAME);
  location.reload();
}

function bindNavigation() {
  document.querySelectorAll("[data-nav]").forEach(button => button.addEventListener("click", () => {
    state.view = button.dataset.nav;
    window.scrollTo({ top: 0, behavior: "smooth" });
    render();
  }));
}

function toast(message) {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2200);
}

function render() {
  if (!state.profile) return renderOnboarding();
  if (state.view === "lesson") return renderLesson();
  if (state.view === "complete") return renderComplete();
  if (state.view === "progress") return renderProgress();
  if (state.view === "profile") return renderProfile();
  renderHome();
}

async function init() {
  try {
    let saved = await api("/api/state");
    if (!saved.profile) saved = await migrateLegacyState();
    state.profile = saved.profile;
    state.records = saved.records;
    if (state.profile) state.selectedAge = state.profile.age;
    render();
  } catch (error) {
    console.error(error);
    app.innerHTML = `<main class="onboarding"><div class="onboarding-art">🛠️</div><h1>暂时无法打开</h1><p>请关闭浏览器的无痕模式，或检查是否允许网站保存数据后重试。</p><button class="primary-btn green" onclick="location.reload()">重新加载</button></main>`;
  }
}

init();
