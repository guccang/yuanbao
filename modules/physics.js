"use strict";

// ---- 物理启蒙课程模块 ----
// 面向 3–6 岁宝宝，以可观察的生活现象为载体，在游戏中建立最初的物理直觉。
// 遵循蒙台梭利"从具体到抽象"原则：每个主题先给出直观例子，再引导识别与判断。
// 8 个主题在 8 天中循环，每个主题包含 5 个互动活动。

const PHYSICS_THEMES = [
  {
    name: "浮与沉", emoji: "🌊",
    concept: "有些东西放在水里会浮起来，有些会沉下去。",
    float: ["🪵 木块", "🍎 苹果", "🛶 小船", "🪿 小黄鸭", "🎈 气球"],
    sink: ["🪨 石头", "🔑 钥匙", "🪙 硬币", "🔩 螺丝", "🍴 叉子"]
  },
  {
    name: "轻与重", emoji: "⚖️",
    concept: "不同的东西，重量不一样。有的轻，有的重。",
    light: ["🪶 羽毛", "🍃 树叶", "🧻 纸巾", "🎈 气球", "🫧 泡泡"],
    heavy: ["🪨 石头", "📚 书本", "🧱 砖块", "🛒 推车", "🏋️ 哑铃"]
  },
  {
    name: "推与拉", emoji: "💪",
    concept: "推是向前用力，拉是向自己用力。",
    push: ["🚪 开门", "🛒 推购物车", "🔘 按按钮", "⚽ 踢球", "🧹 扫地"],
    pull: ["🧲 拉开抽屉", "🧦 穿袜子", "🎣 钓鱼", "🐕 牵狗绳", "🪁 放风筝"]
  },
  {
    name: "磁铁游戏", emoji: "🧲",
    concept: "磁铁能吸住铁做的东西，不能吸住木头、塑料或纸。",
    magnetic: ["🔩 铁钉", "📎 回形针", "🔑 铁钥匙", "🪙 硬币", "🥫 铁罐"],
    nonMagnetic: ["🪵 木块", "🧴 塑料瓶", "📄 白纸", "🧸 布娃娃", "🫙 玻璃杯"]
  },
  {
    name: "光与影", emoji: "💡",
    concept: "光被挡住就会产生影子。光越亮，影子越清楚。",
    lightSource: ["☀️ 太阳", "💡 灯泡", "🔦 手电筒", "🕯️ 蜡烛", "🔥 火焰"],
    blocks: ["🧱 砖墙", "📦 纸箱", "🪑 椅子", "🌳 大树", "🚗 汽车"]
  },
  {
    name: "声音世界", emoji: "🔊",
    concept: "声音有大有小、有高有低。不同的东西发出不同的声音。",
    loud: ["🥁 敲鼓", "🚨 警笛", "🎺 喇叭", "📢 广播", "🔔 铃声"],
    soft: ["🪶 羽毛落地", "🐱 小猫叫", "🍃 风吹树叶", "🕯️ 蜡烛", "🤫 悄悄话"]
  },
  {
    name: "冷与热", emoji: "🌡️",
    concept: "有些东西是热的，有些是冷的。温度可以用手感觉。",
    hot: ["☀️ 太阳", "🔥 火焰", "🍲 热汤", "☕ 热茶", "🫖 热水"],
    cold: ["❄️ 雪花", "🧊 冰块", "🍦 冰淇淋", "🥶 冷风", "🧊 冰棍"]
  },
  {
    name: "快与慢", emoji: "🏃",
    concept: "有的东西移动得快，有的移动得慢。",
    fast: ["🐆 猎豹", "🚀 火箭", "🏎️ 赛车", "✈️ 飞机", "⚡ 闪电"],
    slow: ["🐢 乌龟", "🐌 蜗牛", "🦥 树懒", "🐛 毛毛虫", "🪱 蚯蚓"]
  }
];

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

/**
 * 生成一节物理启蒙课（5 个活动）
 * @param {number} day - 学习天数（从 1 开始）
 * @param {number} age - 宝宝年龄（3–6）
 * @returns {object} lesson
 */
