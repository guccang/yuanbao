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

镜像仅复制 `index.html`、`app.js`、`styles.css`、`server.js`，并以非 root 的 `node` 用户运行，见 [`Dockerfile`](../../Dockerfile)。[`compose.yaml`](../../compose.yaml) 依赖运行环境注入 `CODINGHUB_IMAGE`、`CODINGHUB_HOST_PORT` 和 `CODINGHUB_CONTAINER_PORT`；这些变量未设置时能否直接使用 Compose 启动属于**待确认**。该配置会将状态保存到命名卷 `yuanbao-data`。

部署元数据将运行时标为 `node`、服务标为 `yuanbao`、容器端口标为 `8887`、健康检查路径标为 `/`，见 [`.codinghub/deploy.json`](../../.codinghub/deploy.json)。根目录 [`deploy.sh`](../../deploy.sh) 仅转发到 [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh)，后者要求由部署运行环境提供 Compose 项目、Compose 文件、服务名和镜像等变量，并执行 Docker Compose。因此在普通本地 shell 中直接运行该部署脚本的前提属于**待确认**；本地验证优先使用上方的 `docker run` 或在已提供相应变量的部署环境中执行。

## 验证与测试

当前仓库未提供自动化测试套件。可先执行语法检查：

```bash
node --check app.js
node --check server.js
```

启动服务后，执行只读冒烟检查：

```bash
curl -f http://127.0.0.1:8887/
curl -f http://127.0.0.1:8887/styles.css
curl -f http://127.0.0.1:8887/app.js
curl -f http://127.0.0.1:8887/api/state
```

使用隔离 `DATA_FILE` 进行 API 回归，至少覆盖以下场景；路由与校验依据见 [`server.js`](../../server.js)。

1. 写入资料后重启服务，确认 `GET /api/state` 仍返回资料。
2. 同日两次 `PUT /api/progress`，确认第二次覆盖第一条记录。
3. 提交无效年龄、无效日期、畸形 JSON 与超过 1 MiB 的请求，确认返回错误。
4. `DELETE /api/state` 后确认资料和记录为空。

需要人工验收的浏览器行为来自 [`app.js`](../../app.js) 和 [`styles.css`](../../styles.css)：

- 分别为 3、4、5、6 岁建档，检查课程数字范围。
- 中途刷新，检查断点恢复；完成后重玩，检查原成绩不变。
- 检查英语发音可用与不支持时的提示。
- 在服务端空状态且浏览器含旧数据时检查迁移。
- 检查窄屏、安全区、键盘焦点和清除数据确认流程。

目标浏览器及设备范围在仓库中未定义，属于**待确认**。

## 调试定位

| 现象 | 优先检查 | 依据 |
| --- | --- | --- |
| 页面显示“暂时无法打开” | `/api/state` 响应、服务端控制台、数据文件可读性 | [`app.js`](../../app.js) 的 `init`；[`server.js`](../../server.js) 的 `loadState` |
| 重启后资料或进度丢失 | `DATA_FILE` 的实际值、父目录写权限、容器是否挂载 `/data` | [`server.js`](../../server.js)、[`compose.yaml`](../../compose.yaml) |
| 恢复位置异常 | 当日未完成记录的 `activityIndex` 与 `answers` | [`app.js`](../../app.js) 的 `todayDraft`、`startLesson` |
| 同日课程变化 | 年龄、`startedAt`、浏览器本地日期与时区 | [`app.js`](../../app.js) 的 `localDate`、`dayNumber`、`makeLesson` |
| 英语没有声音 | `speechSynthesis` 支持、浏览器播放策略、系统语音 | [`app.js`](../../app.js) 的 `speak` |
| 容器健康检查失败 | 注入端口是否一致、根路径是否返回成功状态 | [`compose.yaml`](../../compose.yaml) |
| 部署脚本立即退出 | 部署环境是否提供脚本要求的 `CODINGHUB_*` 变量 | [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh) |

## 常见风险

| 风险 | 当前事实与影响 | 维护建议 |
| --- | --- | --- |
| 单资料、单进程 | 固定资料 ID 是 `main`，状态在单进程内存与单 JSON 文件中 | 不要在共享同一数据文件时横向扩容；扩容前先设计用户边界和共享存储 |
| API 无认证 | 所有状态接口没有鉴权，`DELETE` 可清空全部状态 | 仅部署在受控边界；公开访问前补认证、授权和跨站请求防护 |
| 进度校验较弱 | 服务端仅验证进度 `date`，其他字段由客户端维持 | 增加字段白名单、长度和嵌套结构校验 |
| HTML 注入 | 资料名称和记录内容经模板字符串进入 `innerHTML` | 外部数据应使用 `textContent` 或统一转义 |
| 本地日期依赖 | 天数、同日记录和连续打卡按浏览器本地时间计算 | 覆盖跨时区、夏令时与改系统时钟场景；统一时间语义前标为**待确认** |
| 异常数据文件 | 读取失败会使用空内存状态，后续保存可能覆盖原文件 | 对生产卷做备份并监控读取错误；考虑阻止对解析失败文件的覆盖 |
| 自动化覆盖缺失 | 当前只有手动命令和人工验收建议 | 优先补 API 集成测试，再覆盖课程确定性和统计函数 |

每次改动课程、记录或 API 时，请结合[运行流程](./flows.md)核对断点与完成记录两种形态，并按本页完成相应验证。
