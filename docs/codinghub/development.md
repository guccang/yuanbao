# 开发指南

本文提供当前仓库可验证的本地开发和维护方法。系统结构请先参阅[项目概览](./overview.md)与[架构说明](./architecture.md)，状态链路请参阅[运行流程](./flows.md)。

## 环境与本地运行

生产镜像使用 Node.js 22 Alpine，见 [`Dockerfile`](../../Dockerfile)。本机使用何种 Node.js 版本没有单独的版本管理文件；与 Node.js 22 是否完全一致属于**待确认**。仓库没有 `package.json`、锁文件、任务脚本或测试框架，因此不需要安装 npm 依赖，也没有可执行的 `npm run build` 或 `npm test`。

在根目录启动：

```bash
node server.js
```

访问 `http://localhost:8887/`。默认端口和数据位置在 [`server.js`](../../server.js) 中分别是 `8887` 与 `data/yuanbao.json`。开发时可隔离数据文件，避免复用默认路径：

```bash
PORT=18887 DATA_FILE=/tmp/yuanbao-dev.json node server.js
```

`SOURCE_DIR` 改变静态文件根目录，`DATA_FILE` 改变状态文件位置，均由 [`server.js`](../../server.js) 读取。

## 构建与容器运行

项目没有前端编译步骤；构建是创建运行镜像：

```bash
docker build -t yuanbao:dev .
docker run --rm -p 8887:8887 -v yuanbao-dev-data:/data \
  -e PORT=8887 -e DATA_FILE=/data/yuanbao.json yuanbao:dev
```

镜像复制 `index.html`、`app.js`、`styles.css`、`server.js` 和 `modules/` 目录，并以非 root 的 `node` 用户运行，见 [`Dockerfile`](../../Dockerfile)。[`compose.yaml`](../../compose.yaml) 依赖运行环境注入 `CODINGHUB_IMAGE`、`CODINGHUB_HOST_PORT` 和 `CODINGHUB_CONTAINER_PORT`；这些变量未设置时能否直接使用 Compose 启动属于**待确认**。该配置会将状态保存到命名卷 `yuanbao-data`。

开发用 Dockerfile 位于 [`.codinghub/dev/Dockerfile`](../../.codinghub/dev/Dockerfile)，与生产镜像共享 `node:22-alpine` 基础镜像，仅设置 `NODE_ENV=development`，见 [`.codinghub/dev/environment.json`](../../.codinghub/dev/environment.json)。

部署元数据将运行时标为 `node`、服务标为 `yuanbao`、容器端口标为 `8887`、健康检查路径标为 `/`，见 [`.codinghub/deploy.json`](../../.codinghub/deploy.json)。根目录 [`deploy.sh`](../../deploy.sh) 仅转发到 [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh)，后者要求由部署运行环境提供 Compose 项目、Compose 文件、服务名和镜像等变量，并执行 Docker Compose。因此在普通本地 shell 中直接运行该部署脚本的前提属于**待确认**；本地验证优先使用上方的 `docker run` 或在已提供相应变量的部署环境中执行。

## 验证与测试

当前仓库未提供自动化测试套件。可先执行语法检查（覆盖全部 5 个 JS 文件）：

```bash
node --check app.js
node --check server.js
node --check modules/math.js
node --check modules/physics.js
node --check modules/english.js
```

启动服务后，执行只读冒烟检查（含新增的学科模块路径）：

```bash
curl -f http://127.0.0.1:8887/
curl -f http://127.0.0.1:8887/styles.css
curl -f http://127.0.0.1:8887/app.js
curl -f http://127.0.0.1:8887/modules/math.js
curl -f http://127.0.0.1:8887/modules/physics.js
curl -f http://127.0.0.1:8887/modules/english.js
curl -f http://127.0.0.1:8887/api/state
```

使用隔离 `DATA_FILE` 进行 API 回归，至少覆盖以下场景；路由与校验依据见 [`server.js`](../../server.js)。

1. **注册**：`POST /api/auth/register` 创建账户，确认返回 `201` 和 `profile`。
2. **登录**：`POST /api/auth/login` 使用正确凭据，确认返回 `200` 和 `profile`。
3. **登录失败**：使用错误密码，确认返回 `401`。
4. **状态读取**：`GET /api/state` 携带 Cookie，确认返回完整状态。
5. **写入资料**：`PUT /api/profile` 更新资料后重启服务，确认 `GET /api/state` 仍返回资料。
6. **进度覆盖**：同日两次 `PUT /api/progress`，确认第二次覆盖第一条记录。
7. **进度校验**：提交无效 `date`、无效 `subject`、畸形 JSON 与超过 1 MiB 的请求，确认分别返回 400/413 错误。
8. **课表操作**：`PUT /api/schedule` 更新后 `GET /api/schedule` 确认变更。
9. **数据清除**：`DELETE /api/state` 后确认记录为空。
10. **导出报告**：`GET /api/export/html` 确认返回 HTML 文档。
11. **列出账户**：`GET /api/accounts` 确认返回账户列表。
12. **登出**：`POST /api/auth/logout` 后 `GET /api/state` 确认返回 `401`。

需要人工验收的浏览器行为来自 [`app.js`](../../app.js) 和 [`styles.css`](../../styles.css)：

