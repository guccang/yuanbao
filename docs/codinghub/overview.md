# 项目概览

## 项目目标

元宝成长乐园是一个面向 3–6 岁儿童的移动端优先数学、物理与英语启蒙 Web 应用。每天按可配置课表自动安排学科课程，每节课程包含 5 个互动活动，依据儿童年龄（3/4/5/6 岁）动态调整难度。系统支持多账户注册登录、会话持久化、学习进度断点恢复、星星收集与连续打卡统计，答对时触发合成音效与粒子庆祝特效。详见 [`README.md`](../../README.md) 和 [`app.js`](../../app.js)。

本文的结论以仓库当前文件为准；未由文件定义的运行条件均标为**待确认**。接口和状态细节在[架构说明](./architecture.md)，运行时顺序在[运行流程](./flows.md)，命令与验收方式在[开发指南](./development.md)。

## 技术栈

| 层次 | 当前实现 | 依据 |
| --- | --- | --- |
| 页面与样式 | HTML5 与原生 CSS；页面挂载点为 `#app`，状态提示为 `#toast` | [`index.html`](../../index.html)、[`styles.css`](../../styles.css) |
| 客户端 | 原生 JavaScript：内存状态管理、DOM 渲染、课程生成、Fetch API 调用、Web Audio 合成音效 | [`app.js`](../../app.js) |
| 学科模块 | 三个独立 JS 模块（数学/物理/英语），各自提供确定性课程生成 | [`modules/math.js`](../../modules/math.js)、[`modules/physics.js`](../../modules/physics.js)、[`modules/english.js`](../../modules/english.js) |
| 浏览器能力 | Fetch、IndexedDB（旧数据迁移）、Web Speech API（英语发音）、Web Audio API（合成音效与车辆主题音效）、Vibration API（振动反馈） | [`app.js`](../../app.js) 的 `api`、`migrateLegacyState`、`speak`、`playFeedbackSound`、`playVehicleSound`、`showAnswerEffect` |
| 服务端 | Node.js CommonJS，仅使用内置 `http`、`fs`、`path`、`crypto` 模块 | [`server.js`](../../server.js) |
| 持久化 | 进程内状态加一个 UTF-8 JSON 文件，默认 `data/yuanbao.json`；写入采用临时文件 + rename 策略 | [`server.js`](../../server.js)、[`README.md`](../../README.md) |
| 容器 | `node:22-alpine`、`node` 用户运行、Compose 命名卷 | [`Dockerfile`](../../Dockerfile)、[`compose.yaml`](../../compose.yaml) |

仓库未包含 `package.json`、依赖锁文件、前端构建配置或测试框架；因此不需要依赖安装和资源编译步骤。这是基于根目录文件清单得出的结论。

## 课程数据规模

| 模块 | 主题/词汇数 | 输出规格 | 依据 |
| --- | --- | --- | --- |
| 数学 | 10 套主题（果园/海洋/太空/动物/花园/汽车/甜点/积木/恐龙/天气） | 每课 5 个活动，年龄决定数字范围（3 岁 ≤5 / 4 岁 ≤8 / 5 岁 ≤12 / 6 岁 ≤20） | [`modules/math.js`](../../modules/math.js) |
| 物理 | 8 套主题（浮沉/轻重/推拉/磁铁/光影/声音/冷热/快慢） | 每课 5 个活动，按主题分支选用不同题型模板 | [`modules/physics.js`](../../modules/physics.js) |
| 英语 | 72 个单词，分 10 组（食物/动物/颜色/自然/交通/数字/身体/家庭/衣物/天气） | 每课 5 个活动，围绕"听→认→读→用"四步递进 | [`modules/english.js`](../../modules/english.js) |

