## 2026-07-08 22:46 CST

开始按 `/home/mathew/code/yinian/design/` 6 张设计图开发新版一念。

已完成：

- 读取并分析 6 张页面设计图。
- 生成设计文档：`/home/mathew/code/yinian/DESIGN_PAGES.md`。
- 确认 6 个目标页面：
  1. 今天首页
  2. 工作线列表
  3. 工作线详情 / 进展
  4. 待探索
  5. 全部记录
  6. 工作线详情 / 链条
- 检查当前项目：React + TypeScript + Vite + Vitest，已有想法捕捉、想法列表、想法链条基础实现。

本轮开发策略：

- 保留现有可用的记录、来源、引用、生命周期能力。
- 先做桌面端 6 页面产品壳和样例数据体验，尽快贴近设计图。
- 逐步把现有 `Idea` 能力演进到 `Thread / Entry / Source / Relation / ExploreItem` 模型。
- 采用 TDD：先补页面导航和新版信息模型的测试，再实现代码。

下一步：

- 增加新版导航 / 页面结构测试。
- 增加样例工作线、待探索、全部记录、链条视图的测试。
- 重构 `App.tsx` 为新版 4 个一级导航 + 工作线详情 Tab。

## 2026-07-08 22:49 CST

TDD RED 阶段完成：重写 `src/App.test.tsx`，新增 4 个新版产品壳测试。

测试覆盖：

- 今天首页必须包含快速记录、今日概览、继续推进、今日记录、待探索。
- 顶部导航必须包含：今天 / 工作线 / 待探索 / 全部记录，并保留 `+ 快速记录`。
- 工作线列表必须能进入一念产品详情，并在详情内切换到链条画布。
- 今天页快速记录保存后，记录必须出现在今日记录和全部记录中，且不强制分类。

已运行：

```bash
npm test -- src/App.test.tsx
```

结果：4 个测试全部失败，失败原因符合预期：现有应用仍是旧的 `记录想法 / 想法列表 / 想法链条` 三页结构，不存在新版 `今天 / 工作线 / 待探索 / 全部记录` 导航和页面模块。

随后进入 GREEN 阶段：

- 重写 `src/App.tsx` 为新版 4 个一级页面 + 工作线详情 Tab。
- 写入样例数据模型：`WorkThread / Entry / ExploreItem`。
- 实现页面：今天、工作线列表、工作线详情进展、待探索、全部记录、链条画布。
- 重写 `src/App.css`，建立新版暖米白 / 深棕产品 UI 样式。

下一步：运行测试，修复类型/交互/可访问性问题。

## 2026-07-08 22:56 CST

GREEN 阶段完成，当前新版产品壳已跑通。

修改内容：

- `src/App.tsx`
  - 替换旧的三页想法捕捉 UI。
  - 新增 4 个一级导航：今天 / 工作线 / 待探索 / 全部记录。
  - 新增工作线详情页内 Tab：概览 / 进展 / 链条 / 资料。
  - 新增样例数据：工作线、记录、待探索内容。
  - 实现今天首页、工作线列表、工作线详情进展、待探索、全部记录、链条画布。
  - 快速记录可在今天页保存，并同步出现在今日记录和全部记录。
- `src/App.css`
  - 重建新版页面布局和视觉系统。
  - 使用暖米白背景、深棕主按钮、低饱和状态标签、三栏工作台布局。
- `src/App.test.tsx`
  - 保留 4 个新版产品壳测试，并修正可访问名称/重复文本断言。

验证结果：

```bash
npm test
# 7 个测试文件通过，25 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

浏览器验证：

- 启动 Vite dev server，实际可访问端口为 `http://127.0.0.1:5176/`。
- 浏览器打开后确认标题为 `yinian-mvp`。
- 首页显示新版：晚上好 / 快速记录 / 今日概览 / 继续推进 / 今日记录 / 待探索。
- 点击工作线，显示工作线列表与本周概况。
- 点击「查看一念产品详情」，进入工作线详情进展页。
- 点击「链条」，显示链条列表、链条画布、记录详情三栏。
- 浏览器 console 无错误。

下一步建议：

