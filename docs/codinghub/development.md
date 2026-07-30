# 开发指南

## 环境前提

当前项目无需安装 npm 依赖。生产和 CodingHub 开发镜像均以 Node.js 22 Alpine 为基线，依据为 [`Dockerfile`](../../Dockerfile) 与 [`.codinghub/dev/Dockerfile`](../../.codinghub/dev/Dockerfile)。本机开发建议使用 Node.js 22；更高版本是否完全兼容属于**待确认**。

如需容器验证，还需 Docker 与 Docker Compose。仓库没有 `package.json`、依赖锁文件、测试框架或任务脚本，不能使用 `npm install`、`npm test`、`npm run build` 等约定命令。

## 本地运行

在仓库根目录执行：

```bash
node server.js
```

然后访问 `http://localhost:8887/`。默认值来自 [`server.js`](../../server.js)，也可通过环境变量调整：

```bash
PORT=18887 DATA_FILE=/tmp/yuanbao-dev.json node server.js
```

PowerShell 示例：

```powershell
$env:PORT = "18887"
$env:DATA_FILE = Join-Path $env:TEMP "yuanbao-dev.json"
node server.js
```

`SOURCE_DIR` 可改变静态文件根目录，`DATA_FILE` 可改变状态文件位置。开发时应使用独立临时数据文件，避免覆盖默认 `data/yuanbao.json`。变量读取与默认值见 [`server.js`](../../server.js)。

## 构建与容器运行

项目没有前端编译步骤；“构建”仅指创建生产镜像：

```bash
docker build -t yuanbao:dev .
docker run --rm -p 8887:8887 -v yuanbao-dev-data:/data \
  -e PORT=8887 -e DATA_FILE=/data/yuanbao.json yuanbao:dev
```

镜像以 `node` 用户运行，只复制 `index.html`、`app.js`、`styles.css`、`server.js`，依据为 [`Dockerfile`](../../Dockerfile)。平台 Compose 依赖外部注入的 `CODINGHUB_IMAGE`、`CODINGHUB_HOST_PORT` 和 `CODINGHUB_CONTAINER_PORT`，不适合在未设置这些变量时直接运行，见 [`compose.yaml`](../../compose.yaml)。平台部署约定见 [`.codinghub/deploy.json`](../../.codinghub/deploy.json) 和 [`.codinghub/deploy.sh`](../../.codinghub/deploy.sh)。

## 验证与测试

### 自动检查

仓库当前提供的是开发环境元数据中的验证命令，而非独立测试套件，见 [`.codinghub/dev/environment.json`](../../.codinghub/dev/environment.json)。最小语法检查：

```bash
node --check app.js
node --check server.js
```

启动服务后可做只读冒烟检查：

```bash
curl -f http://127.0.0.1:8887/
curl -f http://127.0.0.1:8887/styles.css
curl -f http://127.0.0.1:8887/app.js
curl -f http://127.0.0.1:8887/api/state
```

API 写入回归应为 `DATA_FILE` 指定隔离文件，覆盖以下路径：

1. `PUT /api/profile` 后重启服务，确认资料仍可读取。
2. `PUT /api/progress` 同日写入两次，确认第二次覆盖而不是新增。
3. 提交无效年龄、无效日期、畸形 JSON 与超过 1 MiB 的请求，确认错误码。
4. `DELETE /api/state` 后确认资料和记录均为空。

### 浏览器人工验收

以下能力没有自动化覆盖，属于每次相关改动后的必要人工检查：

- 3、4、5、6 岁分别生成合理的数字范围。
- 答题后刷新页面可恢复断点，完成后重玩不覆盖成绩。
- 英语朗读在目标浏览器可用，不支持时提示正确。
- IndexedDB 旧资料在服务端为空时完成迁移。
- 手机窄屏、安全区、键盘焦点和“减少动态效果”设置。
- 清除数据的确认、服务端清空和旧 IndexedDB 删除。

