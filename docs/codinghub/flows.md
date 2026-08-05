# 运行流程

本文关注运行时顺序与数据流；静态模块职责见[架构说明](./architecture.md)。

## 启动与初始化

服务端启动时读取 `SOURCE_DIR`、`PORT`、`DATA_FILE`，调用 `loadState()` 尝试读取 JSON；文件不存在或读取/解析失败时使用空状态。浏览器加载页面后，Vue 3 应用在 `onMounted` 中请求 `/api/state` 检测登录状态，根据结果选择登录页、注册页或首页。注册页的宝宝小名输入框预填默认值 `"元宝"`（见 [`app.js`](../../app.js) 的 `regChildName`）。依据为 [`server.js`](../../server.js) 和 [`app.js`](../../app.js)。

```mermaid
sequenceDiagram
    participant B as 浏览器
    participant V as Vue 3 App (app.js)
    participant S as server.js
    participant F as JSON 文件

    S->>F: 启动时读取 DATA_FILE
    alt 文件有效
        F-->>S: accounts 与 sessions
    else 文件不存在或读取失败
        S->>S: 使用空状态
    end
    B->>S: GET /
    S-->>B: index.html
    B->>S: 依次请求 styles.css、vue.global.prod.js、modules/*.js、app.js
    S-->>B: 静态资源
    V->>V: Vue 3 createApp → onMounted
    V->>S: GET /api/state
    alt 已登录（会话有效）
        S-->>V: 当前账户完整状态
        V->>V: 填充响应式状态并渲染首页
    else 未登录（401）
        V->>V: 渲染登录页（view = "login"）
    end
```

旧版应用曾依赖浏览器 IndexedDB 存储数据，Vue 3 重构后不再包含 IndexedDB 迁移逻辑。当前客户端仅通过服务端 API 读写数据，见 [`app.js`](../../app.js) 的 `onMounted`、`loadUserState`。仅用户执行"清除全部学习数据"时客户端会尝试删除旧 IndexedDB（`indexedDB.deleteDatabase`），见 `resetData`。

## 认证流程

```mermaid
flowchart TD
    Login[登录页] --> EnterCred[输入用户名和密码]
    EnterCred --> PostLogin[POST /api/auth/login]
    PostLogin --> Verify{验证密码哈希}
    Verify -->|匹配| CreateSession[创建会话令牌]
    CreateSession --> SetCookie[Set-Cookie: yuanbao_session]
    SetCookie --> LoadState[GET /api/state 加载状态]
    LoadState --> Home[渲染首页]
    Verify -->|不匹配| Error[显示错误提示]

    Register[注册页] --> EnterAll[输入用户名、密码、宝宝小名、年龄]
    EnterAll --> PostRegister[POST /api/auth/register]
    PostRegister --> Validate{校验输入}
    Validate -->|有效| CreateAccount[创建账户]
    CreateAccount --> HashPwd[PBKDF2-SHA512 加盐哈希]
    HashPwd --> CreateSession
    Validate -->|无效| RegError[显示错误提示]

    Logout[登出] --> Confirm{确认退出}
    Confirm -->|是| PostLogout[POST /api/auth/logout]
    PostLogout --> ClearCookie[清除会话 Cookie]
    ClearCookie --> ClearState[清空客户端状态]
    ClearState --> Login
```

认证使用 `yuanbao_session` Cookie（HttpOnly、SameSite=Lax、7 天有效期），密码通过 PBKDF2-SHA512（10000 次迭代）加盐哈希存储。见 [`server.js`](../../server.js) 的 `hashPassword`、`createSession`、`destroySession`。

## 建档与每日学习

课程不从服务端下载，而是客户端使用学习天数和年龄调用学科模块的 `generateLesson` 生成。学习天数从 `startedAt` 与客户端本地日期计算，按学科独立统计。种子是 `day * PRIME + age * PRIME`（数学 7919、物理 5821、英语 3719），每节课程包含 5 个活动。依据为 [`app.js`](../../app.js) 的 `computeSubjectDays`、`makeSubjectLesson`、`startSubjectLesson`，以及各学科模块。

