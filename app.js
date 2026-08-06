"use strict";

// ======================== Constants ========================
const DB_NAME = "yuanbao-learning";
const DAY_MS = 86400000;

const SUBJECT_META = {
  math:    { label: "数学", emoji: "🔢", color: "var(--orange)",   soft: "var(--orange-soft)", desc: "数感训练" },
  physics: { label: "物理", emoji: "⚡", color: "var(--purple)",   soft: "#f3edff",           desc: "物理启蒙" },
  english: { label: "英语", emoji: "🔤", color: "var(--blue)",     soft: "var(--blue-soft)",  desc: "英语启蒙" }
};

const SUCCESS_SOUNDS = [
  { name: "火车", emoji: "🚂", cheer: "呜——呜——！火车带着小星星进站啦！", sound: "train" },
  { name: "消防车", emoji: "🚒", cheer: "呜啦呜啦！消防车送来勇敢奖励！", sound: "firetruck" },
  { name: "警车", emoji: "🚓", cheer: "哔啵哔啵！警车为你亮起胜利灯！", sound: "police" },
  { name: "校车", emoji: "🚌", cheer: "嘟嘟！校车载着你的星星出发喽！", sound: "bus" }
];

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

// ======================== 情绪分区 ========================
const EMOTION_ZONES = [
  { id: "blue",  emoji: "😴", label: "蓝区", name: "有点累",   desc: "疲倦、无聊、没精神",        suggestion: "先活动一下，跳一跳再开始学习吧！", color: "var(--blue)" },
  { id: "green", emoji: "😊", label: "绿区", name: "很开心",   desc: "平静、专注、开心",          suggestion: "状态很好，开始学习吧！",           color: "var(--green)" },
  { id: "yellow",emoji: "😰", label: "黄区", name: "有点紧张", desc: "兴奋、焦虑、担心",          suggestion: "深呼吸三次，慢慢来~",               color: "var(--yellow)" },
  { id: "red",   emoji: "😤", label: "红区", name: "很生气",   desc: "愤怒、害怕、想发脾气",      suggestion: "先喝口水，抱抱小玩偶休息一下",      color: "#e88070" }
];

const EMOTION_GAME_QUESTIONS = [
  { emoji: "😊", answer: "开心", options: ["开心", "伤心", "生气", "害怕"] },
  { emoji: "😢", answer: "伤心", options: ["开心", "伤心", "惊讶", "生气"] },
  { emoji: "😤", answer: "生气", options: ["害怕", "开心", "生气", "无聊"] },
  { emoji: "😨", answer: "害怕", options: ["开心", "生气", "害怕", "惊讶"] },
  { emoji: "😮", answer: "惊讶", options: ["生气", "害怕", "无聊", "惊讶"] },
  { emoji: "🥱", answer: "无聊", options: ["伤心", "无聊", "生气", "害怕"] },
  { emoji: "😌", answer: "平静", options: ["生气", "平静", "害怕", "开心"] },
  { emoji: "😅", answer: "尴尬", options: ["开心", "害怕", "尴尬", "生气"] }
];

// ======================== 情绪调节策略 ========================
const EMOTION_STRATEGIES = {
  blue: [
    { id: "jump", name: "跳跃运动", emoji: "🏃", desc: "站起来跳一跳，让身体热起来！", animation: "jump" },
    { id: "stretch", name: "拉伸", emoji: "🤸", desc: "伸个懒腰，像小树一样长高！", animation: "stretch" },
    { id: "music", name: "听音乐", emoji: "🎵", desc: "听一首喜欢的歌，心情会变好哦", animation: "music" }
  ],
  green: [
    { id: "breathe", name: "深呼吸", emoji: "🌬️", desc: "慢慢吸气、呼气，像吹气球一样", animation: "breathe" },
    { id: "count", name: "数数", emoji: "🔢", desc: "从1数到10，一个一个慢慢数", animation: "count" },
    { id: "mindful", name: "正念观察", emoji: "👀", desc: "找一找周围5样东西，说说它们是什么颜色", animation: "mindful" }
  ],
  yellow: [
    { id: "balloon", name: "吹气球呼吸", emoji: "🎈", desc: "想象在吹一个大大的气球，慢慢吹~", animation: "balloon" },
    { id: "count10", name: "数到10", emoji: "🔟", desc: "在心里慢慢数到10，让自己冷静下来", animation: "count10" },
    { id: "quiet", name: "找安静角落", emoji: "🏠", desc: "找一个安静的地方，待一会儿", animation: "quiet" }
  ],
  red: [
    { id: "water", name: "喝水", emoji: "💧", desc: "喝一口凉凉的水，让身体舒服一点", animation: "water" },
    { id: "hug", name: "抱玩偶", emoji: "🧸", desc: "抱抱你的小玩偶，感觉暖和多了", animation: "hug" },
    { id: "butterfly", name: "蝴蝶拥抱", emoji: "🦋", desc: "双手交叉抱肩膀，轻轻拍一拍，像蝴蝶翅膀", animation: "butterfly" }
  ]
};

// ======================== 策略互动配置 ========================
const STRATEGY_INTERACTIONS = {
  jump:     { pattern: "tap",   maxProgress: 10, emojis: ["🏃","💨","⬆️","⭐","🌟"], hint: "点一点，让小人在你指尖跳跃！跳够 10 下就完成啦" },
  stretch:  { pattern: "tap",   maxProgress: 5,  emojis: ["🤸","🌱","📏","☀️","🌈"], hint: "点一点，帮助小树越长越高！伸 5 次懒腰就完成啦" },
  music:    { pattern: "tap",   maxProgress: 5,  emojis: ["🎵","🎶","🎼","🎹","🎤"], hint: "点一点，弹奏出美妙的音符！听完 5 个音符就完成啦" },
  breathe:  { pattern: "balloon", maxProgress: 5, emojis: ["🎈","💨","🌬️","💭","✨"], hint: "点一点吹气球，慢慢吸气再呼气，气球会越来越大" },
  count:    { pattern: "tap",   maxProgress: 10, emojis: ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"], hint: "从 1 数到 10，一个一个点过来" },
  mindful:  { pattern: "find",  maxProgress: 5,  emojis: ["👀","🌈","🎨","🔍","✨"], hint: "找到所有隐藏的东西，点它们！" },
  balloon:  { pattern: "balloon", maxProgress: 5, emojis: ["🎈","💨","🌬️","💭","✨"], hint: "点一下吹一口气，把气球吹大！" },
  count10:  { pattern: "tap",   maxProgress: 10, emojis: ["🔟","9️⃣","8️⃣","7️⃣","6️⃣","5️⃣","4️⃣","3️⃣","2️⃣","1️⃣"], hint: "从 10 数到 1，一个一个点过来" },
  quiet:    { pattern: "calm",  maxProgress: 5,  emojis: ["🌙","⭐","✨","🌌","💫"], hint: "点一点夜空，放一颗星星，让心情平静下来" },
  water:    { pattern: "tap",   maxProgress: 5,  emojis: ["💧","🚰","🥤","💦","🌊"], hint: "点一点喝口水，让身体舒服起来！喝 5 口就完成啦" },
  hug:      { pattern: "tap",   maxProgress: 5,  emojis: ["🧸","❤️","🤗","💕","🌺"], hint: "点一点抱抱小玩偶，感受温暖！抱 5 次就完成啦" },
  butterfly:{ pattern: "tap",   maxProgress: 8,  emojis: ["🦋","💫","🌸","🌼","🌺","🦋","✨","🌈"], hint: "点一点，让蝴蝶翅膀轻轻拍动！拍 8 下就完成啦" }
};

const STRATEGY_ENCOURAGEMENTS = [
  "太棒啦！你做到了！🌟",
  "真厉害，继续加油！💪",
  "做得真好，为你骄傲！🎉",
  "好样的！你越来越棒了！✨",
  "太厉害了，宝宝真聪明！🌈",
  "完美！你真是个小勇士！🏆",
  "真了不起，坚持就是胜利！⭐",
  "哇，你完成得真棒！🎊"
];

// ======================== API Helpers ========================
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
  return record;
}