- 把样例数据迁移到独立模块，例如 `src/productData.ts`。
- 把大文件 `App.tsx` 拆成页面组件和通用组件。
- 将快速记录接回真实 LocalStorage / server persistence。
- 继续按设计图细化视觉间距、图标和响应式。

## 2026-07-09 00:08 CST

继续做记录编辑功能，采用 TDD 小步完成。

RED：

- 使用已有 `src/App.test.tsx` 中「edits a locally saved quick record and persists the change」用例验证编辑行为。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "edits a locally saved quick record"
```

结果：1 个测试失败，失败原因符合预期：点击「编辑」后找不到 `编辑记录内容` 标签，说明记录详情尚未进入编辑模式。

GREEN：

- `src/App.tsx`
  - 给 `RecordDetail` 增加编辑状态与草稿内容。
  - 点击「编辑」后显示 `编辑记录内容` textarea。
  - 点击「保存编辑」后调用 `onUpdateEntry` 更新本地保存记录，并退出编辑模式。
  - 切换选中记录时自动重置编辑状态和草稿内容。
  - 将 `onUpdateEntry` 传入全部记录详情与链条记录详情。
- `src/App.css`
  - 增加 `.record-edit-form` 和 textarea 样式，保持与当前暖色卡片视觉一致。

验证结果：

```bash
npm test -- src/App.test.tsx -t "edits a locally saved quick record"
# 1 个目标测试通过

npm test
# 7 个测试文件通过，33 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

当前功能：本地快速记录可在「全部记录」右侧详情中点击「编辑」修改内容，并持久化到 `localStorage`。

## 2026-07-09 00:31 CST

继续补快速记录的键盘保存能力，按 PRODUCT.md 中 `保存 Ctrl+Enter` 的交互说明做小步 TDD。

RED：

- 在 `src/App.test.tsx` 新增「saves quick records with Ctrl+Enter from the composer」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "Ctrl\\+Enter|Ctrl"
```

结果：1 个测试失败，失败原因符合预期：textarea 中输入内容后按 Ctrl+Enter 没有触发保存，页面找不到「已保存到今日记录。」。

GREEN：

- `src/App.tsx`
  - 给快速记录 textarea 增加 `onKeyDown`。
  - 当 `Ctrl+Enter` 或 `Cmd+Enter` 触发时阻止默认行为并调用 `saveQuickRecord()`。
  - 保留原有点击「保存 Ctrl+Enter」按钮的保存路径。

验证结果：

```bash
npm test -- src/App.test.tsx -t "Ctrl\\+Enter|Ctrl"
# 1 个目标测试通过

npm test
# 7 个测试文件通过，34 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

当前功能：今天页快速记录可以点击保存，也可以在输入框内按 Ctrl+Enter / Cmd+Enter 保存到今日记录与全部记录。

## 2026-07-09 21:43 CST

继续按 PRODUCT.md 后续路线推进：先把「工作线 + Entry」从 `App.tsx` 里的硬编码拆到产品数据与本地存储层，再补工作线新增/编辑/持久化。

已完成：

- 新增 `src/productData.ts`
  - 导出产品层类型：`TopView / ThreadTab / EntryType / WorkThread / Entry / ExploreItem`。
  - 导出默认样例数据：`defaultThreads / defaultEntries / defaultExploreItems`。
  - 目标是把原本散落在 `App.tsx` 顶部的大段硬编码数据迁出，后续方便继续拆页面组件和接真实持久化。
- 新增 `src/productStorage.ts`
  - 增加本地存储 key：`yinian.product.threads`、`yinian.product.entries`。
  - 增加 `loadProductThreads / saveProductThreads / loadProductEntries / saveProductEntries`。
  - localStorage 为空或 JSON 损坏时回退到默认产品数据。
- 新增 `src/productStorage.test.ts`
  - 覆盖空存储加载默认工作线/记录。
  - 覆盖自定义工作线/记录持久化。
  - 覆盖损坏 JSON 回退默认值。
- `src/App.tsx`
  - 改为从 `productData` 和 `productStorage` 读取默认数据与持久化数据。
  - 快速记录、删除记录、编辑记录改为写入 `yinian.product.entries`。
  - 工作线列表开始接入 `productThreads` 状态。
  - 增加工作线新建/编辑表单的初版实现：工作线名称、当前阶段、下一步、描述、当前阻塞。
  - 保存工作线后写入 `yinian.product.threads` 并更新页面状态。
