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

    // ---- 学习提醒 ----
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
      try {
        const saved = await api("/api/state");
        if (saved.profile) {
          profile.value = saved.profile;
          records.value = saved.records || [];
          schedule.value = saved.schedule || {};
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
      // computed
      streakCount, todaySubjects, subjectLessonDays, currentActivity,
      isLoggedIn, totalActivities, progressPercent, subjectMeta, feedbackCss,
      navItems, achievements,
      // methods
      navigate, showToast, startSubjectLesson, exitLesson,
      answerQuestion, nextActivity,
      handleLogin, handleRegister, loadUserState, logout,
      resetData, exportData,
      openEditDialog, closeEditDialog, toggleEditSubject, saveEditDialog, resetSchedule,
      weekDays, subjectStats, historyItems, speak,
      answerClass, picAnswerClass, picAnswerValue, picAnswerLabel,
      remainingSubjects, correctCount,
      openEditProfile, saveEditProfile,
      achievements, scheduleReminder,
      // constants
      SUBJECT_META, SUCCESS_SOUNDS, WEEKDAY_NAMES, localDate, makeSubjectLesson,
      completedTodaySubject, todayDraftSubject, streak, getTodaySubjects,
      celebrateWithParticles, playFeedbackSound
    };
  }
});

app.mount("#app");