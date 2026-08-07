"use strict";

// ---- 物理启蒙课程模块 ----
// 面向 3-6 岁宝宝，以可观察的生活现象为载体，在游戏中建立最初的物理直觉。
// 遵循蒙台梭利"从具体到抽象"原则：每个主题先给出直观例子，再引导识别与判断。
// 12 个主题在 12 天中循环，每个主题包含 5 个互动活动。

var PHYSICS_THEMES = [
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
  },
  // 新增主题
  {
    name: "弹性与弹力", emoji: "🏀",
    concept: "有些东西被压扁或拉长后，会自己弹回原来的样子。这就是弹性。",
    elastic: ["🏀 篮球", "🎾 网球", "🪁 橡皮筋", "🛏️ 弹簧床", "🎈 气球"],
    inelastic: ["🧱 砖块", "🪵 木块", "📄 白纸", "🧸 布娃娃", "🪨 石头"]
  },
  {
    name: "摩擦力", emoji: "🧗",
    concept: "摩擦力让东西慢下来。光滑的表面摩擦力小，粗糙的表面摩擦力大。",
    smooth: ["🛝 滑梯", "🧊 冰面", "🪟 玻璃", "🪞 镜子", "🛼 溜冰鞋"],
    rough: ["🧗 攀岩墙", "🏐 沙地", "🧶 毛毯", "🌳 树皮", "🛤️ 石子路"]
  },
  {
    name: "简单机械", emoji: "⚙️",
    concept: "工具能帮我们更省力地做事。轮子、杠杆、斜面都是简单机械。",
    tool: ["🛞 轮子", "🔧 扳手", "🪛 螺丝刀", "🪚 锯子", "🪜 梯子"],
    notTool: ["🧸 玩具熊", "🍎 苹果", "📚 书本", "🧦 袜子", "🌸 花朵"]
  },
  {
    name: "颜色混合", emoji: "🎨",
    concept: "两种颜色混在一起会变成新的颜色。红色加黄色变成橙色。",
    mixes: [
      { a: "🔴 红色", b: "🟡 黄色", result: "🟠 橙色" },
      { a: "🔵 蓝色", b: "🟡 黄色", result: "🟢 绿色" },
      { a: "🔴 红色", b: "🔵 蓝色", result: "🟣 紫色" },
      { a: "⚪ 白色", b: "⚫ 黑色", result: "🩶 灰色" }
    ],
    colors: {
      red: "🔴 红色", yellow: "🟡 黄色", blue: "🔵 蓝色",
      orange: "🟠 橙色", green: "🟢 绿色", purple: "🟣 紫色"
    }
  }
];

/**
 * 生成一节物理启蒙课
 * 生成一节物理启蒙课（5 个活动）
 * @param {number} day - 学习天数（从 1 开始）
 * @param {number} age - 宝宝年龄（3-6）
 * @returns {object} lesson
 */