- `src/App.test.tsx`
  - 新增「creates and edits a workline with local persistence」用例。
  - 将记录编辑持久化断言从旧 key `yinian.product.savedEntries` 改为新 key `yinian.product.entries`。

TDD 记录：

- RED：

```bash
npm test -- src/productStorage.test.ts
```

最初失败原因符合预期：`./productStorage` 模块不存在。

- GREEN：

```bash
npm test -- src/productStorage.test.ts
# 3 个测试通过
```

- App 接入后先跑局部回归：

```bash
npm test -- src/productStorage.test.ts src/App.test.tsx
```

中途暴露并修复的问题：

- `threads is not defined`：`TodayPage` 仍直接引用全局 `threads`，已改为从 props 接收。
- 旧测试仍检查 `yinian.product.savedEntries`，已改为 `yinian.product.entries`。
- 新增工作线表单缺失，导致找不到 `工作线名称` label，已实现表单。
- 测试精确匹配 `搭建数据层` 时因文本被 UI 符号拆分失败，已改为正则匹配。

当前局部验证结果：

```bash
npm test -- src/productStorage.test.ts src/App.test.tsx
# 2 个测试文件通过，16 个测试通过

npm test -- src/App.test.tsx -t "creates and edits a workline"
# 1 个目标测试通过
```

当前进度状态：

- 已完成第一步的数据层拆分基础：`productData.ts` + `productStorage.ts`。
- 已完成工作线新增/编辑/本地持久化的初版。
- 尚未完成：全部记录筛选/排序、「继续记录」在当前工作线直接追加 Entry、Relation / 待探索状态流。
- 尚未跑本轮全量 `npm test && npm run build && npm run lint`；下一步继续实现筛选/排序和继续记录后统一全量验证。


## 2026-07-09 21:54 CST

继续从上次 `process.md` 的未完成项推进，优先补「继续记录」：在工作线详情页内直接给当前工作线追加 Entry，并写入产品层本地存储。

TDD：

- RED：在 `src/App.test.tsx` 新增「continues recording inside the current workline and persists the new entry」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "continues recording"
```

结果：1 个测试失败，失败原因符合预期：点击「+ 继续记录」后找不到 `继续记录类型`，说明当前按钮还没有实际表单和保存行为。

GREEN：

- `src/App.tsx`
  - 新增 `addThreadEntry(threadId, type, content)`，把当前工作线的新记录写入 `yinian.product.entries`。
  - `ThreadProgressPage` 接收 `onAddEntry`。
  - 点击「+ 继续记录」后显示轻量表单：`继续记录类型` + `继续记录内容`。
  - 点击「保存到当前工作线」后，新 Entry 插入当前工作线进展流，选中该 Entry，并显示「已保存到一念产品进展流。」。
  - 修复 `useMemo` 缺少 `productThreads` 依赖导致的 lint warning。
- `src/App.css`
  - 增加 `.continue-entry-form` 样式，复用当前暖色面板、输入框、按钮视觉。

验证结果：

```bash
npm test -- src/App.test.tsx -t "continues recording"
# 1 个目标测试通过

npm test && npm run build && npm run lint
# 8 个测试文件通过，39 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前功能：工作线详情 / 进展页现在可以直接「继续记录」，选择类型并保存到当前工作线；刷新/重挂载后该记录可在「全部记录」中看到，并持久化到 `localStorage` 的 `yinian.product.entries`。

下一步建议：

- 做「全部记录」真实筛选/排序：左侧筛选按钮不应只是静态样式，中间数量也要从真实 entries 计算。
- 做 Relation / 引用：继续记录时可选择「延伸自/引用」当前记录，链条页自动出现新节点。
- 做待探索状态流：点击「开始探索」后状态从待探索变探索中，并允许追加探索记录。


## 2026-07-09 22:01 CST

继续推进 `process.md` 里剩余的「全部记录筛选/排序」方向，本轮先做最小可用的真实筛选：工作线 + 类型筛选，以及真实记录数量。

TDD：

