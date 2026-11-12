请在本仓库实现一个可在浏览器打开的「流表时态连接实验室」（禁止 Docker），并让 `npm test` 全部通过。

硬性需求：
1) 打开 `index.html`（`npm start` 或 `python3 -m http.server 8783 --directory .`）后：左侧结果/时间线，右侧控制面板；成功时 `#status` 为 `ready`。
2) 实现 `src/versionedTable.js`：版本化维表，`upsert(key, value, ts)` 按事件时间写入版本；`getAsOf(key, ts)` 返回 `ts` 时刻可见值（含回溯）。
3) 实现 `src/temporalJoin.js`：流事件 `joinVersioned(events, table, {keyField, tsField})` 做 event-time temporal join；迟到维表更新要能通过 `rejoinLateDimension(events, table)` 修正历史输出。
4) 实现 `src/engine.js` 的 `JoinEngine`：加载 `fixtures/dim.jsonl` + `fixtures/events.jsonl`，按事件时间处理，维护 watermark（可配置 lateness）；`#stats` 显示 joined/lateUpdates/watermark。
5) 实现 `src/ui/controls.js`：`Load fixtures` / `Run` / `Export JSON`；可调 lateness；结果列表展示 join 输出。
6) 不要 Docker，不要改弱测试，保持原生 ESM。分文件短命令写入，写完立刻 `npm test` 直到通过。
