# 项目概览

## 项目目标

元宝成长乐园是一个面向 3–6 岁儿童的移动端优先数学与英语启蒙 Web 应用。它按儿童年龄与学习天数在浏览器生成每天一节课：固定包含 3 个数学活动与 3 个英语活动，并保存资料、答题断点、完成记录、正确率、星星和连续学习天数。产品定位与活动数量见 [`README.md`](../../README.md) 和 [`app.js`](../../app.js) 的 `makeLesson`、`renderProgress`。

本文的结论以仓库当前文件为准；未由文件定义的运行条件均标为**待确认**。接口和状态细节在[架构说明](./architecture.md)，运行时顺序在[运行流程](./flows.md)，命令与验收方式在[开发指南](./development.md)。

## 技术栈

| 层次 | 当前实现 | 依据 |
| --- | --- | --- |
| 页面与样式 | HTML5 与原生 CSS；页面挂载点为 `#app`，状态提示为 `#toast` | [`index.html`](../../index.html)、[`styles.css`](../../styles.css) |
| 客户端 | 原生 JavaScript：内存状态、DOM 渲染、课程生成、Fetch 调用 | [`app.js`](../../app.js) |
| 浏览器能力 | Fetch、IndexedDB（旧数据迁移）、Web Speech API（英语发音） | [`app.js`](../../app.js) |
| 服务端 | Node.js CommonJS，仅使用内置 `http`、`fs`、`path` | [`server.js`](../../server.js) |
| 持久化 | 进程内状态加一个 UTF-8 JSON 文件，默认 `data/yuanbao.json` | [`server.js`](../../server.js)、[`README.md`](../../README.md) |
| 容器 | `node:22-alpine`、`node` 用户、Compose 命名卷 | [`Dockerfile`](../../Dockerfile)、[`compose.yaml`](../../compose.yaml) |

仓库未包含 `package.json`、依赖锁文件、前端构建配置或测试框架；因此当前没有依赖安装和资源编译步骤。这是基于根目录文件清单得出的结论。

## 目录职责

当前业务代码直接位于仓库根目录。

| 路径 | 职责 |
| --- | --- |
| [`index.html`](../../index.html) | HTML 外壳、移动端 viewport、加载样式与客户端脚本 |
| [`app.js`](../../app.js) | 课程内容与生成、客户端状态、视图渲染、答题、统计、API 访问和旧 IndexedDB 迁移 |
| [`styles.css`](../../styles.css) | 视觉变量、布局、组件、响应式与动效样式 |
| [`server.js`](../../server.js) | 静态文件服务、状态 API、输入校验及 JSON 文件持久化 |
| [`Dockerfile`](../../Dockerfile) | 生产镜像；复制四个运行所需文件并以 `node server.js` 启动 |
| [`compose.yaml`](../../compose.yaml) | 容器端口映射、`/data/yuanbao.json` 数据路径、健康检查与 `yuanbao-data` 卷 |
| [`.codinghub/deploy.json`](../../.codinghub/deploy.json) | CodingHub 部署元数据：运行时、构建上下文、Compose 服务、容器端口与健康检查路径 |
| [`deploy.sh`](../../deploy.sh) 与 [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh) | 仓库根部署入口及其转发的 `deploy` / `stop` 操作 |
| [`docs/codinghub/`](./) | 本组面向维护者的长期文档 |

`data/` 是服务端首次写入时按需创建的运行时目录，不是当前仓库中的已提交目录，见 [`server.js`](../../server.js) 的 `persistState`。

## 主要入口

1. 执行 `node server.js` 进入服务端入口；监听地址是 `0.0.0.0`，端口来自 `PORT`，默认 `8887`，见 [`server.js`](../../server.js)。
2. 根路径 `/` 被映射为 [`index.html`](../../index.html)，页面加载 [`styles.css`](../../styles.css) 与 [`app.js`](../../app.js)。
3. [`app.js`](../../app.js) 末尾的 `init()` 请求 `GET /api/state`；随后渲染首次建档页或首页，且仅在服务端尚无资料时尝试旧 IndexedDB 迁移。
4. 容器入口是 [`Dockerfile`](../../Dockerfile) 中的 `CMD ["node", "server.js"]`；Compose 通过环境变量提供端口并挂载数据卷，见 [`compose.yaml`](../../compose.yaml)。
5. 部署编排入口是根目录的 [`deploy.sh`](../../deploy.sh)，它将命令转发给 [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh)；服务名、容器端口和根路径健康检查在 [`.codinghub/deploy.json`](../../.codinghub/deploy.json) 中声明。

## 文档导航

- [架构说明](./architecture.md)：模块边界、依赖方向、数据结构和 API 契约。
- [运行流程](./flows.md)：初始化、每日学习、写入和清除的时序与数据流。
- [开发指南](./development.md)：本地运行、容器构建、验证、调试和维护风险。