- RED：在 `src/App.test.tsx` 新增「filters all records by workline and type, clears filters, and shows the real result count」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "filters all records"
```

结果：1 个测试失败，失败原因符合预期：页面仍显示硬编码 `共 128 条记录`，筛选按钮也是静态的 `RoArm-M3 28 / 问题 32`，没有按真实 entries 计算。

GREEN：

- `src/App.tsx`
  - `RecordsPage` 接入 `threads`，并维护 `threadFilter / typeFilter` 状态。
  - 中间列表改为使用 `filteredEntries`。
  - 记录数量改为真实 `共 {filteredEntries.length} 条记录`。
  - 新增 `RecordsFilterPanel`，按真实 entries 计算：
    - 今日数量
    - 每条工作线的记录数
    - 每种 Entry 类型的记录数
    - 有来源记录数
  - 支持点击工作线筛选、点击类型筛选、点击「清空筛选」恢复全部记录。
  - 筛选后如果当前右侧详情记录不在结果内，会回退到筛选结果第一条，避免详情仍显示被筛掉的记录。

验证结果：

```bash
npm test -- src/App.test.tsx -t "filters all records"
# 1 个目标测试通过

npm test && npm run build && npm run lint
# 8 个测试文件通过，40 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前功能：全部记录页左侧筛选不再是纯静态展示；工作线和类型可以组合过滤，中间结果数会实时显示真实数量，清空筛选可恢复全部记录。

下一步建议：

- 补排序：让「最新 / 最早」按钮真正改变 Entry 顺序。
- 做 Relation / 引用：继续记录时可选择「延伸自/引用」当前记录，链条页自动出现新节点。
- 做待探索状态流：点击「开始探索」后状态从待探索变探索中，并允许追加探索记录。


## 2026-07-09 22:27 CST

继续做 `process.md` 里「全部记录筛选/排序」的剩余部分，本轮补「最新 / 最早」排序真实生效。

TDD：

- RED：在 `src/App.test.tsx` 新增「sorts all records by newest and oldest order」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "sorts all records"
```

结果：1 个测试失败，失败原因符合预期：点击「最新」后第一条仍是原始数据顺序里的 `后续可以基于引用添加想法链条`，说明排序按钮仍是静态 Segmented，不改变 Entry 顺序。

GREEN：

- `src/App.tsx`
  - `RecordsPage` 增加 `sortOrder` 状态：`newest / oldest / relevant`。
  - 新增 `entrySortValue(entry)`，按 `date + time` 转换为排序值。
  - 新增 `RecordsSortTabs`，替代静态 `Segmented`，点击「最新 / 最早」会改变排序状态。
  - 中间列表改为渲染 `sortedEntries`，并且结果数从排序后的真实数组读取。
  - 调整 `EntryList` 的日期分组顺序：从传入 entries 的实际顺序生成日期组，避免「最早」排序后仍被固定的 `今天 / 昨天` 分组顺序打乱。

中途修正：

- 第一次 GREEN 后目标测试仍失败：排序数组已正确，但 `EntryList` 固定先渲染「今天」再渲染「昨天」，导致「最早」仍无法把昨天记录放到最前。
- 修复方式：`EntryList` 使用 `Array.from(new Set(entries.map(entry => entry.date)))` 按当前 entries 顺序生成分组。

验证结果：

```bash
npm test -- src/App.test.tsx -t "sorts all records"
# 1 个目标测试通过

npm test && npm run build && npm run lint
# 8 个测试文件通过，41 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前功能：全部记录页「最新 / 最早」按钮现在会真实改变记录顺序；「最相关」目前保留为与最新相同的默认排序占位，后续可接搜索相关度或标签权重。

下一步建议：

- 做 Relation / 引用：继续记录时可选择「延伸自/引用」当前记录，链条页自动出现新节点。
- 做待探索状态流：点击「开始探索」后状态从待探索变探索中，并允许追加探索记录。
- 清理遗留静态 `FilterPanel`，把待探索页也迁到真实数据筛选模型。


## 2026-07-09 22:51 CST

继续做 `process.md` 里的 Relation / 引用方向，本轮实现最小闭环：在工作线详情里「继续记录」时可选择延伸当前记录，保存后链条页出现新节点。

TDD：

