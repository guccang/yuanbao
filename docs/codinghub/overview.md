# 项目概览

## 项目目标

“元宝成长乐园”是面向 3–6 岁儿童的移动端优先启蒙应用。应用按儿童年龄生成每日一课，每课包含 3 个数学互动与 3 个英语互动，并记录课程断点、完成情况、正确率、星星和连续学习天数。产品定位与现有能力以 [`README.md`](../../README.md)、[`app.js`](../../app.js) 的 `makeLesson`、`renderProgress` 和 [`index.html`](../../index.html) 的页面元信息为依据。

## 技术栈

| 层次 | 技术与职责 | 仓库依据 |
| --- | --- | --- |
| 页面 | 原生 HTML5，提供挂载点和静态资源入口 | [`index.html`](../../index.html) |
| 交互与课程 | 原生浏览器 JavaScript；单一内存状态、模板字符串渲染、确定性课程生成 | [`app.js`](../../app.js) |
| 样式 | 原生 CSS；响应式布局、触控尺寸、动画与 `prefers-reduced-motion` | [`styles.css`](../../styles.css) |
| 浏览器能力 | Fetch、IndexedDB（仅旧数据迁移）、Web Speech API | [`app.js`](../../app.js) |
| 服务端 | Node.js CommonJS；只使用内置 `http`、`fs`、`path` 模块 | [`server.js`](../../server.js) |
| 持久化 | 进程内状态加单个 JSON 文件，默认 `data/yuanbao.json` | [`server.js`](../../server.js)、[`README.md`](../../README.md) |
| 容器 | `node:22-alpine`、非 root 用户、Docker Compose 命名卷 | [`Dockerfile`](../../Dockerfile)、[`compose.yaml`](../../compose.yaml) |

仓库没有 `package.json`、依赖锁文件或前端构建配置；因此当前没有依赖安装与资源编译阶段。该结论也与 [`.codinghub/dev/environment.json`](../../.codinghub/dev/environment.json) 的开发环境说明一致。

## 目录与文件职责

当前业务代码位于仓库根目录，未拆分为源码子目录。

| 路径 | 职责 |
| --- | --- |
| [`index.html`](../../index.html) | HTML 壳、可访问性状态区域、加载 CSS 和浏览器脚本 |
| [`app.js`](../../app.js) | 课程题库与生成、客户端状态、视图渲染、答题交互、统计、API 调用及旧 IndexedDB 迁移 |
| [`styles.css`](../../styles.css) | 全站视觉变量、组件样式、响应式与动效降级 |
| [`server.js`](../../server.js) | 静态文件服务、状态 API、请求校验和 JSON 文件持久化 |
| [`data/`](../../data/) | 运行时数据目录；被 `.gitignore` 排除，首次写入时创建 |
| [`Dockerfile`](../../Dockerfile) | 生产镜像定义，仅复制四个运行必需文件 |
| [`compose.yaml`](../../compose.yaml) | 服务、端口、健康检查和 `yuanbao-data` 持久卷 |
| [`.codinghub/`](../../.codinghub/) | CodingHub 的开发环境与部署元数据、部署脚本 |
| [`docs/codinghub/`](./) | 面向维护者的长期项目文档 |

## 主要入口

1. 服务端入口是 [`server.js`](../../server.js)：执行 `node server.js` 后监听 `0.0.0.0`，端口来自 `PORT`，默认 `8887`。
2. HTTP 根路径由服务端映射到 [`index.html`](../../index.html)。
3. 页面加载 [`app.js`](../../app.js)，末尾调用 `init()`：先读取 `/api/state`，必要时迁移旧 IndexedDB 数据，再按是否存在资料渲染引导页或首页。
4. 容器入口由 [`Dockerfile`](../../Dockerfile) 的 `CMD ["node", "server.js"]` 定义；平台部署入口见 [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh)。

## 文档导航

- 模块边界、依赖方向和数据模型：[架构说明](./architecture.md)
- 初始化、学习、持久化与迁移链路：[运行流程](./flows.md)
- 本地运行、验证、调试和风险：[开发指南](./development.md)