课程生成使用确定性伪随机数 `seeded(day * PRIME + age * PRIME)`，同一 day + age 组合必定产生相同课程。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| [`index.html`](../../index.html) | HTML 外壳、移动端 viewport、加载样式与学科模块脚本 |
| [`app.js`](../../app.js) | 客户端核心：状态管理、视图渲染、课程协调、答题交互、音效与庆祝特效、统计计算、API 访问、旧 IndexedDB 迁移 |
| [`styles.css`](../../styles.css) | 视觉变量（CSS 自定义属性）、全局布局、组件样式、响应式、动效与粒子庆祝动画 |
| [`server.js`](../../server.js) | HTTP 服务：静态文件分发、API 路由、账户注册/登录/登出、输入校验、会话管理、JSON 文件持久化、HTML 报告导出 |
| [`modules/math.js`](../../modules/math.js) | 数学课程生成模块（10 套主题，5 个活动：数数/比多少/数字规律/形状或加法/综合挑战） |
| [`modules/physics.js`](../../modules/physics.js) | 物理启蒙课程生成模块（8 套主题，每课 5 个活动） |
| [`modules/english.js`](../../modules/english.js) | 英语课程生成模块（72 词，每课 5 个活动：新词介绍/听音识图/中译英/看词选图/复习） |
| [`Dockerfile`](../../Dockerfile) | 生产镜像；复制 `index.html`、`app.js`、`styles.css`、`server.js`、`modules/` 并以 `node server.js` 启动 |
| [`compose.yaml`](../../compose.yaml) | 容器端口映射、`/data/yuanbao.json` 数据路径、健康检查与 `yuanbao-data` 持久卷 |
| [`.codinghub/deploy.json`](../../.codinghub/deploy.json) | CodingHub 部署元数据：运行时、构建上下文、Compose 服务、容器端口与健康检查路径 |
| [`deploy.sh`](../../deploy.sh) 与 [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh) | 仓库根部署入口及其转发的 `deploy` / `stop` 操作 |
| [`.codinghub/dev/Dockerfile`](../../.codinghub/dev/Dockerfile) | 开发容器镜像，与生产镜像共享 `node:22-alpine` 基础，仅设置 `NODE_ENV=development` |
| [`.codinghub/dev/environment.json`](../../.codinghub/dev/environment.json) | 开发环境元数据：项目类型、验证命令、运行风险摘要 |
| [`docs/codinghub/`](./) | 本组面向维护者的长期文档 |

`data/` 是服务端首次写入时按需创建的运行时目录，不是当前仓库中已提交的目录，见 [`server.js`](../../server.js) 的 `persistState`。

## 主要入口

1. 执行 `node server.js` 进入服务端入口；监听地址是 `0.0.0.0`，端口来自 `PORT`，默认 `8887`，见 [`server.js`](../../server.js)。
2. 根路径 `/` 被映射为 [`index.html`](../../index.html)，页面依次加载 [`styles.css`](../../styles.css)、三个学科模块（`modules/math.js`、`modules/physics.js`、`modules/english.js`）和 [`app.js`](../../app.js)。
3. [`app.js`](../../app.js) 末尾的 `init()` 先请求 `GET /api/state` 检测登录状态；已登录直接进入首页，未登录显示登录/注册页面；注册时宝宝小名输入框预填默认值 `"元宝"`。
4. 旧 IndexedDB 迁移仅在服务端无资料且存在旧数据时触发；迁移完成后不自动删除旧数据库。
5. 容器入口是 [`Dockerfile`](../../Dockerfile) 中的 `CMD ["node", "server.js"]`；Compose 通过环境变量提供端口并挂载数据卷，见 [`compose.yaml`](../../compose.yaml)。
6. 部署编排入口是根目录的 [`deploy.sh`](../../deploy.sh)，它将命令转发给 [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh)；服务名、容器端口和根路径健康检查在 [`.codinghub/deploy.json`](../../.codinghub/deploy.json) 中声明。

## 文档导航

- [架构说明](./architecture.md)：模块边界、依赖方向、数据结构和 API 契约。
- [运行流程](./flows.md)：初始化、每日学习、庆祝反馈、写入和清除的时序与数据流。
- [开发指南](./development.md)：本地运行、容器构建、验证、调试和维护风险。