- RED：在 `src/App.test.tsx` 新增「extends the current record when continuing a workline and shows the new node on the chain canvas」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "extends the current record"
```

结果：1 个测试失败，失败原因符合预期：继续记录表单里找不到 `延伸当前记录` 选项，说明还不能把新记录挂到当前链条节点上。

GREEN：

- `src/App.tsx`
  - `addThreadEntry` 增加可选 `extendsId` 参数，保存 Entry 时写入 `extendsId`。
  - `ThreadProgressPage` 接收当前 `selectedEntry`。
  - 继续记录表单新增 `延伸当前记录` checkbox。
  - 勾选后显示将延伸的当前记录标题。
  - 保存时若勾选，则把新记录的 `extendsId` 设置为当前记录 id。
  - 保存后 `selectedEntryId` 切到新记录；点击「查看链条」后，链条画布以新记录为当前节点，并展示 `延伸自 #15`。
- `src/App.css`
  - 增加 `.inline-check` 样式，让 checkbox 行与现有表单视觉协调。

中途修正：

- 第一次 GREEN 后目标行为已经出现，但测试用 `getByText('从当前节点延伸出的链条记录。')` 命中多个位置（链条列表、节点、详情标题、详情正文），改为 `getAllByText(...).length > 0`。
- `延伸自 #15` 也可能同时出现在多个节点上，改为检查出现次数大于 0。

验证结果：

```bash
npm test -- src/App.test.tsx -t "extends the current record"
# 1 个目标测试通过

npm test && npm run build && npm run lint
# 8 个测试文件通过，42 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前功能：工作线详情 / 进展页继续记录时，可以选择「延伸当前记录」；保存后的新 Entry 会带 `extendsId` 持久化到 `yinian.product.entries`，并能在链条画布中作为当前节点显示在父节点下面。

下一步建议：

- 扩展 Relation：继续记录时不仅能延伸当前记录，还能从当前工作线记录中选择任意引用/延伸对象。
- 做待探索状态流：点击「开始探索」后状态从待探索变探索中，并允许追加探索记录。
- 清理遗留静态 `FilterPanel`，把待探索页也迁到真实数据筛选模型。


## 2026-07-09 23:02 CST

按要求补充当前 `process.md` 状态快照，方便下一轮继续接手。

当前已完成主线：

- 6 页面产品壳：今天 / 工作线 / 工作线详情进展 / 待探索 / 全部记录 / 工作线详情链条。
- 产品数据层拆分：`src/productData.ts`、`src/productStorage.ts`、`src/productStorage.test.ts`。
- 工作线新增 / 编辑 / 本地持久化。
- 快速记录：点击保存、Ctrl+Enter / Cmd+Enter 保存、来源保存、工作线和类型分类、本地持久化。
- 记录详情编辑 / 删除。
- 工作线详情「继续记录」：可直接追加当前工作线 Entry，并持久化。
- 全部记录：真实数量、工作线筛选、类型筛选、组合筛选、清空筛选、最新 / 最早排序。
- Relation 最小闭环：继续记录时可勾选「延伸当前记录」，保存 `extendsId`，链条画布出现新子节点。

最近一次完整验证：

```bash
npm test && npm run build && npm run lint
# 8 个测试文件通过，42 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前 git 状态摘要：

```text
M  process.md
M  src/App.css
M  src/App.test.tsx
M  src/App.tsx
?? src/productData.ts
?? src/productStorage.test.ts
?? src/productStorage.ts
```

当前变更量摘要：

```text
process.md       | 315 ++++++++++++++++++++++++++++++++++++++
src/App.css      |   7 +
src/App.test.tsx | 117 +++++++++++++-
src/App.tsx      | 456 +++++++++++++++++++++----------------------------------
4 files changed, 610 insertions(+), 285 deletions(-)
```

下一步优先级建议：

1. 待探索状态流：点击「开始探索」后状态从待探索变探索中，并允许追加探索记录。
2. 扩展 Relation：继续记录时可从当前工作线记录中选择任意引用 / 延伸对象，而不只是当前记录。
3. 清理遗留静态 `FilterPanel`：把待探索页也迁到真实数据筛选模型。
4. 组件拆分：`App.tsx` 已承载过多页面和逻辑，可逐步拆出 `RecordsPage`、`ThreadProgressPage`、`ExplorePage`、数据 helpers。


## 2026-07-09 23:16 CST

