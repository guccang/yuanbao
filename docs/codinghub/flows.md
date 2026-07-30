# 运行流程

本文聚焦运行时顺序与数据流；静态模块职责见[架构说明](./architecture.md)。

## 启动与初始化

服务端执行 [`server.js`](../../server.js) 时先解析 `SOURCE_DIR`、`PORT`、`DATA_FILE`，再通过 `loadState()` 读取 JSON；文件不存在或内容无法解析时使用 `{ profile: null, records: [] }`。浏览器加载 [`index.html`](../../index.html) 和 [`app.js`](../../app.js) 后执行 `init()`。

```mermaid
sequenceDiagram
    participant B as 浏览器
    participant A as app.js
    participant S as server.js
    participant F as JSON 文件
    participant I as 旧 IndexedDB

    S->>F: 启动时读取 DATA_FILE
    alt 文件有效
        F-->>S: profile 与 records
    else 不存在或读取失败
        S->>S: 建立空状态
    end
    B->>S: GET /
    S-->>B: index.html
    B->>S: GET /styles.css 与 /app.js
    S-->>B: 静态资源
    A->>S: GET /api/state
    S-->>A: 当前完整状态
    alt 服务端已有 profile
        A->>A: 写入客户端 state 并渲染首页
    else 服务端没有 profile
        A->>I: 尝试读取旧 profile 与 progress
        alt 旧 profile 存在
            A->>S: PUT /api/profile
            loop 每条旧记录
                A->>S: PUT /api/progress
            end
            A->>A: 渲染首页
        else 没有旧资料
            A->>A: 渲染首次使用引导
        end
    end
```

迁移只在服务端没有 `profile` 时触发；实现依据是 [`app.js`](../../app.js) 的 `init`、`migrateLegacyState`。旧数据库不会在迁移成功后自动删除，只有用户清空全部数据时才调用 `indexedDB.deleteDatabase`。

## 首次建档

1. `renderOnboarding()` 收集最长 8 个字符的小名和 3–6 岁年龄。
2. 提交时客户端补充固定 `id: "main"`、本地日期 `startedAt` 和 ISO 时间 `createdAt`。
3. `PUT /api/profile` 经服务端校验后更新内存状态，并等待文件持久化完成。
4. 客户端切换为 `home` 并渲染当日课程卡。

依据为 [`app.js`](../../app.js) 的 `renderOnboarding` 与 [`server.js`](../../server.js) 的 `/api/profile` 分支。

## 每日课程生成与答题

课程不是从服务端下载，而由 [`app.js`](../../app.js) 的 `makeLesson(day, age)` 在浏览器中生成。`day` 由资料的 `startedAt` 到本地当天的日历天数计算；数学主题和英语单词按天循环，伪随机种子由 `day * 7919 + age * 101` 得到。年龄决定数字上限，每课活动固定为数学 3 个、英语 3 个。

```mermaid
flowchart TD
    Home[首页] --> Generate[按学习天数和年龄生成课程]
    Generate --> Draft{存在今天未完成记录}
    Draft -->|是| Resume[恢复 activityIndex 与 answers]
    Draft -->|否| Start[从第 1 个活动开始]
    Resume --> Show[渲染当前活动]
    Start --> Show
    Show --> Choose[用户选择答案]
    Choose --> Evaluate[客户端判定并记录 Answer]
    Evaluate --> Review{是否为完成后的重玩}
    Review -->|否| SaveDraft[PUT /api/progress 保存断点]
    Review -->|是| Feedback[只显示反馈]
    SaveDraft --> Feedback
    Feedback --> Last{是否已完成 6 个活动}
    Last -->|否| Show
    Last -->|是| Summary[计算 correct、stars 与完成时间]
    Summary --> ReviewDone{是否为重玩}
    ReviewDone -->|否| SaveDone[PUT /api/progress 覆盖同日断点]
    ReviewDone -->|是| Complete[完成页]
    SaveDone --> Complete
```

每次首次作答后，按钮会被禁用并显示正确答案；非重玩模式立即保存 `activityIndex + 1` 和累计答案。第六题之后，星星数按 `max(1, round(correct / 2))` 计算，完成记录覆盖同日断点。完成后的“再玩一次”将 `isReview` 设为真，不改写既有成绩。依据为 [`app.js`](../../app.js) 的 `startLesson`、`answerQuestion` 和 `nextActivity`。

英语听力调用浏览器 `speechSynthesis`，语言为 `en-US`；不支持时仅显示提示，不影响继续答题，见 [`app.js`](../../app.js) 的 `speak`。

## 服务端写入链路

```mermaid
sequenceDiagram
    participant A as app.js
    participant H as handleApi
    participant M as persistedState
    participant Q as saveQueue
    participant T as 临时文件
    participant F as DATA_FILE

    A->>H: PUT profile 或 progress
    H->>H: 解析 JSON 并做最小校验
    H->>M: 更新资料或按 date 覆盖记录
    H->>Q: persistState()
    Q->>T: 写入完整状态快照
    T->>F: rename 覆盖正式文件
    Q-->>H: 写入完成
    H-->>A: 200 与已保存对象
```

请求体上限是 1 MiB。写操作共享 Promise 队列，避免同一进程中的文件写入互相穿插；每次写入的是完整状态快照，而不是增量日志。依据为 [`server.js`](../../server.js) 的 `MAX_BODY_SIZE`、`readJson` 和 `persistState`。

## 统计与清除

- 首页从完成记录计算完成课数、连续天数和最近七天打卡；断点决定课程进度条，见 [`app.js`](../../app.js) 的 `streak`、`renderWeek`、`renderHome`。
- 成长页仅统计 `completed` 记录，按答案科目计算正确率，并展示最近 10 节，见 `renderProgress`。
- 清除操作先经浏览器确认，再调用 `DELETE /api/state` 覆盖服务端文件为空状态，随后删除旧 IndexedDB 并刷新页面，见 `resetData` 与 [`server.js`](../../server.js)。

## 相关文档

- 目标、技术栈和主要入口：[项目概览](./overview.md)
- 本地复现和调试方法：[开发指南](./development.md)

