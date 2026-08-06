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
    }

    function exitLesson() {
      view.value = "home";
      feedback.value = null;
      answerDisabled.value = false;
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
          completedAt: new Date().toISOString()
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

    function getStrategyById(zone, id) {
      const strategies = EMOTION_STRATEGIES[zone] || [];
      return strategies.find(s => s.id === id) || null;
    }

    async function tryStrategy(strategy) {
      if (strategyAnimating.value) return;
      strategyAnimating.value = strategy.id;
      playFeedbackSound('correct');
      await new Promise(resolve => setTimeout(resolve, 1200));
      strategyUsed.value.push(strategy.id);
      strategyAnimating.value = null;
      try {
        const result = await api('/api/emotion/strategy', {
          method: 'POST',
          body: JSON.stringify({ zone: selectedZone.value, strategy: strategy.id })
        });
        strategyRecords.value.push(result);
      } catch (err) {
        console.error(err);
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
      // computed
      streakCount, todaySubjects, subjectLessonDays, currentActivity,
      isLoggedIn, totalActivities, progressPercent, subjectMeta, feedbackCss,
      navItems, achievements, wrongAnswers,
      currentEmotionQuestion, emotionGameProgress,
      currentStrategies, strategyStats, getStrategyById,
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
      startEmotionGame, answerEmotionGame, finishEmotionGame, exitEmotionGame,
      emotionGameAnswerClass, emotionGameAccuracy, emotionGameTotalGames,
      // constants
      SUBJECT_META, SUCCESS_SOUNDS, WEEKDAY_NAMES, localDate, makeSubjectLesson,
      completedTodaySubject, todayDraftSubject, streak, getTodaySubjects,
      celebrateWithParticles, playFeedbackSound,
      EMOTION_ZONES, EMOTION_GAME_QUESTIONS, EMOTION_STRATEGIES
    };
  }
});

app.mount("#app");