继续做 `process.md` 下一步优先级第一项：待探索状态流。本轮只做最小闭环：点击「开始探索」把当前探索项状态改为「探索中」，允许追加探索记录，并持久化到产品层 localStorage。

TDD：

- RED：在 `src/App.test.tsx` 新增「starts exploring an item, appends an exploration record, and persists the flow」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "starts exploring"
```

结果：目标测试失败，失败原因符合预期：点击「开始探索」后找不到 `状态已更新为探索中。`，说明待探索页按钮还只是静态动作，没有真实状态更新和持久化。

GREEN：

- `src/productData.ts`
  - 新增 `ExploreNote` 类型。
  - `ExploreItem` 增加可选 `explorationNotes`，用于保存探索记录。
- `src/productStorage.ts`
  - 新增 `yinian.product.exploreItems` 存储 key。
  - 新增 `loadProductExploreItems / saveProductExploreItems`。
- `src/productStorage.test.ts`
  - 扩展产品存储测试，覆盖探索项默认加载、自定义探索项持久化、损坏 JSON 回退默认值。
- `src/App.tsx`
  - App 状态改为从 `loadProductExploreItems` 读取待探索数据。
  - 搜索结果、今天页待探索卡片、待探索页列表都改用 `productExploreItems`。
  - 新增 `updateExploreStatus` 和 `addExploreNote`，写回 `yinian.product.exploreItems`。
  - `ExplorePage / ExploreDetail` 支持：真实状态数量、点击「开始探索」、追加探索记录、显示提示消息、刷新后恢复记录。

中途修正：

- 测试中 `browser-harness` 卡片的 accessible name 包含来源、说明、时间和状态，不能精确用 `name: 'browser-harness'`，改为 `name: /browser-harness/`。
- 首次全量验证时 `tsc` 报 `defaultExploreItems` 未使用，已移除 `App.tsx` 中无用 import。

验证结果：

```bash
npm test -- src/App.test.tsx src/productStorage.test.ts -t "starts exploring|product local storage"
# 2 个测试文件通过；目标 App 测试通过；productStorage 3 个测试通过

npm test && npm run build && npm run lint
# 8 个测试文件通过，43 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前功能：待探索页点击「开始探索」会把当前探索项状态更新为「探索中」并持久化；可以在详情里追加探索记录，记录会出现在「探索记录」区域，刷新/重挂载后仍能从 `yinian.product.exploreItems` 恢复。

下一步建议：

1. 清理遗留静态 `FilterPanel`：待探索页左侧筛选仍是硬编码，可迁到真实来源/状态/工作线筛选。
2. 扩展 Relation：继续记录时可从当前工作线记录中选择任意引用 / 延伸对象，而不只是当前记录。
3. 继续完善待探索状态流：增加「采用 / 放弃 / 已验证」动作，以及「加入工作线」的真实行为。
4. 组件拆分：`App.tsx` 继续膨胀，可优先拆 `ExplorePage` 和 `RecordsPage`。


## 2026-07-09 23:30 CST

继续做上一轮下一步建议第一项：清理待探索页遗留静态 `FilterPanel`，把待探索页左侧筛选迁到真实数据模型。本轮只做状态 / 工作线 / 来源类型三个筛选维度，并保证中间列表数量从真实 `ExploreItem[]` 计算。

TDD：

- RED：在 `src/App.test.tsx` 新增「filters exploration items by status, workline, and source type with real counts」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "filters exploration"
```

结果：1 个目标测试失败，失败原因符合预期：页面找不到 `共 6 个待探索`，且左侧仍显示旧静态 `FilterPanel` 的 `今天 18 / 本周 64 / 一念产品 52 / GitHub 4` 等硬编码项，说明待探索页筛选还没有真实数据化。

GREEN：

- `src/App.tsx`
  - `ExplorePage` 增加 `statusFilter / threadFilter / sourceFilter` 状态。
  - 新增 `filteredExploreItems`，按状态、关联工作线、来源类型组合筛选。
  - 中间列表增加真实数量：`共 {filteredExploreItems.length} 个待探索`。
  - 新增 `ExploreFilterPanel`，按真实 `exploreItems` 计算：
    - 状态数量：待探索 / 探索中 / 已验证 / 已采用 / 放弃。
    - 工作线数量：从 `linkedThreadIds` 计算。
    - 来源类型数量：从 `sourceType` 计算。
  - 支持点击筛选按钮组合过滤，点击「清空筛选」恢复全部。
  - 筛选后如果当前详情项不在结果内，右侧详情回退到筛选结果第一项。
  - 删除不再使用的旧静态 `FilterPanel`，避免 `tsc` 未使用报错。

验证结果：

```bash
npm test -- src/App.test.tsx -t "filters exploration"
# 1 个目标测试通过