function generateLesson(day, age) {
  var random = window.SubjectUtils.seeded(day * 5821 + age * 211);
  var theme = PHYSICS_THEMES[(day - 1) % PHYSICS_THEMES.length];

  // 根据主题类型选择不同的活动模板
  var activities;

  if (theme.name === "浮与沉") {
    var floatItem = theme.float[day % theme.float.length];
    var sinkItem = theme.sink[day % theme.sink.length];
    var testItem = (day % 2 === 0) ? floatItem : sinkItem;
    var testFloats = (day % 2 === 0);
    var distractors = window.SubjectUtils.shuffle(theme.float.concat(theme.sink).filter(function(x) { return x !== testItem; }), random).slice(0, 3);

    activities = [
      { title: "认识浮与沉", hint: theme.concept, visual: floatItem + "  ⬆️ 浮  ·  " + sinkItem + "  ⬇️ 沉", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: (testItem.split(" ")[1] || testItem) + " 会浮起来吗？", hint: "想一想，它放在水里会怎样？", visual: testItem, answer: testFloats ? "浮起来" : "沉下去", options: ["浮起来", "沉下去"] },
      { title: "哪些会浮起来？", hint: "选出能浮在水面上的东西", visual: "🤔", answer: window.SubjectUtils.shuffle(theme.float, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.float, random)[0], window.SubjectUtils.shuffle(theme.sink, random)[0], window.SubjectUtils.shuffle(theme.float, random)[1] || theme.float[0], window.SubjectUtils.shuffle(theme.sink, random)[1] || theme.sink[0]], random), pictureOptions: true },
      { title: "哪些会沉下去？", hint: "选出会沉到水底的东西", visual: "🤔", answer: window.SubjectUtils.shuffle(theme.sink, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.sink, random)[0], window.SubjectUtils.shuffle(theme.float, random)[0], window.SubjectUtils.shuffle(theme.sink, random)[1] || theme.sink[0], window.SubjectUtils.shuffle(theme.float, random)[1] || theme.float[0]], random), pictureOptions: true },
      { title: (testItem.split(" ")[1] || testItem) + " 放在水里会怎样？", hint: "回忆一下刚才学到的知识", visual: testItem, answer: testFloats ? "浮起来" : "沉下去", options: window.SubjectUtils.shuffle(["浮起来", "沉下去"], random) }
    ];
  } else if (theme.name === "轻与重") {
    var lightItem = theme.light[day % theme.light.length];
    var heavyItem = theme.heavy[day % theme.heavy.length];
    activities = [
      { title: "认识轻与重", hint: theme.concept, visual: lightItem + "  ⬆️ 轻  ·  " + heavyItem + "  ⬇️ 重", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: (lightItem.split(" ")[1] || lightItem) + " 是轻还是重？", hint: "用手掂一掂的感觉", visual: lightItem, answer: "轻", options: ["轻", "重"] },
      { title: (heavyItem.split(" ")[1] || heavyItem) + " 是轻还是重？", hint: "用手掂一掂的感觉", visual: heavyItem, answer: "重", options: ["轻", "重"] },
      { title: "哪个更轻？", hint: "比较两个东西的重量", visual: lightItem + "  vs  " + heavyItem, answer: lightItem, options: window.SubjectUtils.shuffle([lightItem, heavyItem], random) },
      { title: "哪个更重？", hint: "比较两个东西的重量", visual: lightItem + "  vs  " + heavyItem, answer: heavyItem, options: window.SubjectUtils.shuffle([lightItem, heavyItem], random) }
    ];
  } else if (theme.name === "推与拉") {
    var pushItem = theme.push[day % theme.push.length];
    var pullItem = theme.pull[day % theme.pull.length];
    activities = [
      { title: "认识推与拉", hint: theme.concept, visual: pushItem + "  → 推  ·  " + pullItem + "  ← 拉", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: pushItem + " 是推还是拉？", hint: "想想这个动作的方向", visual: pushItem, answer: "推", options: ["推", "拉"] },
      { title: pullItem + " 是推还是拉？", hint: "想想这个动作的方向", visual: pullItem, answer: "拉", options: ["推", "拉"] },
      { title: "哪个是推的动作？", hint: "选出向前用力的动作", visual: "🤔", answer: window.SubjectUtils.shuffle(theme.push, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.push, random)[0], window.SubjectUtils.shuffle(theme.pull, random)[0], window.SubjectUtils.shuffle(theme.push, random)[1] || theme.push[0], window.SubjectUtils.shuffle(theme.pull, random)[1] || theme.pull[0]], random) },
      { title: "哪个是拉的动作？", hint: "选出向自己用力的动作", visual: "🤔", answer: window.SubjectUtils.shuffle(theme.pull, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.pull, random)[0], window.SubjectUtils.shuffle(theme.push, random)[0], window.SubjectUtils.shuffle(theme.pull, random)[1] || theme.pull[0], window.SubjectUtils.shuffle(theme.push, random)[1] || theme.push[0]], random) }
    ];
  } else if (theme.name === "磁铁游戏") {
    var magItem = theme.magnetic[day % theme.magnetic.length];
    var nonMagItem = theme.nonMagnetic[day % theme.nonMagnetic.length];
    activities = [
      { title: "认识磁铁", hint: theme.concept, visual: magItem + "  🧲 吸住  ·  " + nonMagItem + "  ✗ 吸不住", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: (magItem.split(" ")[1] || magItem) + " 能被磁铁吸住吗？", hint: "想一想它的材质", visual: magItem, answer: "能吸住", options: ["能吸住", "吸不住"] },
      { title: (nonMagItem.split(" ")[1] || nonMagItem) + " 能被磁铁吸住吗？", hint: "想一想它的材质", visual: nonMagItem, answer: "吸不住", options: ["能吸住", "吸不住"] },
      { title: "磁铁能吸住哪个？", hint: "选出铁做的东西", visual: "🧲", answer: window.SubjectUtils.shuffle(theme.magnetic, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.magnetic, random)[0], window.SubjectUtils.shuffle(theme.nonMagnetic, random)[0], window.SubjectUtils.shuffle(theme.magnetic, random)[1] || theme.magnetic[0], window.SubjectUtils.shuffle(theme.nonMagnetic, random)[1] || theme.nonMagnetic[0]], random) },
      { title: "哪个吸不住？", hint: "选出磁铁吸不住的东西", visual: "🧲", answer: window.SubjectUtils.shuffle(theme.nonMagnetic, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.nonMagnetic, random)[0], window.SubjectUtils.shuffle(theme.magnetic, random)[0], window.SubjectUtils.shuffle(theme.nonMagnetic, random)[1] || theme.nonMagnetic[0], window.SubjectUtils.shuffle(theme.magnetic, random)[1] || theme.magnetic[0]], random) }
    ];
  } else if (theme.name === "光与影") {
    var lightSrc = theme.lightSource[day % theme.lightSource.length];
    var blocker = theme.blocks[day % theme.blocks.length];
    activities = [
      { title: "认识光与影", hint: theme.concept, visual: lightSrc + "  →  " + blocker + "  →  ◼️ 影子", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: lightSrc + " 会发光吗？", hint: "想想它能不能发出光", visual: lightSrc, answer: "会发光", options: ["会发光", "不会发光"] },
      { title: (blocker.split(" ")[1] || blocker) + " 能挡住光吗？", hint: "光能不能穿过它？", visual: blocker, answer: "能挡住", options: ["能挡住", "挡不住"] },
      { title: "哪个是光源？", hint: "选出能自己发光的东西", visual: "💡", answer: window.SubjectUtils.shuffle(theme.lightSource, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.lightSource, random)[0], window.SubjectUtils.shuffle(theme.blocks, random)[0], window.SubjectUtils.shuffle(theme.lightSource, random)[1] || theme.lightSource[0], window.SubjectUtils.shuffle(theme.blocks, random)[1] || theme.blocks[0]], random) },
      { title: "哪个会有影子？", hint: "光被挡住就会产生影子", visual: "◼️", answer: window.SubjectUtils.shuffle(theme.blocks, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.blocks, random)[0], window.SubjectUtils.shuffle(theme.lightSource, random)[0], window.SubjectUtils.shuffle(theme.blocks, random)[1] || theme.blocks[0], window.SubjectUtils.shuffle(theme.lightSource, random)[1] || theme.lightSource[0]], random) }
    ];
  } else if (theme.name === "声音世界") {
    var loudItem = theme.loud[day % theme.loud.length];
    var softItem = theme.soft[day % theme.soft.length];
    activities = [
      { title: "认识声音", hint: theme.concept, visual: loudItem + "  🔊 大声  ·  " + softItem + "  🔈 小声", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: loudItem + " 的声音大还是小？", hint: "想象一下这个声音", visual: loudItem, answer: "大声", options: ["大声", "小声"] },
      { title: softItem + " 的声音大还是小？", hint: "想象一下这个声音", visual: softItem, answer: "小声", options: ["大声", "小声"] },
      { title: "哪个声音大？", hint: "选出声音响亮的东西", visual: "🔊", answer: window.SubjectUtils.shuffle(theme.loud, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.loud, random)[0], window.SubjectUtils.shuffle(theme.soft, random)[0], window.SubjectUtils.shuffle(theme.loud, random)[1] || theme.loud[0], window.SubjectUtils.shuffle(theme.soft, random)[1] || theme.soft[0]], random) },
      { title: "哪个声音小？", hint: "选出声音轻柔的东西", visual: "🔈", answer: window.SubjectUtils.shuffle(theme.soft, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.soft, random)[0], window.SubjectUtils.shuffle(theme.loud, random)[0], window.SubjectUtils.shuffle(theme.soft, random)[1] || theme.soft[0], window.SubjectUtils.shuffle(theme.loud, random)[1] || theme.loud[0]], random) }
    ];
  } else if (theme.name === "冷与热") {
    var hotItem = theme.hot[day % theme.hot.length];
    var coldItem = theme.cold[day % theme.cold.length];
    activities = [
      { title: "认识冷与热", hint: theme.concept, visual: hotItem + "  🔥 热  ·  " + coldItem + "  ❄️ 冷", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: hotItem + " 是热的还是冷的？", hint: "想想它的温度", visual: hotItem, answer: "热的", options: ["热的", "冷的"] },
      { title: coldItem + " 是热的还是冷的？", hint: "想想它的温度", visual: coldItem, answer: "冷的", options: ["热的", "冷的"] },
      { title: "哪个是热的？", hint: "选出温度高的东西", visual: "🔥", answer: window.SubjectUtils.shuffle(theme.hot, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.hot, random)[0], window.SubjectUtils.shuffle(theme.cold, random)[0], window.SubjectUtils.shuffle(theme.hot, random)[1] || theme.hot[0], window.SubjectUtils.shuffle(theme.cold, random)[1] || theme.cold[0]], random) },
      { title: "哪个是冷的？", hint: "选出温度低的东西", visual: "❄️", answer: window.SubjectUtils.shuffle(theme.cold, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.cold, random)[0], window.SubjectUtils.shuffle(theme.hot, random)[0], window.SubjectUtils.shuffle(theme.cold, random)[1] || theme.cold[0], window.SubjectUtils.shuffle(theme.hot, random)[1] || theme.hot[0]], random) }
    ];
  } else if (theme.name === "快与慢") {
    var fastItem = theme.fast[day % theme.fast.length];
    var slowItem = theme.slow[day % theme.slow.length];
    activities = [
      { title: "认识快与慢", hint: theme.concept, visual: fastItem + "  💨 快  ·  " + slowItem + "  🐌 慢", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: fastItem + " 是快还是慢？", hint: "想想它的速度", visual: fastItem, answer: "快", options: ["快", "慢"] },
      { title: slowItem + " 是快还是慢？", hint: "想想它的速度", visual: slowItem, answer: "慢", options: ["快", "慢"] },
      { title: "哪个更快？", hint: "选出速度最快的东西", visual: "💨", answer: window.SubjectUtils.shuffle(theme.fast, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.fast, random)[0], window.SubjectUtils.shuffle(theme.slow, random)[0], window.SubjectUtils.shuffle(theme.fast, random)[1] || theme.fast[0], window.SubjectUtils.shuffle(theme.slow, random)[1] || theme.slow[0]], random) },
      { title: "哪个更慢？", hint: "选出速度最慢的东西", visual: "🐌", answer: window.SubjectUtils.shuffle(theme.slow, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.slow, random)[0], window.SubjectUtils.shuffle(theme.fast, random)[0], window.SubjectUtils.shuffle(theme.slow, random)[1] || theme.slow[0], window.SubjectUtils.shuffle(theme.fast, random)[1] || theme.fast[0]], random) }
    ];
  } else if (theme.name === "弹性与弹力") {
    var elasticItem = theme.elastic[day % theme.elastic.length];
    var inelasticItem = theme.inelastic[day % theme.inelastic.length];
    activities = [
      { title: "认识弹性", hint: theme.concept, visual: elasticItem + "  ⬅️➡️ 弹  ·  " + inelasticItem + "  ✗ 不弹", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: (elasticItem.split(" ")[1] || elasticItem) + " 有弹性吗？", hint: "压一压会不会弹回来？", visual: elasticItem, answer: "有弹性", options: ["有弹性", "没有弹性"] },
      { title: (inelasticItem.split(" ")[1] || inelasticItem) + " 有弹性吗？", hint: "压一压会不会弹回来？", visual: inelasticItem, answer: "没有弹性", options: ["有弹性", "没有弹性"] },
      { title: "哪个有弹性？", hint: "选出能弹回来的东西", visual: "🏀", answer: window.SubjectUtils.shuffle(theme.elastic, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.elastic, random)[0], window.SubjectUtils.shuffle(theme.inelastic, random)[0], window.SubjectUtils.shuffle(theme.elastic, random)[1] || theme.elastic[0], window.SubjectUtils.shuffle(theme.inelastic, random)[1] || theme.inelastic[0]], random) },
      { title: age >= 5 ? (elasticItem.split(" ")[1] || elasticItem) + " 被压扁后会怎样？" : "哪个没有弹性？", hint: age >= 5 ? "想一想弹性是什么" : "选出不能弹回来的东西", visual: age >= 5 ? "🤔" : "✗", answer: age >= 5 ? "弹回来" : window.SubjectUtils.shuffle(theme.inelastic, random)[0], options: age >= 5 ? ["弹回来", "保持扁的"] : window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.inelastic, random)[0], window.SubjectUtils.shuffle(theme.elastic, random)[0], window.SubjectUtils.shuffle(theme.inelastic, random)[1] || theme.inelastic[0], window.SubjectUtils.shuffle(theme.elastic, random)[1] || theme.elastic[0]], random) }
    ];
  } else if (theme.name === "摩擦力") {
    var smoothItem = theme.smooth[day % theme.smooth.length];
    var roughItem = theme.rough[day % theme.rough.length];
    activities = [
      { title: "认识摩擦力", hint: theme.concept, visual: smoothItem + "  ➡️ 滑  ·  " + roughItem + "  🛑 粗糙", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: (smoothItem.split(" ")[1] || smoothItem) + " 是光滑还是粗糙？", hint: "摸一摸它的表面", visual: smoothItem, answer: "光滑", options: ["光滑", "粗糙"] },
      { title: (roughItem.split(" ")[1] || roughItem) + " 是光滑还是粗糙？", hint: "摸一摸它的表面", visual: roughItem, answer: "粗糙", options: ["光滑", "粗糙"] },
      { title: "哪个更光滑？", hint: "选出表面最光滑的东西", visual: "🪞", answer: window.SubjectUtils.shuffle(theme.smooth, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.smooth, random)[0], window.SubjectUtils.shuffle(theme.rough, random)[0], window.SubjectUtils.shuffle(theme.smooth, random)[1] || theme.smooth[0], window.SubjectUtils.shuffle(theme.rough, random)[1] || theme.rough[0]], random) },
      { title: age >= 5 ? "在滑梯上为什么滑得快？" : "哪个更粗糙？", hint: age >= 5 ? "因为表面很光滑，摩擦力小" : "选出表面最粗糙的东西", visual: age >= 5 ? "🛝" : "🧗", answer: age >= 5 ? "因为表面光滑" : window.SubjectUtils.shuffle(theme.rough, random)[0], options: age >= 5 ? ["因为表面光滑", "因为表面粗糙"] : window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.rough, random)[0], window.SubjectUtils.shuffle(theme.smooth, random)[0], window.SubjectUtils.shuffle(theme.rough, random)[1] || theme.rough[0], window.SubjectUtils.shuffle(theme.smooth, random)[1] || theme.smooth[0]], random) }
    ];
  } else if (theme.name === "简单机械") {
    var toolItem = theme.tool[day % theme.tool.length];
    var notToolItem = theme.notTool[day % theme.notTool.length];
    activities = [
      { title: "认识简单机械", hint: theme.concept, visual: toolItem + "  ✅ 工具  ·  " + notToolItem + "  ✗ 不是工具", answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: (toolItem.split(" ")[1] || toolItem) + " 是工具吗？", hint: "它能不能帮我们做事？", visual: toolItem, answer: "是工具", options: ["是工具", "不是工具"] },
      { title: (notToolItem.split(" ")[1] || notToolItem) + " 是工具吗？", hint: "它能不能帮我们做事？", visual: notToolItem, answer: "不是工具", options: ["是工具", "不是工具"] },
      { title: "哪个是工具？", hint: "选出能帮我们省力的东西", visual: "⚙️", answer: window.SubjectUtils.shuffle(theme.tool, random)[0], options: window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.tool, random)[0], window.SubjectUtils.shuffle(theme.notTool, random)[0], window.SubjectUtils.shuffle(theme.tool, random)[1] || theme.tool[0], window.SubjectUtils.shuffle(theme.notTool, random)[1] || theme.notTool[0]], random) },
      { title: age >= 5 ? "轮子能帮我们做什么？" : "哪个不是工具？", hint: age >= 5 ? "想一想轮子的作用" : "选出不能帮我们省力的东西", visual: age >= 5 ? "🛞" : "🤔", answer: age >= 5 ? "让东西更容易移动" : window.SubjectUtils.shuffle(theme.notTool, random)[0], options: age >= 5 ? ["让东西更容易移动", "让东西变重"] : window.SubjectUtils.shuffle([window.SubjectUtils.shuffle(theme.notTool, random)[0], window.SubjectUtils.shuffle(theme.tool, random)[0], window.SubjectUtils.shuffle(theme.notTool, random)[1] || theme.notTool[0], window.SubjectUtils.shuffle(theme.tool, random)[1] || theme.tool[0]], random) }
    ];
  } else { // 颜色混合
    var mix = theme.mixes[day % theme.mixes.length];
    var colorKeys = Object.keys(theme.colors);
    var dayColor = colorKeys[day % colorKeys.length];
    var dayColorName = theme.colors[dayColor];
    var allColors = Object.values(theme.colors);
    activities = [
      { title: "认识颜色混合", hint: theme.concept, visual: mix.a + "  +  " + mix.b + "  =  " + mix.result, answer: "true", options: ["✓ 知道了", "再讲一遍"], learn: true },
      { title: mix.a + " 加 " + mix.b + " 会变成什么颜色？", hint: "两种颜色混合在一起", visual: mix.a + " + " + mix.b, answer: mix.result, options: window.SubjectUtils.shuffle([mix.result].concat(allColors.filter(function(c) { return c !== mix.result; }).slice(0, 3)), random) },
      { title: "橙色是怎么变出来的？", hint: "想一想，哪两种颜色混合？", visual: "🟠", answer: "红色加黄色", options: window.SubjectUtils.shuffle(["红色加黄色", "红色加蓝色", "蓝色加黄色", "白色加黑色"], random) },
      { title: "绿色是怎么变出来的？", hint: "想一想，哪两种颜色混合？", visual: "🟢", answer: "蓝色加黄色", options: window.SubjectUtils.shuffle(["蓝色加黄色", "红色加黄色", "红色加蓝色", "白色加黑色"], random) },
      { title: age >= 5 ? dayColorName + " 是什么颜色？" : "哪个是 " + dayColorName + "？", hint: "仔细观察颜色", visual: dayColor === "red" ? "🔴" : dayColor === "yellow" ? "🟡" : dayColor === "blue" ? "🔵" : dayColor === "orange" ? "🟠" : dayColor === "green" ? "🟢" : "🟣", answer: dayColorName, options: age >= 5 ? window.SubjectUtils.shuffle(allColors.slice(), random) : window.SubjectUtils.shuffle([dayColorName].concat(allColors.filter(function(c) { return c !== dayColorName; }).slice(0, 3)), random) }
    ];
  }

  return {
    subject: "physics",
    day: day,
    age: age,
    theme: theme,
    title: theme.name,
    subtitle: theme.emoji + " 物理启蒙 · " + age + " 岁阶段",
    activities: activities
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PHYSICS_THEMES: PHYSICS_THEMES, generateLesson: generateLesson };
}
if (typeof window !== "undefined") {
  window.PhysicsModule = { PHYSICS_THEMES: PHYSICS_THEMES, generateLesson: generateLesson };
}