- 分别为 3、4、5、6 岁建档，检查课程数字范围对应变化（3 岁 ≤5 / 4 岁 ≤8 / 5 岁 ≤12 / 6 岁 ≤20）。
- 首次注册页检查宝宝小名输入框是否预填默认值 `"元宝"`。
- 在数学/物理/英语三个学科各完成一节课程，检查每节包含 5 个活动。
- 中途刷新，检查断点恢复（恢复 `activityIndex` 和 `answers`）；完成后重玩，检查原成绩不变。
- 检查英语发音、答题音效与振动反馈在可用时生效，并在浏览器不支持时仍可继续学习。
- 答对题目时检查：彩带粒子（30 个）从中心扩散、庆祝徽章弹出并显示随机车辆主题文案、合成音效播放（上行音阶 + 车辆主题音）。
- 课程完成时检查：奖牌页面、全屏粒子庆祝（24 个）、四音阶完成音效、三段式振动。
- 在服务端空状态且浏览器含旧 IndexedDB 数据时检查迁移。
- 课表编辑：逐日编辑学科组合、恢复默认课表。
- 检查窄屏、安全区、键盘焦点和清除数据确认流程。
- 检查 `prefers-reduced-motion: reduce` 时动画是否被禁用。
- 检查退出登录功能和导出学习报告功能。

目标浏览器及设备范围在仓库中未定义，属于**待确认**。

## 调试定位

| 现象 | 优先检查 | 依据 |
| --- | --- | --- |
| 页面显示"暂时无法打开" | `/api/state` 响应、服务端控制台、数据文件可读性 | [`app.js`](../../app.js) 的 `init`；[`server.js`](../../server.js) 的 `loadState` |
| 登录/注册失败 | 用户名长度 ≥2、密码长度 ≥4、年龄 3–6、Cookie 设置 | [`server.js`](../../server.js) 的 `/api/auth/register` 和 `/api/auth/login` |
| 重启后资料或进度丢失 | `DATA_FILE` 的实际值、父目录写权限、容器是否挂载 `/data` | [`server.js`](../../server.js)、[`compose.yaml`](../../compose.yaml) |
| 学科模块加载失败（404） | 生产镜像是否包含 `modules/` 目录、`index.html` 的 `<script>` 标签顺序 | [`Dockerfile`](../../Dockerfile)、[`index.html`](../../index.html) |
| 恢复位置异常 | 当日未完成记录的 `activityIndex` 与 `answers` | [`app.js`](../../app.js) 的 `todayDraftSubject`、`startSubjectLesson` |
| 同日课程变化 | 年龄、`startedAt`、浏览器本地日期与时区 | [`app.js`](../../app.js) 的 `localDate`、`computeSubjectDays`、`makeSubjectLesson` |
| 英语没有声音 | `speechSynthesis` 支持、浏览器播放策略、系统语音 | [`app.js`](../../app.js) 的 `speak` |
| 答对后无庆祝特效 | Web Audio API 可用性、`AudioContext` 状态（需用户手势后 `resume`）、浏览器是否阻止自动播放 | [`app.js`](../../app.js) 的 `playFeedbackSound`、`celebrateWithParticles`、`showSuccessBadge` |
| 容器健康检查失败 | 注入端口是否一致、根路径是否返回成功状态 | [`compose.yaml`](../../compose.yaml) |
| 部署脚本立即退出 | 部署环境是否提供脚本要求的 `CODINGHUB_*` 变量 | [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh) |
| 课程内容不完整 | 学科模块是否通过 `window` 全局正确暴露、`loadSubjectModule` 返回值 | [`app.js`](../../app.js) 的 `loadSubjectModule`、`makeSubjectLesson` |
| 课表页面异常 | `schedule` 对象键值格式、默认值回退 | [`app.js`](../../app.js) 的 `renderSchedule`、[`server.js`](../../server.js) 的 `DEFAULT_SCHEDULE` |

## 常见风险

| 风险 | 当前事实与影响 | 维护建议 |
| --- | --- | --- |
| 单进程文件存储 | 多账户状态在同一进程内存与单 JSON 文件中 | 不要在共享同一数据文件时横向扩容；扩容前先设计用户边界和共享存储 |
| API 认证范围 | 除认证接口外，其他 API 需 Cookie 会话；会话令牌为随机 32 字节 hex | 仅部署在受控边界；公开访问前补 CSRF 防护和速率限制 |
| 进度校验较弱 | 服务端仅验证进度 `date` 和 `subject`，其他字段由客户端维持 | 增加字段白名单、长度和嵌套结构校验 |
| HTML 注入 | 资料名称和记录内容经模板字符串进入 `innerHTML` | 外部数据应使用 `textContent` 或统一转义 |
| 本地日期依赖 | 天数、同日记录和连续打卡按浏览器本地时间计算 | 覆盖跨时区、夏令时与改系统时钟场景；统一时间语义前标为**待确认** |
| 异常数据文件 | 读取失败会使用空内存状态，后续保存可能覆盖原文件 | 对生产卷做备份并监控读取错误；考虑阻止对解析失败文件的覆盖 |
| 自动化覆盖缺失 | 当前只有手动命令和人工验收建议 | 优先补 API 集成测试，再覆盖课程确定性和统计函数 |
| 音效自动播放限制 | 浏览器可能阻止 `AudioContext` 在无用户手势时播放；代码已处理 `suspended` 状态恢复 | 在自动播放策略严格的浏览器（如移动端 Safari）中人工验证 |
| 会话固定 | 7 天固定有效期，无续期机制 | 考虑增加滑动过期或刷新令牌 |
| 学科模块全局污染 | 模块通过 `window.MathModule` 等全局变量暴露，无模块系统隔离 | 如需增加模块，考虑引入 ES 模块或 IIFE 封装 |

每次改动课程、记录或 API 时，请结合[运行流程](./flows.md)核对断点与完成记录两种形态，并按本页完成相应验证。