npm test && npm run build && npm run lint
# 8 个测试文件通过，44 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前功能：待探索页左侧筛选已不再是静态占位；状态、工作线、来源类型的数量来自真实 `productExploreItems`，可以组合过滤，列表数量和右侧详情会随筛选结果更新。

下一步建议：

1. 继续完善待探索状态流：增加「已验证 / 已采用 / 放弃」动作。
2. 实现「加入工作线」的真实行为：选择目标工作线后写入 `linkedThreadIds` 并持久化。
3. 扩展 Relation：继续记录时可从当前工作线记录中选择任意引用 / 延伸对象，而不只是当前记录。
4. 组件拆分：优先把 `ExplorePage / ExploreFilterPanel / ExploreDetail` 拆出，降低 `App.tsx` 体积。


## 2026-07-09 23:33 CST

继续做上一轮下一步建议第一项：完善待探索状态流。本轮只做状态动作的最小闭环：在待探索详情页增加「标记已验证 / 标记已采用 / 放弃探索」，并写回 `yinian.product.exploreItems`。

TDD：

- RED：在 `src/App.test.tsx` 新增「marks exploration items as verified, adopted, or dropped and persists the status」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "marks exploration"
```

结果：1 个目标测试失败，失败原因符合预期：页面找不到 `标记已验证` 按钮，说明当前待探索详情只能「开始探索」，还不能标记已验证 / 已采用 / 放弃。

GREEN：

- `src/App.tsx`
  - `ExplorePage` 新增通用 `setExploreStatus(status)`，复用已有 `onUpdateExploreStatus` 写回产品状态，并显示 `状态已更新为{status}。`。
  - `startExploring()` 改为调用 `setExploreStatus('探索中')`。
  - `ExploreDetail` 新增 `onUpdateStatus` prop。
  - 详情侧操作区新增：
    - `标记已验证` → 状态写为 `已验证`。
    - `标记已采用` → 状态写为 `已采用`。
    - `放弃探索` → 状态写为 `放弃`。
  - 状态变化继续持久化到 `yinian.product.exploreItems`，刷新/重挂载后可恢复。

验证结果：

```bash
npm test -- src/App.test.tsx -t "marks exploration"
# 1 个目标测试通过

npm test && npm run build && npm run lint
# 8 个测试文件通过，45 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前功能：待探索详情页现在支持从同一个探索项连续切换为已验证、已采用、放弃；状态会立刻更新详情/列表/统计，并持久化到 localStorage。

下一步建议：

1. 实现「加入工作线」真实行为：选择目标工作线后写入 `linkedThreadIds` 并持久化。
2. 扩展 Relation：继续记录时可从当前工作线记录中选择任意引用 / 延伸对象，而不只是当前记录。
3. 组件拆分：优先把 `ExplorePage / ExploreFilterPanel / ExploreDetail` 拆出，降低 `App.tsx` 体积。
4. 改进状态动作的 UI 呈现：可根据当前状态禁用重复动作或把动作折叠成小型状态菜单。


## 2026-07-09 23:39 CST

继续做上一轮下一步建议第一项：实现「加入工作线」真实行为。本轮只做最小闭环：在待探索详情页选择目标工作线，点击「加入工作线」后把目标 `threadId` 写入当前探索项 `linkedThreadIds`，并持久化到 `yinian.product.exploreItems`。

TDD：