依据为 [`app.js`](../../app.js) 的课程、语音、迁移与清除逻辑，以及 [`styles.css`](../../styles.css) 的响应式和 `prefers-reduced-motion` 规则。目标浏览器清单在仓库中未定义，属于**待确认**。

## 调试定位

| 现象 | 优先检查 | 依据 |
| --- | --- | --- |
| 页面显示“暂时无法打开” | 浏览器 Network 中 `/api/state` 响应、服务端控制台、数据文件读取权限 | [`app.js`](../../app.js) 的 `init`；[`server.js`](../../server.js) 的 `loadState` |
| 资料或进度重启后丢失 | `DATA_FILE` 实际值、父目录写权限、Compose 卷是否挂载到 `/data` | [`server.js`](../../server.js)、[`compose.yaml`](../../compose.yaml) |
| 课程恢复位置异常 | `/api/state` 中当天未完成记录的 `activityIndex` 与 `answers` | [`app.js`](../../app.js) 的 `todayDraft`、`startLesson` |
| 同一天课程变化 | 资料年龄、`startedAt`、客户端本地日期和时区 | [`app.js`](../../app.js) 的 `localDate`、`dayNumber`、`makeLesson` |
| 英语无声音 | `speechSynthesis` 支持、浏览器自动播放策略、系统语音 | [`app.js`](../../app.js) 的 `speak` |
| 容器健康检查失败 | 注入端口是否一致、根路径是否返回 2xx | [`compose.yaml`](../../compose.yaml) |

服务端日志只输出启动地址、读取失败和请求异常，没有结构化日志或日志级别配置；进一步可观测性方案属于**待确认**。

## 常见风险与维护约束

| 风险 | 当前事实与影响 | 维护建议 |
| --- | --- | --- |
| 单用户、单进程模型 | 固定资料 ID 为 `main`，完整状态驻留单进程并写单文件；多副本会各自持有不同内存状态 | 不要横向扩容或多进程共享该文件；扩容前引入共享存储与用户边界 |
| API 无认证 | 所有状态接口均未鉴权，`DELETE` 可清空全部数据 | 仅部署在受控边界；公开访问前补充认证、授权与防跨站请求策略 |
| 输入契约较弱 | 进度接口只校验日期；资料名称仅校验字符串类型，API 未限制长度 | 增加服务端字段白名单、长度和嵌套结构校验 |
| HTML 注入风险 | 资料名称等数据通过模板字符串写入 `innerHTML` | 将外部数据改用 `textContent` 或统一转义后再公开部署 |
| 日期依赖客户端 | 学习天数、同日记录和连续打卡按浏览器本地时间计算 | 测试跨时区、夏令时和手动改时钟场景；统一时间语义前标记为**待确认** |
| 数据文件故障处理 | 启动读取失败会退回空内存状态；随后写入可能覆盖原有异常文件 | 写入前监控错误并备份持久卷；考虑显式阻止对不可解析文件的覆盖 |
| 错误边界有限 | URL 解码发生在 API 的 `try/catch` 外；客户端写操作多数没有局部失败恢复 | 增加统一服务端请求错误边界和客户端保存失败提示 |
| 无自动化测试 | 当前只有语法与静态资源冒烟检查 | 优先补 API 集成测试，再覆盖课程确定性和统计函数 |
| 课程内容耦合单文件 | 内容、状态、渲染和 API 适配都在 `app.js` | 扩展内容前先定义模块边界；拆分方式取决于是否引入构建工具，属于**待确认** |

## 修改检查清单

1. 阅读[项目概览](./overview.md)确认入口影响范围，并用[架构说明](./architecture.md)核对依赖方向。
2. 修改课程或记录结构时，同步检查[运行流程](./flows.md)中的断点与完成记录两种形态。
3. 执行语法检查和静态资源/API 冒烟。
4. 对受影响的浏览器能力完成人工验收。
5. 确认未提交 `data/`、临时文件、日志或环境变量文件；排除规则见 [`.gitignore`](../../.gitignore) 与 [`.dockerignore`](../../.dockerignore)。