```mermaid
flowchart TD
    Home[首页] --> Schedule[按课表获取今日学科]
    Schedule --> CheckEach{逐个学科}
    CheckEach -->|已完成| ShowDone[显示已完成标记]
    CheckEach -->|未完成| ShowStart[显示开始/继续按钮]
    ShowStart --> Click[点击学科按钮]
    Click --> Generate[按学科学习天数和年龄生成课程]
    Generate --> Draft{存在当天未完成记录}
    Draft -->|是| Resume[恢复 activityIndex 与 answers]
    Draft -->|否| Start[从第一个活动开始]
    Resume --> Show[渲染当前活动]
    Start --> Show
    Show --> Choose[选择答案]
    Choose --> Evaluate[客户端判定正误并记录 Answer]
    Evaluate --> Review{是否为重玩模式}
    Review -->|否| SaveDraft[PUT /api/progress 保存断点]
    Review -->|是| Feedback[显示反馈]
    SaveDraft --> Feedback
    Feedback --> Next{是否完成全部五题}
    Next -->|否| Show
    Next -->|是| Summary[计算正确数与星星]
    Summary --> WriteDone{是否重玩}
    WriteDone -->|否| SaveDone[PUT /api/progress 覆盖同日断点]
    WriteDone -->|是| Complete[完成页 + 庆祝特效]
    SaveDone --> Complete
    Complete --> NextSubject{是否还有今日学科}
    NextSubject -->|是| CheckEach
    NextSubject -->|否| BackHome[回到首页]
```

首次作答会禁用选项并高亮正确答案。非重玩模式每题立即保存断点；第五题后以 `max(1, round(correct / 2))` 计算星星，并覆盖同日记录。重玩只显示反馈，不改写既有成绩，见 [`app.js`](../../app.js) 的 `startSubjectLesson`、`answerQuestion`、`nextActivity`。

## 答题反馈与庆祝流程

每次答题后，客户端触发多级反馈；所有音效通过 Web Audio API 合成，不依赖外部音频文件。答对时随机选择车辆主题（火车/消防车/警车/校车），见 [`app.js`](../../app.js) 的 `SUCCESS_SOUNDS`、`playFeedbackSound`、`playVehicleSound`。

```mermaid
sequenceDiagram
    participant U as 用户点击答案
    participant A as app.js answerQuestion
    participant D as DOM
    participant W as Web Audio API
    participant V as Vibration API
    participant S as server.js

    U->>A: 点击选项按钮
    A->>A: 判定正确/错误（不区分大小写）
    A->>D: 禁用所有选项，高亮正确答案
    alt 答对
        A->>A: 随机选取 SUCCESS_SOUNDS 主题
        A->>D: celebrateWithParticles("correct", 30)
        A->>D: showSuccessBadge(sound)
        A->>W: playFeedbackSound("correct", vehicle)
        A->>V: vibrate(35)
    else 答错
        A->>D: 错误按钮添加 .wrong 样式
    end
    A->>D: 显示反馈面板（正确/错误文案 + 继续按钮）
    A->>S: PUT /api/progress 保存断点（非重玩模式）
    U->>A: 点击"继续"
    A->>A: nextActivity 推进到下一活动
```

课程完成时，`nextActivity` 检测到 `activityIndex >= activities.length` 后跳转到 `view = "complete"`，Vue 模板在首次渲染时触发完成庆祝，`completionCelebrated` 标志防止重复：