// ======================== Date Helpers ========================
function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function todayDayOfWeek() {
  return new Date().getDay();
}

// ======================== Subject Module Helpers ========================
function loadSubjectModule(subject) {
  if (subject === "math") return window.MathModule;
  if (subject === "physics") return window.PhysicsModule;
  if (subject === "english") return window.EnglishModule;
  return null;
}

function makeSubjectLesson(subject, day, age) {
  const mod = loadSubjectModule(subject);
  if (mod) return mod.generateLesson(day, age);
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

// ======================== Progress Helpers ========================
function computeSubjectDays(records, startedAt) {
  if (!startedAt) return { math: 1, physics: 1, english: 1 };
  const start = dateFromKey(startedAt);
  const today = dateFromKey(localDate());
  const totalDays = Math.max(1, Math.floor((today - start) / DAY_MS) + 1);
  const counts = {};
  for (const subj of ["math", "physics", "english"]) {
    const completed = records.filter(r => r.subject === subj && r.completed).length;
    counts[subj] = Math.max(1, completed + 1);
  }
  return counts;
}

function completedTodaySubject(records, subject) {
  return records.find(r => r.date === localDate() && r.subject === subject && r.completed);
}

function todayDraftSubject(records, subject) {
  return records.find(r => r.date === localDate() && r.subject === subject && !r.completed);
}

function streak(records) {
  const completeDates = new Set(records.filter(r => r.completed).map(r => r.date));
  let cursor = new Date();
  if (!completeDates.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (completeDates.has(localDate(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function getTodaySubjects(schedule) {
  const dow = String(todayDayOfWeek());
  return (schedule || {})[dow] || [];
}

// ======================== Audio ========================
let feedbackAudioContext;
let feedbackMasterGain;

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
    feedbackMasterGain ||= context.createGain();
    feedbackMasterGain.gain.value = .72;
    feedbackMasterGain.connect(context.destination);
    if (context.state === "suspended") context.resume().catch(() => {});

    // 答错鼓励音效：柔和的上行琶音
    if (type === "wrong") {
      [261.63, 329.63, 392.00].forEach((freq, i) => {
        const t = start + i * 0.12;
        const osc = context.createOscillator();
        const g = context.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.06, t + 0.02);
        g.gain.exponentialRampToValueAtTime(.0001, t + 0.18);
        osc.connect(g).connect(feedbackMasterGain);
        osc.start(t);
        osc.stop(t + 0.2);
      });
      return;
    }

    const celebration = type === "complete";
    const notes = celebration ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
    const duration = celebration ? .26 : .16;
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

// ======================== Celebration Effects ========================
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

// ======================== Vue 3 App ========================
const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

const app = createApp({
  setup() {
    // ---- Reactive State ----
    const view = ref("login");
    const accountId = ref(null);
    const profile = ref(null);
    const records = ref([]);
    const schedule = ref({});
    const selectedAge = ref(4);
    const selectedSubject = ref(null);
    const lesson = ref(null);
    const activityIndex = ref(0);
    const answers = ref([]);
    const feedback = ref(null);
    const isReview = ref(false);
    const completionCelebrated = ref(false);
    const toastMessage = ref("");
    const toastVisible = ref(false);
    const answerDisabled = ref(false);
    const answerChosen = ref(null);
    const answerCorrect = ref(null);
    // 课表编辑对话框
    const editDialog = reactive({ show: false, dow: 0, selected: [] });
    // 加载状态
    const loading = ref(false);
    // 情绪分区自评
    const emotionCheckins = ref([]);
    const showEmotionCheckin = ref(false);
    const selectedZone = ref(null);
    const emotionCheckinDone = ref(false);
    // 情绪识别游戏
    const emotionGames = ref([]);
    const emotionGameView = ref("start"); // start | playing | result
    const emotionGameIndex = ref(0);
    const emotionGameAnswers = ref([]);
    const emotionGameScore = ref(0);
    // 情绪调节策略
    const strategyRecords = ref([]);
    const strategyAnimating = ref(null);
    const strategyUsed = ref([]);
    // 沟通日志
    const communicationLogs = ref([]);
    const communicationLogTab = ref("form"); // form | history
    const communicationForm = reactive({
      vocabulary: 0,
      sentence1: '',
      sentence2: '',
      sentence3: '',
      conversationTurns: 0,
      narrativeScore: 3,
      initiativeScore: 3
    });
    // 策略互动详情
    const strategyDetail = reactive({
      show: false,
      strategy: null,
      zone: null,
      pattern: 'tap',
      progress: 0,
      maxProgress: 10,
      step: 0
    });
    const strategyTapAnimate = ref(false);
    const strategyTimerStart = ref(null);
    const strategyTimerElapsed = ref(0);
    let strategyTimerInterval = null;
    const strategyCompleted = ref(false);
    const strategyFindObjects = ref([]);
    const strategyCalmStars = ref([]);
    const strategyTapEmoji = ref('');
    // 专注力计时器
    const focusElapsed = ref(0);
    let focusTimerInterval = null;
    // 成长页面 Tab 切换
    const progressTab = ref("overview"); // overview | weekly
    // 表单
    const authError = ref("");
    const loginUsername = ref("");
    const loginPassword = ref("");
    const regUsername = ref("");
    const regPassword = ref("");
    const regChildName = ref("元宝");
    const showEditProfile = ref(false);
    const editName = ref("");
    const editAge = ref(4);

    // ---- Computed ----
    const streakCount = computed(() => streak(records.value));
    const todaySubjects = computed(() => getTodaySubjects(schedule.value));
    const subjectLessonDays = computed(() => computeSubjectDays(records.value, profile.value?.startedAt));
    const currentActivity = computed(() => {
      if (!lesson.value?.activities) return null;
      return lesson.value.activities[activityIndex.value] || null;
    });
    const isLoggedIn = computed(() => !!profile.value);
    const totalActivities = computed(() => lesson.value?.activities?.length || 0);
    const progressPercent = computed(() => {
      if (!totalActivities.value) return 0;
      return Math.round(activityIndex.value / totalActivities.value * 100);
    });
    const subjectMeta = computed(() => selectedSubject.value ? SUBJECT_META[selectedSubject.value] : null);
    const feedbackCss = computed(() => {
      if (!feedback.value) return "";
      return feedback.value.correct ? "feedback-correct" : "feedback-wrong";
    });
    const navItems = computed(() => [
      { id: "home",   icon: "🏡", label: "今日" },
      { id: "schedule", icon: "📅", label: "课表" },
      { id: "progress", icon: "🌈", label: "成长" },
      { id: "profile", icon: "🐣", label: "我的" }
    ]);

    // ---- 周报工具函数 ----
    function getWeekRange(date) {
      // 返回 date 所在周的周一和周日
      const d = new Date(date);
      const day = d.getDay(); // 0=周日
      const diff = (day === 0 ? 6 : day - 1); // 到周一的天数差
      const monday = new Date(d);
      monday.setDate(d.getDate() - diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { monday, sunday };
    }

    function formatWeekLabel(monday, sunday) {
      const m = (monday.getMonth() + 1) + '/' + monday.getDate();
      const s = (sunday.getMonth() + 1) + '/' + sunday.getDate();
      return m + '-' + s;
    }

    function getPastWeeks(count) {
      const today = new Date();
      const weeks = [];
      // 从今天所在的周开始，往前推 count 周
      let cursor = new Date(today);
      for (let i = 0; i < count; i++) {
        const { monday, sunday } = getWeekRange(cursor);
        weeks.push({
          monday: new Date(monday),
          sunday: new Date(sunday),
          label: formatWeekLabel(monday, sunday)
        });
        // 上周一
        cursor.setDate(monday.getDate() - 7);
      }
      return weeks;
    }

    function isDateInRange(dateStr, start, end) {
      const d = new Date(dateStr);
      const s = new Date(start);
      const e = new Date(end);
      // 将时间设到 00:00 比较
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      d.setHours(0, 0, 0, 0);
      return d >= s && d <= e;
    }

    // ---- 周报计算 ----
    const weeklyReport = computed(() => {
      const weeks = getPastWeeks(4);
      const checkins = emotionCheckins.value || [];
      const games = emotionGames.value || [];
      const strategies = strategyRecords.value || [];

      let totalCheckinDays = 0;
      let totalGames = 0;
      let totalStrategyUsage = 0;
      let hasGameData = false;

      const weekData = weeks.map(week => {
        const { monday, sunday, label } = week;
        const mondayStr = localDate(monday);
        const sundayStr = localDate(sunday);

        // 该周的自评
        const weekCheckins = checkins.filter(c =>
          c.date >= mondayStr && c.date <= sundayStr
        );
        const zoneDays = {};
        for (const c of weekCheckins) {
          zoneDays[c.zone] = (zoneDays[c.zone] || 0) + 1;
        }
        const hasCheckin = weekCheckins.length > 0;
        if (hasCheckin) totalCheckinDays += weekCheckins.length;

        // 该周的游戏
        const weekGames = games.filter(g =>
          g.date >= mondayStr && g.date <= sundayStr
        );
        const gameAccuracy = weekGames.length
          ? Math.round(weekGames.reduce((s, g) => s + g.score, 0) / weekGames.reduce((s, g) => s + g.total, 0) * 100)
          : 0;
        const gameTotal = weekGames.reduce((s, g) => s + g.total, 0);
        const gameCorrect = weekGames.reduce((s, g) => s + g.score, 0);
        if (weekGames.length) {
          hasGameData = true;
          totalGames += weekGames.length;
        }

        // 该周的策略
        const weekStrategies = strategies.filter(s =>
          s.date >= mondayStr && s.date <= sundayStr
        );
        totalStrategyUsage += weekStrategies.length;

        const totalDays = 7;

        return {
          label,
          monday: mondayStr,
          sunday: sundayStr,
          totalDays,
          hasCheckin,
          zoneDays,
          checkinCount: weekCheckins.length,
          gameCount: weekGames.length,
          gameAccuracy,
          gameCorrect,
          gameTotal,
          strategyCount: weekStrategies.length
        };
      });

      // 策略排行
      const strategyCounts = {};
      for (const s of strategies) {
        const inRange = weeks.some(w => s.date >= w.monday && s.date <= w.sunday);
        if (inRange) {
          if (!strategyCounts[s.strategy]) {
            const meta = getStrategyById(s.zone, s.strategy);
            strategyCounts[s.strategy] = { id: s.strategy, zone: s.zone, count: 0, name: meta?.name || s.strategy, emoji: meta?.emoji || '🧘' };
          }
          strategyCounts[s.strategy].count++;
        }
      }
      const strategyRanking = Object.values(strategyCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        weeks: weekData,
        hasGameData,
        totalCheckinDays,
        totalGames,
        totalStrategyUsage,
        strategyRanking
      };
    });

    const weeklyReportTitle = computed(() => {
      const weeks = weeklyReport.value.weeks;
      if (!weeks.length) return '情绪发展周报';
      return weeks[0].label + ' 周报';
    });

    const weeklyReportSummary = computed(() => {
      const r = weeklyReport.value;
      if (!r.weeks.length || !r.totalCheckinDays) return '暂无足够数据生成评估小结。';

      const parts = [];
      // 情绪稳定性
      const allCheckins = emotionCheckins.value || [];
      const greenCount = allCheckins.filter(c => c.zone === 'green').length;
      const totalWithZone = allCheckins.filter(c => ['blue','green','yellow','red'].includes(c.zone)).length;
      const greenRatio = totalWithZone ? Math.round(greenCount / totalWithZone * 100) : 0;
      if (greenRatio >= 60) {
        parts.push('宝宝情绪状态总体稳定，绿区占比 ' + greenRatio + '%，处于积极健康的情绪状态。');
      } else if (greenRatio >= 40) {
        parts.push('宝宝情绪状态基本良好，绿区占比 ' + greenRatio + '%，建议在日常学习中多关注情绪波动。');
      } else {
        parts.push('宝宝近期情绪波动较多，绿区占比 ' + greenRatio + '%，建议增加情绪调节策略的引导和练习。');
      }

      // 游戏认知
      if (r.hasGameData) {
        const allGames = emotionGames.value || [];
        const totalCorrect = allGames.reduce((s, g) => s + g.score, 0);
        const totalQ = allGames.reduce((s, g) => s + g.total, 0);
        const overallAcc = totalQ ? Math.round(totalCorrect / totalQ * 100) : 0;
        if (overallAcc >= 80) {
          parts.push('情绪识别能力较强，整体正确率 ' + overallAcc + '%，宝宝能准确识别常见情绪表达。');
        } else if (overallAcc >= 60) {
          parts.push('情绪识别能力在发展中，整体正确率 ' + overallAcc + '%，可以通过更多游戏练习提升。');
        } else {
          parts.push('情绪识别仍需多加练习，整体正确率 ' + overallAcc + '%，建议家长在日常互动中多引导宝宝识别情绪。');
        }
      }

      // 策略使用
      if (r.totalStrategyUsage > 0) {
        if (r.strategyRanking.length) {
          const top = r.strategyRanking[0];
          parts.push('最常用的调节策略是「' + top.name + '」，共使用 ' + top.count + ' 次，说明宝宝对这种调节方式接受度较高。');
        }
        parts.push('累计尝试了 ' + r.totalStrategyUsage + ' 次情绪调节，持续练习有助于提升情绪管理能力。');
      } else {
        parts.push('还没有使用过情绪调节策略，建议在情绪自评后尝试推荐的调节方法。');
      }

      return parts.join(' ');
    });

    const weeklyGameChart = computed(() => {
      const r = weeklyReport.value;
      const width = 320;
      const height = 180;
      const padding = { top: 20, right: 10, bottom: 30, left: 40 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const visibleWeeks = r.weeks.filter(w => w.gameCount > 0 || r.weeks.indexOf(w) === 0);

      if (!visibleWeeks.length) return { points: [], width, height };

      // 如果没有数据，用占位点
      const points = visibleWeeks.map((week, i) => {
        const x = padding.left + (i / Math.max(visibleWeeks.length - 1, 1)) * chartW;
        const y = week.gameCount > 0
          ? padding.top + chartH - (week.gameAccuracy / 100 * chartH)
          : padding.top + chartH; // 底部
        return {
          x,
          y,
          label: week.gameCount > 0 ? week.gameAccuracy + '%' : '—',
          weekLabel: week.label
        };
      });

      return { points, width, height };
    });

    // ---- 成就徽章 ----
    const achievements = computed(() => {
      const list = [];
      const completed = records.value.filter(r => r.completed);
      const totalLessons = completed.length;
      const totalAnswers = completed.flatMap(r => r.answers || []);
      const totalCorrect = totalAnswers.filter(a => a.correct).length;
      const totalQuestions = totalAnswers.length;

      if (totalLessons >= 1) list.push({ id: "first", emoji: "🌟", label: "初次学习", desc: "完成第一节课", earned: true });
      if (totalLessons >= 10) list.push({ id: "ten", emoji: "📚", label: "小学霸", desc: "完成 10 节课", earned: true });
      if (totalLessons >= 50) list.push({ id: "fifty", emoji: "🏆", label: "学习达人", desc: "完成 50 节课", earned: true });
      if (streakCount.value >= 7) list.push({ id: "streak7", emoji: "🔥", label: "坚持一周", desc: "连续学习 7 天", earned: true });
      if (streakCount.value >= 30) list.push({ id: "streak30", emoji: "⭐", label: "月度之星", desc: "连续学习 30 天", earned: true });
      if (totalQuestions >= 10 && totalCorrect === totalQuestions) list.push({ id: "perfect", emoji: "💯", label: "完美起步", desc: "10 题全部答对", earned: true });
      if (totalQuestions >= 100) list.push({ id: "century", emoji: "🎯", label: "百题斩", desc: "累计完成 100 题", earned: true });
      if (totalQuestions >= 500) list.push({ id: "fivecentury", emoji: "👑", label: "答题王者", desc: "累计完成 500 题", earned: true });
      // 专注力徽章
      const focusMinutes = Math.floor(focusStats.value.totalDuration / 60);
      if (focusMinutes >= 5) list.push({ id: "focus5", emoji: "🧘", label: "专注起步", desc: "累计专注 5 分钟", earned: true });
      if (focusMinutes >= 30) list.push({ id: "focus30", emoji: "⏱️", label: "专注能手", desc: "累计专注 30 分钟", earned: true });
      if (focusMinutes >= 120) list.push({ id: "focus120", emoji: "🏅", label: "专注达人", desc: "累计专注 2 小时", earned: true });

      return list;
    });

    // ---- 错题本 ----
    const wrongAnswers = computed(() => {
      const wrong = [];
      const seen = new Set();
      for (const rec of records.value) {
        if (!rec.answers) continue;
        for (let i = 0; i < rec.answers.length; i++) {
          const a = rec.answers[i];
          if (!a || a.correct) continue;
          const key = rec.subject + ":" + (a.answer || "");
          if (seen.has(key)) continue;
          seen.add(key);
          wrong.push({ subject: rec.subject, date: rec.date, index: i, answer: a.answer, chosen: a.chosen, day: rec.day || 1 });
        }
      }
      return wrong.slice(0, 20);
    });

    // ---- Navigation ----
    function navigate(to) {
      view.value = to;
      if (to === "home") {
        // refresh subject lesson days
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ---- Toast ----
    let toastTimer = null;
    function showToast(message) {
      toastMessage.value = message;
      toastVisible.value = true;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastVisible.value = false; }, 2200);
    }

    // ---- Subject Lesson ----
    function startSubjectLesson(subject, restart = false) {
      const days = subjectLessonDays.value;
      const dayNum = days[subject] || 1;
      const l = makeSubjectLesson(subject, dayNum, profile.value?.age || 4);
      const draft = restart ? null : todayDraftSubject(records.value, subject);
      selectedSubject.value = subject;
      lesson.value = l;
      isReview.value = restart;
      activityIndex.value = draft?.activityIndex || 0;
      answers.value = draft?.answers || [];
      feedback.value = null;
      answerDisabled.value = false;
      answerChosen.value = null;
      answerCorrect.value = null;
      completionCelebrated.value = false;
      view.value = "lesson";
      startFocusTimer();
    }

    function exitLesson() {
      view.value = "home";
      feedback.value = null;
      answerDisabled.value = false;
      stopFocusTimer();
    }

    // ---- Answer ----
    async function answerQuestion(chosen) {
      if (feedback.value || answerDisabled.value) return;
      const activity = currentActivity.value;
      if (!activity) return;

      const correct = activity.learn ? true : chosen.toLowerCase() === String(activity.answer).toLowerCase();
      answerDisabled.value = true;
      answerChosen.value = chosen;
      answerCorrect.value = correct;

      const arr = [...answers.value];
      arr[activityIndex.value] = { subject: selectedSubject.value, correct, chosen, answer: activity.answer };
      answers.value = arr;
      feedback.value = { correct, answer: activity.answer, chosen };

      // 视觉反馈
      if (correct) {
        const sound = SUCCESS_SOUNDS[Math.floor(Math.random() * SUCCESS_SOUNDS.length)];
        feedback.value = { correct, answer: activity.answer, chosen, sound };
        await nextTick();
        const prompt = document.querySelector(".prompt-card");
        prompt?.classList.add("prompt-celebrate");
        celebrateWithParticles("correct", 30, sound);
        showSuccessBadge(sound);
        playFeedbackSound("correct", sound.sound);
        if (navigator.vibrate) navigator.vibrate(35);
      } else {
        feedback.value = { correct, answer: activity.answer, chosen };
        await nextTick();
        const prompt = document.querySelector(".prompt-card");
        prompt?.classList.add("prompt-try-again");
        playFeedbackSound("wrong");
      }

      // 保存进度
      if (!isReview.value) {
        try {
          await saveRecord({
            date: localDate(),
            subject: selectedSubject.value,
            day: lesson.value?.day || 1,
            completed: false,
            activityIndex: activityIndex.value + 1,
            answers: answers.value,
            total: lesson.value?.activities?.length || answers.value.length,
            updatedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error(error);
          showToast("学习进度暂未保存，请稍后重试");
        }
      }
    }

    async function nextActivity() {
      feedback.value = null;
      answerDisabled.value = false;
      answerChosen.value = null;
      answerCorrect.value = null;
      activityIndex.value++;
      const l = lesson.value;
      if (!l || activityIndex.value >= l.activities.length) {
        stopFocusTimer();
        const correct = answers.value.filter(a => a?.correct).length;
        const total = l?.activities?.length || answers.value.length;
        const record = {
          date: localDate(),
          subject: selectedSubject.value,
          day: l?.day || 1,
          completed: true,
          correct,
          total,
          stars: Math.max(1, Math.round(correct / 2)),
          answers: answers.value,
          completedAt: new Date().toISOString(),
          duration: focusElapsed.value
        };
        if (!isReview.value) {
          try {
            const saved = await saveRecord(record);
            const idx = records.value.findIndex(r => r.date === saved.date && r.subject === saved.subject);
            if (idx === -1) records.value.push(saved);
            else records.value[idx] = saved;
          } catch (e) { console.error(e); }
        }
        view.value = "complete";
      }
    }

    // ---- Auth ----
    async function handleLogin(username, password) {
      loading.value = true;
      authError.value = "";
      try {
        const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
        accountId.value = result.accountId;
        await loadUserState();
        showToast("欢迎回来，" + profile.value?.name + "！");
      } catch (err) {
        authError.value = err.message;
      } finally {
        loading.value = false;
      }
    }

    async function handleRegister(username, password, childName, childAge) {
      loading.value = true;
      authError.value = "";
      try {
        const result = await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ username, password, childName, childAge })
        });
        accountId.value = result.accountId;
        profile.value = result.profile;
        records.value = [];
        schedule.value = {};
        view.value = "home";
        showToast("欢迎你，" + result.profile.name + "！");
      } catch (err) {
        authError.value = err.message;
      } finally {
        loading.value = false;
      }
    }

    async function loadUserState() {
      try {
        const saved = await api("/api/state");
        profile.value = saved.profile;
        records.value = saved.records || [];
        schedule.value = saved.schedule || {};
        view.value = "home";
        selectedAge.value = saved.profile?.age || 4;
        communicationLogs.value = saved.communicationLogs || [];
      } catch (err) {
        if (err.message.includes("401")) {
          view.value = "login";
        }
      }
    }

    async function logout() {
      if (!confirm("确定退出登录吗？")) return;
      try {
        await api("/api/auth/logout", { method: "POST" });
      } catch (e) { /* ignore */ }
      accountId.value = null;
      profile.value = null;
      records.value = [];
      schedule.value = {};
      view.value = "login";
    }

    // ---- Profile ----
    async function editProfile(name, age) {
      if (!name?.trim() || ![3, 4, 5, 6].includes(age)) {
        showToast("请填写有效的小名和年龄（3–6 岁）");
        return;
      }
      const updated = { ...profile.value, name: name.trim().slice(0, 8), age };
      profile.value = updated;
      await saveProfile(updated);
      selectedAge.value = age;
      showToast("宝宝资料已更新");
    }

    async function resetData() {
      if (!confirm("确定清除宝宝资料和全部学习记录吗？此操作无法撤销。")) return;
      await api("/api/state", { method: "DELETE" });
      if ("indexedDB" in window) indexedDB.deleteDatabase(DB_NAME);
      records.value = [];
      view.value = "home";
      showToast("学习数据已清除");
    }

    async function exportData() {
      try {
        const resp = await fetch("/api/export/html");
        if (!resp.ok) throw new Error("导出失败");
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "yuanbao-report-" + (profile.value?.name || "宝宝") + ".html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("学习报告已下载");
      } catch (err) {
        showToast(err.message);
      }
    }

    async function exportWorksheets() {
      try {
        const resp = await fetch("/api/export/worksheets");
        if (!resp.ok) throw new Error("导出失败");
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "yuanbao-worksheets-" + (profile.value?.name || "宝宝") + ".html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("练习册已下载");
      } catch (err) {
        showToast(err.message);
      }
    }

    // ---- Schedule ----
    function openEditDialog(dow) {
      editDialog.show = true;
      editDialog.dow = dow;
      editDialog.selected = [...((schedule.value[String(dow)] || []))];
    }

    function closeEditDialog() {
      editDialog.show = false;
    }

    function toggleEditSubject(subj) {
      const idx = editDialog.selected.indexOf(subj);
      if (idx === -1) editDialog.selected.push(subj);
      else editDialog.selected.splice(idx, 1);
    }

    async function saveEditDialog() {
      const newSchedule = { ...schedule.value };
      newSchedule[String(editDialog.dow)] = [...editDialog.selected];
      try {
        await api("/api/schedule", { method: "PUT", body: JSON.stringify(newSchedule) });
        schedule.value = newSchedule;
        closeEditDialog();
        showToast(WEEKDAY_NAMES[editDialog.dow] + "课表已更新");
      } catch (err) {
        showToast(err.message);
      }
    }

    async function resetSchedule() {
      if (!confirm("确定恢复默认课表吗？")) return;
      try {
        const defaultSchedule = {
          0: [], 1: ["math", "english"], 2: ["physics", "math"],
          3: ["english", "physics"], 4: ["math", "english"],
          5: ["physics", "math"], 6: ["english"]
        };
        await api("/api/schedule", { method: "PUT", body: JSON.stringify(defaultSchedule) });
        schedule.value = defaultSchedule;
        showToast("课表已恢复默认");
      } catch (err) {
        showToast(err.message);
      }
    }

    // ---- Week ----
    function weekDays() {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 3);
      const complete = new Set(records.value.filter(r => r.completed).map(r => r.date));
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = localDate(date);
        const isDone = complete.has(key);
        const isToday = key === localDate();
        return { date, key, isDone, isToday, dayName: "日一二三四五六"[date.getDay()], dayNum: date.getDate() };
      });
    }

    // ---- Subject Stats ----
    function subjectStats(subj) {
      const completed = records.value.filter(r => r.subject === subj && r.completed);
      const answers = completed.flatMap(r => r.answers || []);
      const acc = answers.length ? Math.round(answers.filter(a => a.correct).length / answers.length * 100) : 0;
      return { count: completed.length, accuracy: acc, stars: completed.reduce((s, r) => s + (r.stars || 0), 0) };
    }

    // ---- History ----
    function historyItems() {
      return records.value
        .filter(r => r.completed)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10);
    }

    // ---- Speak ----
    function speak(word) {
      if (!("speechSynthesis" in window)) return showToast("当前浏览器暂不支持语音");
      speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(word);
      speech.lang = "en-US";
      speech.rate = .72;
      speech.pitch = 1.08;
      speechSynthesis.speak(speech);
    }

    // ---- Answer helpers ----
    function answerClass(opt) {
      const correctAnswer = String(currentActivity.value?.answer ?? "");
      return {
        correct: answerDisabled.value && opt.toLowerCase() === correctAnswer.toLowerCase(),
        wrong: answerChosen.value === opt && !answerCorrect.value
      };
    }

    function picAnswerClass(opt) {
      const val = typeof opt === "object" ? opt.en : opt;
      const correctAnswer = String(currentActivity.value?.answer ?? "");
      return {
        correct: answerDisabled.value && val.toLowerCase() === correctAnswer.toLowerCase(),
        wrong: answerChosen.value === val && !answerCorrect.value
      };
    }

    function picAnswerValue(opt) {
      return typeof opt === "object" ? opt.en : opt;
    }

    function picAnswerLabel(opt) {
      if (typeof opt === "string") return opt;
      const label = opt.cn || opt.en || "";
      return (opt.emoji || "") + (label ? " " + label : "");
    }

    // ---- Complete page helpers ----
    function remainingSubjects() {
      return todaySubjects.value.filter(s => s !== selectedSubject.value && !completedTodaySubject(records.value, s));
    }

    function correctCount() {
      return answers.value.filter(a => a?.correct).length;
    }

    // ---- 情绪分区自评 ----
    function todayEmotionCheckin() {
      const today = localDate();
      return emotionCheckins.value.find(c => c.date === today);
    }

    async function doEmotionCheckin(zone) {
      selectedZone.value = zone;
      try {
        const result = await api("/api/emotion/checkin", { method: "POST", body: JSON.stringify({ zone }) });
        const existing = emotionCheckins.value.findIndex(c => c.date === result.date);
        if (existing === -1) emotionCheckins.value.push(result);
        else emotionCheckins.value[existing] = result;
        emotionCheckinDone.value = true;
      } catch (err) {
        showToast("情绪记录暂未保存，请稍后重试");
        selectedZone.value = null;
      }
    }

    function closeEmotionCheckin() {
      showEmotionCheckin.value = false;
      selectedZone.value = null;
    }

    function openEmotionCheckin() {
      showEmotionCheckin.value = true;
      strategyUsed.value = [];
      strategyAnimating.value = null;
      const today = todayEmotionCheckin();
      if (today) {
        selectedZone.value = today.zone;
      } else {
        selectedZone.value = null;
      }
    }

    // ---- 情绪识别游戏 ----
    const currentEmotionQuestion = computed(() => {
      if (emotionGameView.value !== "playing") return null;
      return EMOTION_GAME_QUESTIONS[emotionGameIndex.value] || null;
    });

    const emotionGameProgress = computed(() => {
      if (!EMOTION_GAME_QUESTIONS.length) return 0;
      return Math.round(emotionGameIndex.value / EMOTION_GAME_QUESTIONS.length * 100);
    });

    // ---- 情绪调节策略 ----
    const currentStrategies = computed(() => {
      if (!selectedZone.value) return [];
      return EMOTION_STRATEGIES[selectedZone.value] || [];
    });

    const strategyStats = computed(() => {
      const records = strategyRecords.value;
      const total = records.length;
      const byZone = {};
      const byStrategy = {};
      for (const r of records) {
        byZone[r.zone] = (byZone[r.zone] || 0) + 1;
        byStrategy[r.strategy] = (byStrategy[r.strategy] || 0) + 1;
      }
      return { total, byZone, byStrategy };
    });

    // ---- 策略互动计算属性 ----
    const strategyTimerDisplay = computed(() => {
      const secs = strategyTimerElapsed.value;
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return (m > 0 ? m + '分' : '') + s + '秒';
    });

    const strategyProgressPercent = computed(() => {
      if (!strategyDetail.maxProgress) return 0;
      return Math.min(100, Math.round(strategyDetail.progress / strategyDetail.maxProgress * 100));
    });

    const strategyCanComplete = computed(() => {
      return strategyDetail.progress >= strategyDetail.maxProgress;
    });

    const strategyActionHint = computed(() => {
      if (!strategyDetail.strategy) return '';
      const interaction = STRATEGY_INTERACTIONS[strategyDetail.strategy.id];
      if (!interaction) return '';
      if (strategyDetail.progress >= strategyDetail.maxProgress) return '🎉 完成啦！点击下方按钮结束练习';
      if (strategyDetail.pattern === 'find') {
        const remaining = strategyDetail.maxProgress - strategyDetail.progress;
        return '还剩下 ' + remaining + ' 样东西没找到，继续找找看！';
      }
      return interaction.hint || '点一点，完成练习吧！';
    });

    const strategyEncouragement = computed(() => {
      const idx = strategyDetail.progress % STRATEGY_ENCOURAGEMENTS.length;
      return STRATEGY_ENCOURAGEMENTS[idx] || '太棒啦！';
    });

    const strategyFindRemaining = computed(() => {
      return strategyDetail.maxProgress - strategyDetail.progress;
    });

    const strategyBalloonScale = computed(() => {
      const pct = strategyDetail.progress / Math.max(1, strategyDetail.maxProgress);
      return 0.5 + pct * 0.8;
    });

    // ---- 专注力统计 ----
    const focusDisplay = computed(() => {
      const s = focusElapsed.value;
      if (s < 60) return s + '秒';
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return m + '分' + sec + '秒';
    });

    const focusStats = computed(() => {
      const completed = records.value.filter(r => r.completed && typeof r.duration === 'number');
      if (!completed.length) return { total: 0, avgDuration: 0, longest: 0, totalDuration: 0, avgDisplay: '--', longestDisplay: '--', totalDisplay: '--' };
      const durations = completed.map(r => r.duration);
      const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
      const longest = Math.max(...durations);
      const total = durations.reduce((s, d) => s + d, 0);
      const fmt = (sec) => { if (sec < 60) return sec + '秒'; const m = Math.floor(sec / 60); return m + '分' + (sec % 60 || '') + '秒'; };
      return { total: completed.length, avgDuration: avg, longest, totalDuration: total, avgDisplay: fmt(avg), longestDisplay: fmt(longest), totalDisplay: fmt(total) };
    });

    function getStrategyById(zone, id) {
      const strategies = EMOTION_STRATEGIES[zone] || [];
      return strategies.find(s => s.id === id) || null;
    }

    async function tryStrategy(strategy) {
      if (strategyAnimating.value) return;
      strategyAnimating.value = strategy.id;
      await new Promise(resolve => setTimeout(resolve, 300));
      strategyAnimating.value = null;
      // 打开策略互动详情
      openStrategyDetail(strategy);
    }

    // ---- 策略互动方法 ----
    function openStrategyDetail(strategy) {
      const interaction = STRATEGY_INTERACTIONS[strategy.id] || { pattern: 'tap', maxProgress: 5, emojis: ['⭐'], hint: '完成练习' };

      strategyDetail.show = true;
      strategyDetail.strategy = strategy;
      strategyDetail.zone = selectedZone.value;
      strategyDetail.pattern = interaction.pattern;
      strategyDetail.progress = 0;
      strategyDetail.maxProgress = interaction.maxProgress;
      strategyDetail.step = 0;
      strategyTapAnimate.value = false;
      strategyCompleted.value = false;
      strategyTimerElapsed.value = 0;
      strategyTapEmoji.value = interaction.emojis[0] || strategy.emoji;

      // 初始化寻物模式
      if (interaction.pattern === 'find') {
        const colors = ['#ff8d72', '#75a7ed', '#55b98b', '#ffd86f', '#a58ae5'];
        const labels = ['红色的东西', '蓝色的东西', '绿色的东西', '黄色的东西', '紫色的东西'];
        strategyFindObjects.value = Array.from({ length: 5 }, (_, i) => ({
          color: colors[i % colors.length],
          label: labels[i % labels.length],
          found: false
        }));
      }

      // 初始化宁静模式
      if (interaction.pattern === 'calm') {
        strategyCalmStars.value = [];
      }

      // 开始计时
      startStrategyTimer();
    }

    function closeStrategyDetail() {
      strategyDetail.show = false;
      strategyDetail.strategy = null;
      stopStrategyTimer();
      // 如果已完成，记录到已使用列表
      if (strategyCompleted.value && strategyDetail.strategy) {
        if (!strategyUsed.value.includes(strategyDetail.strategy.id)) {
          strategyUsed.value.push(strategyDetail.strategy.id);
        }
      }
    }

    function doStrategyAction() {
      if (strategyCompleted.value) return;
      const strategy = strategyDetail.strategy;
      if (!strategy) return;
      const interaction = STRATEGY_INTERACTIONS[strategy.id];
      if (!interaction) return;

      if (strategyDetail.pattern === 'tap') {
        // 点击模式：每次点击推进进度
        const nextProgress = strategyDetail.progress + 1;
        strategyDetail.progress = Math.min(nextProgress, strategyDetail.maxProgress);

        // 更新显示的 emoji
        if (nextProgress <= interaction.emojis.length) {
          strategyTapEmoji.value = interaction.emojis[nextProgress - 1];
        }

        // 播放点击动画
        strategyTapAnimate.value = true;
        setTimeout(() => { strategyTapAnimate.value = false; }, 350);

        // 音效反馈
        playFeedbackSound('correct');

        if (nextProgress >= strategyDetail.maxProgress) {
          // 完成时绽放粒子效果
          celebrateWithParticles('correct', 20);
        }
      } else if (strategyDetail.pattern === 'balloon') {
        // 气球模式：每次点击气球变大
        const nextProgress = strategyDetail.progress + 1;
        strategyDetail.progress = Math.min(nextProgress, strategyDetail.maxProgress);

        // 吹气动画
        strategyTapAnimate.value = true;
        setTimeout(() => { strategyTapAnimate.value = false; }, 300);

        playFeedbackSound('correct');

        if (nextProgress >= strategyDetail.maxProgress) {
          // 气球吹满后绽放
          setTimeout(() => {
            celebrateWithParticles('correct', 25);
          }, 200);
        }
      } else if (strategyDetail.pattern === 'calm') {
        // 宁静模式：添加星星
        const star = {
          x: 15 + Math.random() * 70,
          y: 10 + Math.random() * 60,
          delay: 0
        };
        strategyCalmStars.value.push(star);
        const nextProgress = strategyDetail.progress + 1;
        strategyDetail.progress = Math.min(nextProgress, strategyDetail.maxProgress);

        // 柔和音效
        playFeedbackSound('correct');

        if (nextProgress >= strategyDetail.maxProgress) {
          setTimeout(() => {
            celebrateWithParticles('correct', 15);
          }, 300);
        }
      }
    }

    function findObject(index) {
      if (strategyCompleted.value) return;
      const obj = strategyFindObjects.value[index];
      if (!obj || obj.found) return;

      obj.found = true;
      strategyDetail.progress = Math.min(strategyDetail.progress + 1, strategyDetail.maxProgress);

      // 发现动画
      playFeedbackSound('correct');

      if (strategyDetail.progress >= strategyDetail.maxProgress) {
        setTimeout(() => {
          celebrateWithParticles('correct', 25);
        }, 300);
      }
    }

    async function completeStrategy() {
      if (!strategyCanComplete.value) return;
      if (strategyCompleted.value) return;

      stopStrategyTimer();
      strategyCompleted.value = true;

      // 记录策略使用
      const strategy = strategyDetail.strategy;
      if (strategy) {
        try {
          const result = await api('/api/emotion/strategy', {
            method: 'POST',
            body: JSON.stringify({
              zone: selectedZone.value,
              strategy: strategy.id,
              duration: strategyTimerElapsed.value
            })
          });
          strategyRecords.value.push(result);
        } catch (err) {
          console.error(err);
        }
      }

      // 记录到已使用列表
      if (!strategyUsed.value.includes(strategy.id)) {
        strategyUsed.value.push(strategy.id);
      }

      // 完成庆祝
      celebrateWithParticles('complete', 30);
      playFeedbackSound('complete');
    }

    function startStrategyTimer() {
      stopStrategyTimer();
      strategyTimerStart.value = Date.now();
      strategyTimerElapsed.value = 0;
      strategyTimerInterval = setInterval(() => {
        if (strategyTimerStart.value) {
          strategyTimerElapsed.value = Math.floor((Date.now() - strategyTimerStart.value) / 1000);
        }
      }, 1000);
    }

    function stopStrategyTimer() {
      if (strategyTimerInterval) {
        clearInterval(strategyTimerInterval);
        strategyTimerInterval = null;
      }
    }

    // ---- 专注力计时器 ----
    function startFocusTimer() {
      stopFocusTimer();
      focusElapsed.value = 0;
      focusTimerInterval = setInterval(() => {
        focusElapsed.value++;
      }, 1000);
    }

    function stopFocusTimer() {
      if (focusTimerInterval) {
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
      }
    }

    function startEmotionGame() {
      emotionGameView.value = "playing";
      emotionGameIndex.value = 0;
      emotionGameAnswers.value = [];
      emotionGameScore.value = 0;
    }

    function answerEmotionGame(chosen) {
      const q = currentEmotionQuestion.value;
      if (!q) return;
      const correct = chosen === q.answer;
      emotionGameAnswers.value.push({ emoji: q.emoji, answer: q.answer, chosen, correct });
      if (correct) emotionGameScore.value++;
      if (emotionGameIndex.value < EMOTION_GAME_QUESTIONS.length - 1) {
        emotionGameIndex.value++;
      } else {
        finishEmotionGame();
      }
    }

    async function finishEmotionGame() {
      emotionGameView.value = "result";
      try {
        const result = await api("/api/emotion/game", {
          method: "POST",
          body: JSON.stringify({
            answers: emotionGameAnswers.value,
            score: emotionGameScore.value,
            total: EMOTION_GAME_QUESTIONS.length
          })
        });
        emotionGames.value.push(result);
      } catch (err) {
        showToast("游戏记录暂未保存");
      }
    }

    function exitEmotionGame() {
      emotionGameView.value = "start";
      emotionGameIndex.value = 0;
      emotionGameAnswers.value = [];
      emotionGameScore.value = 0;
      navigate("home");
    }

    function emotionGameAnswerClass(opt) {
      const q = currentEmotionQuestion.value;
      if (!q) return {};
      // 已答过题时显示正确/错误样式
      const answered = emotionGameAnswers.value[emotionGameIndex.value];
      if (!answered) return {};
      return {
        correct: opt === q.answer,
        wrong: opt === answered.chosen && !answered.correct
      };
    }

    function emotionGameAccuracy() {
      const all = emotionGames.value.flatMap(g => g.answers || []);
      if (!all.length) return 0;
      return Math.round(all.filter(a => a.correct).length / all.length * 100);
    }

    function emotionGameTotalGames() {
      return emotionGames.value.length;
    }

    // ---- 沟通日志 ----
    function getCurrentWeekId() {
      const now = new Date();
      const d = new Date(localDate(now));
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const weekNumber = Math.ceil(((d - new Date(d.getFullYear(), 0, 4)) / 86400000 + 1) / 7);
      return d.getFullYear() + '-W' + String(weekNumber).padStart(2, '0');
    }

    function getCurrentWeekCommunicationLog() {
      const weekId = getCurrentWeekId();
      return communicationLogs.value.find(l => l.weekId === weekId) || null;
    }

    function getWeekLabel(weekId) {
      if (!weekId) return '';
      const parts = weekId.split('-W');
      if (parts.length !== 2) return weekId;
      const year = parseInt(parts[0]);
      const week = parseInt(parts[1]);
      // 计算该周周一的日期
      const d = new Date(year, 0, 4);
      d.setDate(d.getDate() + (week - 1) * 7 - (d.getDay() + 6) % 7);
      const m = (d.getMonth() + 1) + '/' + d.getDate();
      const end = new Date(d);
      end.setDate(d.getDate() + 6);
      const s = (end.getMonth() + 1) + '/' + end.getDate();
      return m + '-' + s;
    }

    function resetCommunicationForm() {
      communicationForm.vocabulary = 0;
      communicationForm.sentence1 = '';
      communicationForm.sentence2 = '';
      communicationForm.sentence3 = '';
      communicationForm.conversationTurns = 0;
      communicationForm.narrativeScore = 3;
      communicationForm.initiativeScore = 3;
    }

    function loadCommunicationForm(log) {
      if (log) {
        communicationForm.vocabulary = log.vocabulary;
        communicationForm.sentence1 = log.sentences[0] || '';
        communicationForm.sentence2 = log.sentences[1] || '';
        communicationForm.sentence3 = log.sentences[2] || '';
        communicationForm.conversationTurns = log.conversationTurns;
        communicationForm.narrativeScore = log.narrativeScore;
        communicationForm.initiativeScore = log.initiativeScore;
      } else {
        resetCommunicationForm();
      }
    }

    async function saveCommunicationLog() {
      const vocabulary = communicationForm.vocabulary;
      const sentences = [communicationForm.sentence1, communicationForm.sentence2, communicationForm.sentence3];
      const conversationTurns = communicationForm.conversationTurns;
      const narrativeScore = communicationForm.narrativeScore;
      const initiativeScore = communicationForm.initiativeScore;

      if (typeof vocabulary !== 'number' || vocabulary < 0 || vocabulary > 200) {
        showToast('请输入有效的词汇量（0–200）');
        return;
      }
      if (sentences.some(s => !s || !s.trim())) {
        showToast('请填写 3 句语言样本');
        return;
      }
      if (typeof conversationTurns !== 'number' || conversationTurns < 0 || conversationTurns > 50) {
        showToast('请输入有效的对话轮次（0–50）');
        return;
      }
      if (typeof narrativeScore !== 'number' || narrativeScore < 1 || narrativeScore > 5) {
        showToast('叙事能力评分须在 1–5 之间');
        return;
      }
      if (typeof initiativeScore !== 'number' || initiativeScore < 1 || initiativeScore > 5) {
        showToast('沟通主动性评分须在 1–5 之间');
        return;
      }

      try {
        const result = await api('/api/communication/log', {
          method: 'POST',
          body: JSON.stringify({ vocabulary, sentences: sentences.map(s => s.trim()), conversationTurns, narrativeScore, initiativeScore })
        });
        const existing = communicationLogs.value.findIndex(l => l.weekId === result.weekId);
        if (existing === -1) communicationLogs.value.push(result);
        else communicationLogs.value[existing] = result;
        showToast('本周沟通日志已保存');
        communicationLogTab.value = 'history';
      } catch (err) {
        showToast(err.message);
      }
    }
    let reminderTimer = null;
    function scheduleReminder() {
      if (!("Notification" in window)) return;
      if (Notification.permission === "denied") return;
      if (Notification.permission === "granted") {
        // 下午 5 点后检查是否完成今日课程
        const hour = new Date().getHours();
        if (hour < 17) return;
        const allDone = todaySubjects.value.every(s => completedTodaySubject(records.value, s));
        if (!allDone && records.value.length > 0) {
          new Notification("🌱 元宝成长乐园", {
            body: "今天的课程还没有完成哦，和宝宝一起学一会儿吧！",
            tag: "yuanbao-reminder",
            silent: true
          });
        }
        return;
      }
      // 请求权限（仅一次）
      if (reminderTimer === null) {
        reminderTimer = setTimeout(() => {
          Notification.requestPermission().catch(() => {});
        }, 30000);
      }
    }

    // ---- Edit profile ----
    function openEditProfile() {
      editName.value = profile.value?.name || "";
      editAge.value = profile.value?.age || 4;
      showEditProfile.value = true;
    }

    async function saveEditProfile() {
      if (!editName.value?.trim() || ![3, 4, 5, 6].includes(editAge.value)) {
        showToast("请填写有效的小名和年龄（3–6 岁）");
        return;
      }
      const updated = { ...profile.value, name: editName.value.trim().slice(0, 8), age: editAge.value };
      profile.value = updated;
      await saveProfile(updated);
      selectedAge.value = editAge.value;
      showEditProfile.value = false;
      showToast("宝宝资料已更新");
    }

    // ---- Init ----
    onMounted(async () => {
      // 注册 Service Worker（PWA 离线支持）
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      }
      try {
        const saved = await api("/api/state");
        if (saved.profile) {
          profile.value = saved.profile;
          records.value = saved.records || [];
          schedule.value = saved.schedule || {};
          emotionCheckins.value = saved.emotionCheckins || [];
          emotionGames.value = saved.emotionGames || [];
          strategyRecords.value = saved.strategyRecords || [];
          communicationLogs.value = saved.communicationLogs || [];
          view.value = "home";
          selectedAge.value = saved.profile?.age || 4;
          scheduleReminder();
          return;
        }
      } catch (err) {
        // 未登录
      }
      view.value = "login";
    });

    // ---- Return for template ----
    return {
      // state
      view, accountId, profile, records, schedule, selectedAge,
      selectedSubject, lesson, activityIndex, answers, feedback,
      isReview, completionCelebrated, toastMessage, toastVisible,
      answerDisabled, answerChosen, answerCorrect, editDialog, loading,
      authError, loginUsername, loginPassword, regUsername, regPassword, regChildName,
      showEditProfile, editName, editAge,
      // emotion state
      emotionCheckins, showEmotionCheckin, selectedZone, emotionCheckinDone,
      emotionGames, emotionGameView, emotionGameIndex, emotionGameAnswers, emotionGameScore,
      strategyRecords, strategyAnimating, strategyUsed,
      // strategy detail state
      strategyDetail, strategyTapAnimate, strategyTimerElapsed,
      strategyCompleted, strategyFindObjects, strategyCalmStars, strategyTapEmoji,
      // focus state
      focusElapsed,
      // communication log state
      communicationLogs, communicationLogTab, communicationForm,
      // computed
      streakCount, todaySubjects, subjectLessonDays, currentActivity,
      isLoggedIn, totalActivities, progressPercent, subjectMeta, feedbackCss,
      navItems, achievements, wrongAnswers,
      currentEmotionQuestion, emotionGameProgress,
      currentStrategies, strategyStats, getStrategyById,
      // strategy detail computed
      strategyTimerDisplay, strategyProgressPercent, strategyCanComplete,
      strategyActionHint, strategyEncouragement, strategyFindRemaining, strategyBalloonScale,
      // focus computed
      focusDisplay, focusStats,
      // methods
      navigate, showToast, startSubjectLesson, exitLesson,
      answerQuestion, nextActivity,
      handleLogin, handleRegister, loadUserState, logout,
      resetData, exportData, exportWorksheets,
      openEditDialog, closeEditDialog, toggleEditSubject, saveEditDialog, resetSchedule,
      weekDays, subjectStats, historyItems, speak,
      answerClass, picAnswerClass, picAnswerValue, picAnswerLabel,
      remainingSubjects, correctCount,
      openEditProfile, saveEditProfile,
      achievements, scheduleReminder,
      // emotion methods
      openEmotionCheckin, doEmotionCheckin, closeEmotionCheckin, todayEmotionCheckin,
      tryStrategy,
      openStrategyDetail, closeStrategyDetail, doStrategyAction, findObject, completeStrategy,
      startEmotionGame, answerEmotionGame, finishEmotionGame, exitEmotionGame,
      emotionGameAnswerClass, emotionGameAccuracy, emotionGameTotalGames,
      // communication log methods
      getCurrentWeekId, getCurrentWeekCommunicationLog, getWeekLabel,
      resetCommunicationForm, loadCommunicationForm, saveCommunicationLog,
      // constants
      SUBJECT_META, SUCCESS_SOUNDS, WEEKDAY_NAMES, localDate, makeSubjectLesson,
      completedTodaySubject, todayDraftSubject, streak, getTodaySubjects,
      celebrateWithParticles, playFeedbackSound,
      EMOTION_ZONES, EMOTION_GAME_QUESTIONS, EMOTION_STRATEGIES,
      STRATEGY_INTERACTIONS, STRATEGY_ENCOURAGEMENTS
    };
  }
});

app.mount("#app");