function generateLesson(day, age) {
  const random = seeded(day * 5821 + age * 211);
  const theme = PHYSICS_THEMES[(day - 1) % PHYSICS_THEMES.length];

  // 根据主题类型选择不同的活动模板
  let activities;

  if (theme.name === "浮与沉") {
    const floatItem = theme.float[day % theme.float.length];
    const sinkItem = theme.sink[day % theme.sink.length];
    const testItem = (day % 2 === 0) ? floatItem : sinkItem;
    const testFloats = (day % 2 === 0);
    const distractors = shuffle([...theme.float, ...theme.sink].filter(x => x !== testItem), random).slice(0, 3);

    activities = [
      { title: `认识浮与沉`, hint: theme.concept, visual: `${floatItem}  ⬆️ 浮  ·  ${sinkItem}  ⬇️ 沉`, answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: `${testItem.split(" ")[1] || testItem} 会浮起来吗？`, hint: "想一想，它放在水里会怎样？", visual: testItem, answer: testFloats ? "浮起来" : "沉下去", options: ["浮起来", "沉下去"] },
      { title: "哪些会浮起来？", hint: "选出能浮在水面上的东西", visual: "🤔", answer: shuffle(theme.float, random)[0], options: shuffle([shuffle(theme.float, random)[0], shuffle(theme.sink, random)[0], shuffle(theme.float, random)[1] || theme.float[0], shuffle(theme.sink, random)[1] || theme.sink[0]], random), pictureOptions: true },
      { title: "哪些会沉下去？", hint: "选出会沉到水底的东西", visual: "🤔", answer: shuffle(theme.sink, random)[0], options: shuffle([shuffle(theme.sink, random)[0], shuffle(theme.float, random)[0], shuffle(theme.sink, random)[1] || theme.sink[0], shuffle(theme.float, random)[1] || theme.float[0]], random), pictureOptions: true },
      { title: `${testItem.split(" ")[1] || testItem} 放在水里会怎样？`, hint: "回忆一下刚才学到的知识", visual: testItem, answer: testFloats ? "浮起来" : "沉下去", options: shuffle(["浮起来", "沉下去"], random) }
    ];
  } else if (theme.name === "轻与重") {
    const lightItem = theme.light[day % theme.light.length];
    const heavyItem = theme.heavy[day % theme.heavy.length];
    activities = [
      { title: `认识轻与重`, hint: theme.concept, visual: `${lightItem}  ⬆️ 轻  ·  ${heavyItem}  ⬇️ 重`, answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: `${lightItem.split(" ")[1] || lightItem} 是轻还是重？`, hint: "用手掂一掂的感觉", visual: lightItem, answer: "轻", options: ["轻", "重"] },
      { title: `${heavyItem.split(" ")[1] || heavyItem} 是轻还是重？`, hint: "用手掂一掂的感觉", visual: heavyItem, answer: "重", options: ["轻", "重"] },
      { title: "哪个更轻？", hint: "比较两个东西的重量", visual: `${lightItem}  vs  ${heavyItem}`, answer: lightItem, options: shuffle([lightItem, heavyItem], random) },
      { title: "哪个更重？", hint: "比较两个东西的重量", visual: `${lightItem}  vs  ${heavyItem}`, answer: heavyItem, options: shuffle([lightItem, heavyItem], random) }
    ];
  } else if (theme.name === "推与拉") {
    const pushItem = theme.push[day % theme.push.length];
    const pullItem = theme.pull[day % theme.pull.length];
    activities = [
      { title: `认识推与拉`, hint: theme.concept, visual: `${pushItem}  → 推  ·  ${pullItem}  ← 拉`, answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: `${pushItem} 是推还是拉？`, hint: "想想这个动作的方向", visual: pushItem, answer: "推", options: ["推", "拉"] },
      { title: `${pullItem} 是推还是拉？`, hint: "想想这个动作的方向", visual: pullItem, answer: "拉", options: ["推", "拉"] },
      { title: "哪个是推的动作？", hint: "选出向前用力的动作", visual: "🤔", answer: shuffle(theme.push, random)[0], options: shuffle([shuffle(theme.push, random)[0], shuffle(theme.pull, random)[0], shuffle(theme.push, random)[1] || theme.push[0], shuffle(theme.pull, random)[1] || theme.pull[0]], random) },
      { title: "哪个是拉的动作？", hint: "选出向自己用力的动作", visual: "🤔", answer: shuffle(theme.pull, random)[0], options: shuffle([shuffle(theme.pull, random)[0], shuffle(theme.push, random)[0], shuffle(theme.pull, random)[1] || theme.pull[0], shuffle(theme.push, random)[1] || theme.push[0]], random) }
    ];
  } else if (theme.name === "磁铁游戏") {
    const magItem = theme.magnetic[day % theme.magnetic.length];
    const nonMagItem = theme.nonMagnetic[day % theme.nonMagnetic.length];
    activities = [
      { title: `认识磁铁`, hint: theme.concept, visual: `${magItem}  🧲 吸住  ·  ${nonMagItem}  ✗ 吸不住`, answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: `${magItem.split(" ")[1] || magItem} 能被磁铁吸住吗？`, hint: "想一想它的材质", visual: magItem, answer: "能吸住", options: ["能吸住", "吸不住"] },
      { title: `${nonMagItem.split(" ")[1] || nonMagItem} 能被磁铁吸住吗？`, hint: "想一想它的材质", visual: nonMagItem, answer: "吸不住", options: ["能吸住", "吸不住"] },
      { title: "磁铁能吸住哪个？", hint: "选出铁做的东西", visual: "🧲", answer: shuffle(theme.magnetic, random)[0], options: shuffle([shuffle(theme.magnetic, random)[0], shuffle(theme.nonMagnetic, random)[0], shuffle(theme.magnetic, random)[1] || theme.magnetic[0], shuffle(theme.nonMagnetic, random)[1] || theme.nonMagnetic[0]], random) },
      { title: "哪个吸不住？", hint: "选出磁铁吸不住的东西", visual: "🧲", answer: shuffle(theme.nonMagnetic, random)[0], options: shuffle([shuffle(theme.nonMagnetic, random)[0], shuffle(theme.magnetic, random)[0], shuffle(theme.nonMagnetic, random)[1] || theme.nonMagnetic[0], shuffle(theme.magnetic, random)[1] || theme.magnetic[0]], random) }
    ];
  } else if (theme.name === "光与影") {
    const lightSrc = theme.lightSource[day % theme.lightSource.length];
    const blocker = theme.blocks[day % theme.blocks.length];
    activities = [
      { title: `认识光与影`, hint: theme.concept, visual: `${lightSrc}  →  ${blocker}  →  ◼️ 影子`, answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: `${lightSrc} 会发光吗？`, hint: "想想它能不能发出光", visual: lightSrc, answer: "会发光", options: ["会发光", "不会发光"] },
      { title: `${blocker.split(" ")[1] || blocker} 能挡住光吗？`, hint: "光能不能穿过它？", visual: blocker, answer: "能挡住", options: ["能挡住", "挡不住"] },
      { title: "哪个是光源？", hint: "选出能自己发光的东西", visual: "💡", answer: shuffle(theme.lightSource, random)[0], options: shuffle([shuffle(theme.lightSource, random)[0], shuffle(theme.blocks, random)[0], shuffle(theme.lightSource, random)[1] || theme.lightSource[0], shuffle(theme.blocks, random)[1] || theme.blocks[0]], random) },
      { title: "哪个会有影子？", hint: "光被挡住就会产生影子", visual: "◼️", answer: shuffle(theme.blocks, random)[0], options: shuffle([shuffle(theme.blocks, random)[0], shuffle(theme.lightSource, random)[0], shuffle(theme.blocks, random)[1] || theme.blocks[0], shuffle(theme.lightSource, random)[1] || theme.lightSource[0]], random) }
    ];
  } else if (theme.name === "声音世界") {
    const loudItem = theme.loud[day % theme.loud.length];
    const softItem = theme.soft[day % theme.soft.length];
    activities = [
      { title: `认识声音`, hint: theme.concept, visual: `${loudItem}  🔊 大声  ·  ${softItem}  🔈 小声`, answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: `${loudItem} 的声音大还是小？`, hint: "想象一下这个声音", visual: loudItem, answer: "大声", options: ["大声", "小声"] },
      { title: `${softItem} 的声音大还是小？`, hint: "想象一下这个声音", visual: softItem, answer: "小声", options: ["大声", "小声"] },
      { title: "哪个声音大？", hint: "选出声音响亮的东西", visual: "🔊", answer: shuffle(theme.loud, random)[0], options: shuffle([shuffle(theme.loud, random)[0], shuffle(theme.soft, random)[0], shuffle(theme.loud, random)[1] || theme.loud[0], shuffle(theme.soft, random)[1] || theme.soft[0]], random) },
      { title: "哪个声音小？", hint: "选出声音轻柔的东西", visual: "🔈", answer: shuffle(theme.soft, random)[0], options: shuffle([shuffle(theme.soft, random)[0], shuffle(theme.loud, random)[0], shuffle(theme.soft, random)[1] || theme.soft[0], shuffle(theme.loud, random)[1] || theme.loud[0]], random) }
    ];
  } else if (theme.name === "冷与热") {
    const hotItem = theme.hot[day % theme.hot.length];
    const coldItem = theme.cold[day % theme.cold.length];
    activities = [
      { title: `认识冷与热`, hint: theme.concept, visual: `${hotItem}  🔥 热  ·  ${coldItem}  ❄️ 冷`, answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: `${hotItem} 是热的还是冷的？`, hint: "想想它的温度", visual: hotItem, answer: "热的", options: ["热的", "冷的"] },
      { title: `${coldItem} 是热的还是冷的？`, hint: "想想它的温度", visual: coldItem, answer: "冷的", options: ["热的", "冷的"] },
      { title: "哪个是热的？", hint: "选出温度高的东西", visual: "🔥", answer: shuffle(theme.hot, random)[0], options: shuffle([shuffle(theme.hot, random)[0], shuffle(theme.cold, random)[0], shuffle(theme.hot, random)[1] || theme.hot[0], shuffle(theme.cold, random)[1] || theme.cold[0]], random) },
      { title: "哪个是冷的？", hint: "选出温度低的东西", visual: "❄️", answer: shuffle(theme.cold, random)[0], options: shuffle([shuffle(theme.cold, random)[0], shuffle(theme.hot, random)[0], shuffle(theme.cold, random)[1] || theme.cold[0], shuffle(theme.hot, random)[1] || theme.hot[0]], random) }
    ];
  } else { // 快与慢
    const fastItem = theme.fast[day % theme.fast.length];
    const slowItem = theme.slow[day % theme.slow.length];
    activities = [
      { title: `认识快与慢`, hint: theme.concept, visual: `${fastItem}  💨 快  ·  ${slowItem}  🐌 慢`, answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: `${fastItem} 是快还是慢？`, hint: "想想它的速度", visual: fastItem, answer: "快", options: ["快", "慢"] },
      { title: `${slowItem} 是快还是慢？`, hint: "想想它的速度", visual: slowItem, answer: "慢", options: ["快", "慢"] },
      { title: "哪个更快？", hint: "选出速度最快的东西", visual: "💨", answer: shuffle(theme.fast, random)[0], options: shuffle([shuffle(theme.fast, random)[0], shuffle(theme.slow, random)[0], shuffle(theme.fast, random)[1] || theme.fast[0], shuffle(theme.slow, random)[1] || theme.slow[0]], random) },
      { title: "哪个更慢？", hint: "选出速度最慢的东西", visual: "🐌", answer: shuffle(theme.slow, random)[0], options: shuffle([shuffle(theme.slow, random)[0], shuffle(theme.fast, random)[0], shuffle(theme.slow, random)[1] || theme.slow[0], shuffle(theme.fast, random)[1] || theme.fast[0]], random) }
    ];
  }

  return {
    subject: "physics",
    day,
    age,
    theme,
    title: `${theme.name}`,
    subtitle: `${theme.emoji} 物理启蒙 · ${age} 岁阶段`,
    activities
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PHYSICS_THEMES, generateLesson };
}
if (typeof window !== "undefined") {
  window.PhysicsModule = { PHYSICS_THEMES, generateLesson };
}