```mermaid
flowchart TD
    Next[第五题点击继续] --> Calc[计算正确数 correct 与星星数 stars]
    Calc --> IsReview{是否重玩}
    IsReview -->|否| Save[PUT /api/progress completed=true]
    IsReview -->|是| Render[渲染完成页]
    Save --> Render
    Render --> FirstTime{completionCelebrated 是否为 false}
    FirstTime -->|是| Celebrate[celebrateWithParticles 24 粒子]
    Celebrate --> Sound[playFeedbackSound complete 四音阶]
    Sound --> Vibrate[vibrate 三段式振动]
    Vibrate --> SetFlag[completionCelebrated = true]
    FirstTime -->|否| Done[完成]
    SetFlag --> Done
    Done --> OfferNext[展示剩余今日学科，可继续学习]
```

英语发音使用浏览器的 `speechSynthesis`、`en-US` 语言（rate 0.72、pitch 1.08）；不支持时只显示 toast 提示，学习可继续。答对和完成课程还会尽力调用 Web Audio API 与 `navigator.vibrate` 提供反馈；这些能力不可用或播放失败时不会中断答题流程，见 [`app.js`](../../app.js) 的 `speak`、`playFeedbackSound`、`answerQuestion`、`nextActivity`。

## 服务端写入

```mermaid
sequenceDiagram
    participant A as app.js
    participant H as handleApi
    participant M as persistedState
    participant Q as saveQueue
    participant T as 临时文件
    participant F as DATA_FILE

    A->>H: PUT profile/progress 或 POST auth
    H->>H: 解析 JSON 并校验
    H->>M: 更新内存状态
    H->>Q: persistState
    Q->>T: 写入完整状态快照
    T->>F: rename 为正式文件
    Q-->>H: 写入完成
    H-->>A: 200 与已保存对象
```

请求体限制为 1 MiB。`saveQueue` 避免同一进程内的文件写入交叉；写入的是完整快照而非增量日志，见 [`server.js`](../../server.js) 的 `MAX_BODY_SIZE`、`readJson`、`persistState`。

客户端只有在 `PUT /api/progress` 成功后才将该记录合并进 `records.value`；答题断点写入失败时会保留当前页面上的答题反馈并显示 toast 提示。完成页保存没有单独的 `try/catch`，因此保存失败时的行为由该异步事件处理的异常表现决定，是否有统一的全局错误捕获属于**待确认**；相关实现见 [`app.js`](../../app.js) 的 `saveRecord`、`answerQuestion`、`nextActivity`。

## 统计与导出

- 首页从完成记录计算课程数、连续天数和近七天打卡；当日未完成记录决定进度条，见 [`app.js`](../../app.js) 的 `streak`、`weekDays`、首页模板。
- 成长页统计三个学科（数学/物理/英语）的完成课程数、正确率和星星数，并最多展示最近 10 节，见 [`app.js`](../../app.js) 的 `subjectStats`、`historyItems`。
- 导出功能生成独立 HTML 报告：包含统计卡片（完成课程数/星星数/连续天数）、学科能力条形图和最近 50 条课程记录表，见 [`server.js`](../../server.js) 的 `generateExportHtml`。
- 清除操作需浏览器确认；之后 `DELETE /api/state` 重置记录和开始日期，删除旧 IndexedDB 并刷新，见 [`app.js`](../../app.js) 的 `resetData` 和 [`server.js`](../../server.js)。

## 课表编辑流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant A as app.js
    participant S as server.js

    U->>A: 点击课表页面某天的 ✎ 按钮
    A->>A: 弹出编辑对话框（三学科复选框）
    U->>A: 勾选/取消学科并点击保存
    A->>S: PUT /api/schedule（完整 7 天课表）
    S->>S: 校验 7 天键值并去重
    S-->>A: 200 与更新后的课表
    A->>A: 更新 schedule.value 并重新渲染
    A->>A: 显示 toast 确认
```

## 相关文档

- [项目概览](./overview.md)：入口与部署位置。
- [架构说明](./architecture.md)：数据结构与 API 边界。
- [开发指南](./development.md)：如何复现、检查与调试这些流程。