- RED：在 `src/App.test.tsx` 新增「adds an exploration item to a selected workline and persists the link」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "adds an exploration"
```

结果：1 个目标测试失败，失败原因符合预期：页面找不到 `选择加入工作线` label，说明待探索详情里「加入工作线」仍只是静态按钮，没有选择目标工作线和写入关联的真实行为。

GREEN：

- `src/App.tsx`
  - 新增 `addExploreToThread(exploreId, threadId)`，将目标工作线写入当前探索项 `linkedThreadIds`，已有关系则不重复添加，并写回 `saveProductExploreItems`。
  - `ExplorePage` 接收 `threads` 与 `onAddExploreToThread`。
  - `ExplorePage` 新增 `joinThreadId` 状态和 `joinSelectedThread()`。
  - `ExploreDetail` 增加「选择加入工作线」select，选项来自真实 `productThreads`。
  - 点击「加入工作线」后显示 `已加入 {工作线名}。`，右侧关联工作线 tag 立即更新。
  - 新增关系持久化到 `yinian.product.exploreItems`，刷新/重挂载后仍能恢复。
- `src/App.test.tsx`
  - 因 `RoArm-M3` 同时会出现在关联 tag 与 select option 中，断言改为 `getAllByText('RoArm-M3').length > 0`，避免 Testing Library 多元素歧义。

验证结果：

```bash
npm test -- src/App.test.tsx -t "adds an exploration"
# 1 个目标测试通过

npm test && npm run build && npm run lint
# 8 个测试文件通过，46 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前功能：待探索详情页现在可以选择工作线并把探索项加入该工作线；关联关系会立刻影响详情 tag、左侧工作线筛选计数，并持久化到 localStorage。

下一步建议：

1. 扩展 Relation：继续记录时可从当前工作线记录中选择任意引用 / 延伸对象，而不只是当前记录。
2. 组件拆分：优先把 `ExplorePage / ExploreFilterPanel / ExploreDetail` 拆出，降低 `App.tsx` 体积。
3. 优化状态动作 UI：根据当前状态禁用重复动作，或折叠成小型状态菜单。
4. 待探索加入工作线后，可进一步支持自动创建对应 Entry，记录「从待探索采用为工作线资料」。


## 2026-07-09 23:43 CST

继续做上一轮下一步建议第一项：扩展 Relation。此前「继续记录」只能勾选「延伸当前记录」，本轮做一个更实用的最小切片：继续记录时可以从当前工作线记录中选择任意一条作为延伸对象，并把新 Entry 的 `extendsId` 指向该记录。

TDD：

- RED：在 `src/App.test.tsx` 新增「extends a selected workline record when continuing instead of only the current record」用例。
- 已运行：

```bash
npm test -- src/App.test.tsx -t "extends a selected workline"
```

结果：1 个目标测试失败，失败原因符合预期：页面找不到 `选择延伸对象` label，说明继续记录表单尚不支持从工作线历史记录中选择任意父节点。

GREEN：

- `src/App.tsx`
  - `ThreadProgressPage` 新增 `extendTargetId` 状态。
  - 继续记录表单新增「选择延伸对象」select。
  - select 选项来自当前工作线 `threadEntries`，显示 `#编号 + 标题`。
  - 保存时优先使用 `extendTargetId`，否则兼容原来的「延伸当前记录」checkbox。
  - 保存后清空 `extendTargetId`，并继续复用 `onAddEntry(..., extendsId)` 写入 `yinian.product.entries`。
  - 「延伸当前记录」仍保留，勾选时会清空显式选择，避免两个来源冲突。

验证结果：

```bash
npm test -- src/App.test.tsx -t "extends a selected workline"
# 1 个目标测试通过

npm test && npm run build && npm run lint
# 8 个测试文件通过，47 个测试通过
# tsc -b && vite build 通过
# oxlint 0 warnings / 0 errors
```

当前功能：工作线详情 / 进展页继续记录时，可以选择当前工作线任意一条历史记录作为延伸对象；保存后的新记录会持久化 `extendsId`，链条页能显示为对应父节点的子节点。

下一步建议：

1. 继续扩展 Relation：增加 `relatedIds` 的“引用/相关记录”多选，而不只是树状 `extendsId`。
2. 组件拆分：优先拆 `ExplorePage / ExploreFilterPanel / ExploreDetail`，其次拆 `ThreadProgressPage`，降低 `App.tsx` 体积。
3. 优化继续记录表单 UI：把「延伸当前记录」和「选择延伸对象」合并成一个更清晰的 Relation 区块。
4. 待探索加入工作线后，支持自动创建对应 Entry，记录「从待探索采用为工作线资料」。
