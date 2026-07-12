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

## 2026-07-11 SQLite server-only 数据迁移

目标：彻底移除 localStorage / IndexedDB 业务存储，以 SQLite 作为工作线、记录、待探索和旧想法的唯一事实来源。

TDD RED：

- 服务端新增 bootstrap、产品 CRUD、旧浏览器数据迁移与重启持久化测试；首次运行 4 个新增测试失败，确认产品 API/schema 尚不存在。
- 前端新增迁移顺序、加载失败重试、空 bootstrap、API 写失败保留草稿测试；首次运行 4 个新增测试失败。
- 浏览器刷新验证发现新记录在 SQLite 中排到列表末尾，今天页只显示前 6 条。新增服务端回归断言：创建记录后 bootstrap 的第一条必须是新记录；测试失败为 `expected e15 to be entry-new`。

GREEN：

- `server/server.mjs`
  - SQLite 新增 `threads / entries / explore_items / app_metadata` 产品表。
  - 首次初始化从 `server/product-seed.json` 显式 seed，重启不重复。
  - 新增 `/api/product/bootstrap`。
  - 新增工作线创建/编辑、记录创建/编辑/删除、待探索状态/笔记/工作线关联 API。
  - 新增 `/api/migrations/local-storage`，在 SQLite transaction 内导入三个产品快照和旧 `yinian.ideas.v1`；仅返回成功导入的 `safeToDeleteKeys`。
  - 新记录使用 `prependEntity` 写到 position 0，已有 position 整体后移，保证刷新后仍按最新优先显示。
- `src/api.ts`
  - 增加产品 API 客户端。
  - 一次性 legacy importer 只读取四个旧 key；服务端确认成功后才清理。损坏 JSON 保留，不误删。
- `src/App.tsx`
  - 启动时先执行旧数据导入，再从 SQLite bootstrap 加载。
  - 增加 loading / error / retry / empty 状态。
  - 所有业务写操作改为 API 成功后更新 React state；失败时不假成功。
  - 删除默认数据持久化回退和全局静态工作线读取。
- 删除正常业务存储模块：`productStorage / ideaStorage / imageStore` 及其测试。
- `vite.config.ts` 增加开发环境 `/api`、`/uploads` 代理。

最终验证：

```bash
npm test
# 5 个测试文件通过，48 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

真实验证：

- 临时 SQLite 创建记录后停止并重启 Node 服务，bootstrap 从 12 条变为 13 条；记录 ID 在 SQLite 中恰好存在 1 行。
- `/yinian/` 浏览器页面正常加载，console 无错误。
- 浏览器 localStorage key 为空；新增记录后 UI 显示保存成功且没有产生 localStorage key。
- 已修复新增记录刷新后因 position 排在末尾而不出现在「今日记录」前 6 条的问题，并加入服务端回归测试。

## 2026-07-11 新想法快速创建工作线

按最新产品优先级推进第一项：把首页快速记录的默认行为改为“创建新工作线 + 首条记录”，而不是把所有新想法塞进已有工作线。

TDD RED：

- 新增 `creates a new workline and its first entry from quick capture by default`。
- 首次运行失败：页面不存在「保存为新想法」，也没有原子创建工作线与首条记录的 API。

GREEN：

- 新增 `POST /api/product/worklines`，在一个 SQLite transaction 中创建工作线和首条 Entry。
- 新增 `createProductWorkline()` API 客户端。
- 首页主按钮改为「保存为新想法」；Ctrl/Cmd+Enter 同样走默认新工作线路径。
- 保留次级「保存 Ctrl+Enter」按钮用于明确追加到下拉框选中的已有工作线，兼容已有分类/追加能力。
- API 失败时仍保留输入草稿，不更新前端成功状态。

验证：

```bash
npm test
# 5 个测试文件通过，50 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：继续产品优先级第 2 项，强化工作线详情中的常驻追加入口和时间线体验。

## 2026-07-11 工作线常驻追加入口

继续产品优先级第 2 项。本轮把工作线详情中的「继续记录」从点击后才展开，改为进展页始终可见的核心输入区。

TDD RED：

- 新增 `keeps the workline continuation composer always visible and saves with Ctrl+Enter`。
- 首次运行失败：进入工作线详情后不存在 `继续记录表单`，必须先点击「+ 继续记录」。

GREEN：

- 「继续记录这件事」表单移动到右栏顶部并始终显示。
- 默认语义明确为普通追加，不建立分支；`extendsId` 仍属于可选高级关系。
- 支持在工作线输入框内使用 Ctrl/Cmd+Enter 保存。
- 保留「+ 继续记录」快捷按钮，点击时改为聚焦常驻输入框，而不是折叠/展开表单。
- 保存成功后新记录立即出现在当前工作线进展流，并继续通过 SQLite API 持久化。

验证：

```bash
npm test
# 5 个测试文件通过，51 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：继续产品优先级第 3 项，补齐记录移动到其他工作线的真实行为；编辑、删除已经可用。

## 2026-07-11 移动记录到其他工作线

继续产品优先级第 3 项。本轮补齐记录编辑范围中的“移动到其他工作线”。

TDD RED：

- 新增 `moves a record to another workline through the SQLite API`。
- 首次运行失败：点击「移动到工作线」后没有目标工作线选择器，按钮仍是静态占位。

GREEN：

- 全部记录详情中的「移动到工作线」现在会展开目标工作线选择器。
- 目标列表排除记录当前所属工作线。
- 点击「确认移动」通过已有 Entry PATCH API 更新 `threadId`。
- API 成功后才更新 React 状态并显示 `已移动到 {工作线}。`。
- 重新挂载并读取 SQLite bootstrap 后，记录仍归属于新工作线。
- API 失败继续沿用显式错误提示，不做本地假成功。

验证：

```bash
npm test
# 5 个测试文件通过，52 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：产品优先级第 4 项，把具体记录上的「从这里继续」做成直接、明确的入口，并自动设置 `extendsId`。

## 2026-07-11 从具体记录继续

继续产品优先级第 4 项。本轮把记录详情中的模糊「继续引用」改为明确的「从这里继续」。

TDD RED：

- 新增 `continues directly from a concrete record and stores extendsId`。
- 首次运行失败：记录详情没有「从这里继续」按钮，也没有直接创建子记录的输入区。

GREEN：

- 全部记录详情新增明确的「从这里继续」入口。
- 点击后显示父记录标题和轻量输入框，用户无需选择延伸对象。
- 保存的新 Entry 自动沿用父记录 `threadId`，并写入 `extendsId = 当前记录.id`。
- 保存通过现有 SQLite Entry 创建 API 完成，成功后显示 `已从这条记录继续。`。
- 新记录加入记录列表，但详情保持在父记录上，避免成功提示因自动切换选中项而消失。
- 普通工作线追加仍只写 `threadId`；只有显式「从这里继续」才写 `extendsId`。

验证：

```bash
npm test
# 5 个测试文件通过，53 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：核心产品优先级 1–4 已形成闭环；在优化链条图之前，先审计当前仍为静态占位的操作和硬编码统计，确定下一项真实产品缺口。

## 2026-07-11 静态占位审计与首页真实统计

先审计当前产品壳中的静态占位，发现最影响可信度的是首页：Hero 和「今日概览」仍展示固定的工作线、记录、问题、待探索数量，数据变化后不会更新。其他待处理占位包括工作线本周概况、链条画布缩放/居中、记录复制/加入线索，以及固定的相关记录数。

本轮优先把首页核心统计迁到 SQLite bootstrap 的真实产品数据。

TDD RED：

- 新增 `derives Today summary counts from SQLite bootstrap data`。
- 首次运行失败：页面没有 `今日概览统计` 区域，仍显示硬编码 `工作线 4 / 问题 2 / 待探索 5 / 已解决 2`。

GREEN：

- Hero 副标题改为真实的活跃工作线数和今日记录数。
- 今日概览改为实时计算：活跃工作线、今日记录、今日问题、待探索。
- 统计全部来自 SQLite bootstrap 加载后的 `threads / entries / exploreItems`，后续新增、移动或状态变化会随 React 状态更新。
- 为统计区增加可访问名称，测试按每张指标卡断言标签和值，避免重复数字造成歧义。

验证：

```bash
npm test
# 5 个测试文件通过，54 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：继续清理高影响静态占位，优先将工作线列表右侧「本周概况」从固定数字改为真实数据；之后再处理链条画布操作和低频记录操作。

## 2026-07-11 工作线真实概况统计

继续清理高影响静态占位。本轮将工作线列表顶部状态数量和右侧「本周概况」接入 SQLite bootstrap 的真实 `threads / entries` 数据。

TDD RED：

- 新增 `derives workline summary and status tabs from SQLite bootstrap data`。
- 首次运行失败：没有 `工作线概况统计` 区域，状态标签仍固定为 `进行中 6 / 暂停 2 / 已完成 12`，右栏仍固定显示 `6 / 28 / 3 / 5`。

GREEN：

- 顶部进行中、暂停、已完成数量改为按真实工作线状态计算。
- 右侧概况改为实时计算：活跃工作线、全部记录、未解决问题、待推进下一步。
- `ThreadsPage` 现在同时接收 SQLite bootstrap 的工作线与记录集合。
- 删除无行为的「查看全部工作线」占位按钮，因为当前页面本身已经是全部工作线。
- 为概况区增加可访问名称，并按指标卡验证标签与数值。

验证：

```bash
npm test
# 5 个测试文件通过，55 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：进入产品优先级第 5 项的最小切片，先让链条画布的居中、放大、缩小按钮产生真实可见效果，而不是静态占位。

## 2026-07-11 链条画布缩放与居中

进入产品优先级第 5 项的最小切片。本轮只处理链条画布工具栏，让原来的静态控件产生真实可见效果。

TDD RED：

- 新增 `zooms and recenters the chain canvas with visible controls`。
- 首次运行失败：页面没有可定位的链条画布内容，居中、缩小、放大按钮没有行为或可访问名称。

GREEN：

- 链条画布增加独立内容容器和 `transform-origin: top center`。
- 放大、缩小按 10% 步进，范围限制为 70%–150%。
- 工具栏百分比实时显示当前缩放值。
- 「居中」恢复 100% 并把画布滚动位置归零；浏览器支持时使用平滑滚动。
- 控件增加 `居中链条 / 缩小链条 / 放大链条` 可访问名称。
- 增加缩放过渡，使视觉变化清晰但克制。
- 修复 jsdom 不实现 `scrollTo` 导致的测试未处理异常，运行时先检查方法是否存在。

验证：

```bash
npm test
# 5 个测试文件通过，56 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：继续优化链条关系表达，先将记录详情中固定的「相关记录 3 条」改为按真实 `extendsId / relatedIds` 关系计算，再决定是否实现更多分支视觉。

## 2026-07-11 记录关系真实统计

继续优化链条关系表达。本轮清除记录详情中固定的「相关记录 3 条」，改为根据当前 SQLite bootstrap 中的真实 Entry 关系计算。

TDD RED：

- 新增 `derives record relation counts from extendsId and relatedIds`。
- 首次运行失败：记录详情没有可定位的 `记录关系统计` 区域；无关系记录仍显示固定 `相关记录 3 条`。

GREEN：

- `RecordDetail` 接收当前完整 Entry 集合，在全部记录页和链条页使用同一套关系计算。
- 「上游」显示当前记录的 `extendsId`，没有父记录时显示「无」。
- 「直接延伸」统计 `candidate.extendsId === 当前记录.id` 的直接子记录数。
- 「相关记录」合并当前记录的 `relatedIds` 和其他记录反向指向当前记录的 `relatedIds`，使用 Set 去重。
- 关系概览增加 `记录关系统计` 可访问名称。
- 将模糊标签「延伸」改为「直接延伸」，明确它不包含全部后代。

验证：

```bash
npm test
# 5 个测试文件通过，57 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：继续清理记录详情低频静态操作，优先让「复制」成为真实剪贴板操作并提供成功/失败反馈；「加入线索」在明确数据模型前不做假实现。

## 2026-07-11 复制记录到剪贴板

继续清理记录详情低频静态操作。本轮把「复制」从无行为按钮改为真实 Clipboard API 操作。

TDD RED：

- 新增 `copies the selected record body to the clipboard with feedback`。
- 首次运行失败：点击「复制」没有调用 `navigator.clipboard.writeText`，也没有任何反馈。

GREEN：

- 点击「复制」会把当前记录完整 `body` 写入系统剪贴板，而不是只复制截断标题。
- 成功后显示 `已复制记录内容。`。
- Clipboard API 不存在或写入失败时显示 `复制失败，请手动选择内容。`，不假报成功。
- 复制反馈使用 `role=status`，辅助技术可以感知操作结果。
- 切换记录时清空旧复制反馈，避免把上一条记录的状态带到新详情。
- 「加入线索」仍保留未实现状态，等待先明确线索的数据模型与目标页面，不做假持久化。

验证：

```bash
npm test
# 5 个测试文件通过，58 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：审计剩余无行为按钮；优先移除或实现记录详情的「加入线索」和链条页的「引用这个记录 / 加入链条」，避免界面继续暴露不可用操作。

## 2026-07-11 移除无行为的记录关系操作

继续静态占位审计。本轮不在关系模型尚未明确时伪造持久化，而是移除会误导用户的空按钮。

TDD RED：

- 新增 `hides unsupported record actions instead of exposing inert buttons`。
- 首次运行失败：全部记录详情仍显示无行为的「加入线索」。
- 同时更新旧链条页面壳测试，不再把「引用这个记录」占位按钮当作必备功能。

GREEN：

- 从记录详情快速操作中移除无行为的「加入线索」。
- 链条模式不再显示无行为的「引用这个记录 / 加入链条」。
- 全部记录模式继续保留已经真实可用的「查看链条 / 从这里继续」。
- 编辑、复制、移动、删除等真实操作保持不变。
- 后续若引入 `relatedIds` 编辑，需要先定义明确的选择与 SQLite 持久化流程，再重新增加入口。

验证：

```bash
npm test -- src/App.test.tsx -t "hides unsupported record actions"
# 1 个目标测试通过

npm test
# 5 个测试文件通过，59 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：继续审计页面中的静态占位与硬编码内容，优先挑选对核心工作线记录路径影响最大的真实缺口。

## 2026-07-11 明确快速记录的次级追加动作

继续审计核心记录路径。本轮修正首页快速记录中仍会误导用户的按钮文案：Ctrl/Cmd+Enter 已经执行默认的“保存为新想法”，但次级按钮仍写着「保存 Ctrl+Enter」。

TDD RED：

- 新增 `labels the secondary quick-capture action as appending to the selected workline`。
- 首次运行失败：页面找不到「追加到已有工作线」，仍显示语义错误的「保存 Ctrl+Enter」。

GREEN：

- 次级按钮改名为「追加到已有工作线」。
- 按钮行为不变：把记录追加到当前下拉框选中的工作线，并保留类型与来源。
- 默认主按钮继续为「保存为新想法」。
- Ctrl/Cmd+Enter 继续对应默认主动作，即原子创建新工作线和首条记录。
- 更新所有次级追加路径测试，使按钮文案和实际行为一致。

验证：

```bash
npm test -- src/App.test.tsx -t "labels the secondary quick-capture action"
# 1 个目标测试通过

npm test
# 5 个测试文件通过，60 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：继续审计工作线卡片中仍来自 seed 字段的记录数、问题数、来源数，改为从 SQLite bootstrap 的真实 Entry 集合计算。

## 2026-07-11 工作线卡片真实统计

继续清理工作线页面的过时 seed 数据。本轮把每张工作线卡片底部的记录数、问题数、来源数改为从当前 SQLite bootstrap Entry 集合实时计算。

TDD RED：

- 新增 `derives each workline card counts from SQLite entries instead of seed counters`。
- 测试使用与 seed 计数明显不同的 bootstrap Entry 集合。
- 首次运行失败：工作线卡片没有可定位的统计区域，且一念产品仍显示 seed 中的 `记录数 48 / 问题数 3 / 来源数 27`。

GREEN：

- `ThreadsPage` 把完整实时 Entry 集合传入每张 `ThreadCard`。
- 记录数按 `entry.threadId === thread.id` 计算。
- 问题数在当前工作线记录中按 `type === '问题'` 计算。
- 来源数按当前工作线中 `source` 非空的记录计算。
- 工作线卡片与三个统计值增加可访问名称，测试可以按具体工作线和指标精确定位。
- 不再使用 `WorkThread.recordCount / issueCount / sourceCount` seed 字段展示卡片统计。

验证：

```bash
npm test -- src/App.test.tsx -t "derives each workline card counts"
# 1 个目标测试通过

npm test
# 5 个测试文件通过，61 个测试通过

npm run build
# tsc -b && vite build 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

下一步：审计工作线详情侧栏中的 `StatusPanel / NextStepsPanel / SourcePanel / DecisionPanel`，移除或数据化仍为固定内容的模块。

## 2026-07-11 移除记录类型选择

根据实际记录习惯降低输入摩擦：用户记录当下内容时通常不会先判断它属于进展、问题、方案还是决策，因此不再要求用户手动分类。

TDD RED：

- 新增 `keeps capture frictionless without asking users to classify record types`。
- 首次运行失败：首页仍显示「选择类型」，工作线常驻追加表单仍显示「继续记录类型」。

GREEN：

- 首页快速记录移除类型下拉框。
- 工作线详情「继续记录这件事」移除类型下拉框。
- 新建想法、追加到已有工作线、工作线内继续记录统一以内部兼容值 `记录` 写入 SQLite；该字段不再要求用户感知或选择。
- 保留旧数据已有的进展、问题、方案、决策、线索类型，避免破坏历史记录展示和筛选。
- 更新追加、重载和工作线继续记录测试，验证无需分类也能完整保存。

验证：

```bash
npm test
# 5 个测试文件通过，62 个测试通过

npm run build:server
# tsc -b && vite build --mode server 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

运行验证：

- 已重启 SQLite 一体化服务：`http://127.0.0.1:3012/yinian/`
- 页面 HTTP 200，bootstrap API 可用。
- 已确认服务加载最新构建 `index-NB9F4q-C.js`。

下一步：考虑进一步弱化历史“类型”在全部记录筛选和卡片中的视觉权重；先保留旧数据兼容，不阻碍记录入口。

## 2026-07-11 来源输入默认展开

继续降低快速记录的操作层级。来源本身是可选信息，但不需要先点击「+ 来源」才能填写。

TDD RED：

- 新增 `shows optional source fields by default without an expand action`。
- 首次运行失败：页面默认找不到来源类型和来源内容，仍需要点击「+ 来源」。

GREEN：

- 删除「+ 来源」展开按钮和对应开关状态。
- 来源类型与来源内容在快速记录中默认可见。
- 来源内容明确标注为“可选”，留空不影响保存。
- 保存成功后只清空来源内容，输入区继续保持可见。
- 原有来源写入 SQLite 和详情展示行为保持不变。

验证：

```bash
npm test
# 5 个测试文件通过，63 个测试通过

npm run build:server
# tsc -b && vite build --mode server 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

运行验证：

- 已重启 `http://127.0.0.1:3012/yinian/`
- 页面与 bootstrap API 均返回 HTTP 200。
- 已确认服务使用最新构建 `index-Y0xYfNyP.js`。

下一步：继续围绕“打开即记录”简化快速记录区域，审计工作线选择是否也应只在“追加到已有工作线”路径中出现。

## 2026-07-11 美化并放大工作线选择器

针对「@ 工作线」下拉框字体小、点击区域窄、视觉像浏览器默认控件的问题，重做为更清晰的产品级选择器，同时保留原生 select 的键盘与辅助功能行为。

TDD RED：

- 新增 `renders the workline picker as a large easy-to-click control`。
- 首次运行失败：选择器没有独立组件 class，也没有 48px 点击高度和 16px 字号。

GREEN：

- 标签从符号化的「@ 工作线」改为更明确的「归入工作线」。
- 增加独立的选择器容器与 `@` 前缀区域，视觉层级更清楚。
- 点击区域提升为约 50px，select 自身最小高度 48px。
- 字号提升到 16px、字重 750，当前工作线更易读。
- 控件宽度在桌面端为 430px，移动端保持不超过可用宽度。
- 增加 hover、focus-within 边框与焦点环反馈。
- 保留原生 select，不牺牲键盘操作、移动端选择体验和可访问性。

验证：

```bash
npm test
# 5 个测试文件通过，64 个测试通过

npm run build:server
# tsc -b && vite build --mode server 通过

npm run lint
# oxlint 0 warnings / 0 errors

impeccable detect
# []，无检测问题
```

浏览器实测：

- 选择器实际高度 48px，外壳 50px。
- 字号 16px，字重 750，鼠标指针为 pointer。
- 桌面端宽度 430px。
- 页面 console 无报错。
- 已重启最新构建：`http://127.0.0.1:3012/yinian/`。

下一步：如继续简化默认“保存为新想法”路径，可将工作线选择器与「追加到已有工作线」次级操作组成更明确的同一交互区。

## 2026-07-11 自定义工作线下拉菜单

原生 select 的展开菜单由操作系统绘制，外壳美化后菜单本身仍显得突兀。本轮将其替换为与一念视觉系统一致的自定义列表菜单。

TDD RED：

- 新增 `opens a styled workline menu and selects an option`。
- 首次运行失败：页面只有原生 combobox，没有自定义触发按钮、listbox 和可样式化选项。

GREEN：

- 选择器改为自定义触发按钮，显示当前工作线名称和状态。
- 展开菜单使用独立浮层、圆角、阴影和完整宽度对齐。
- 每个选项显示工作线图标、名称、当前阶段，点击区域最小 54px。
- 当前选项使用暖色背景和绿色对勾明确标识。
- 增加展开箭头旋转、hover、focus 和选中反馈。
- 菜单最大高度 320px，工作线较多时内部滚动。
- 保留隐藏的原生 select 作为状态桥接，现有保存路径与测试操作不变。
- 使用 `button + listbox + option` 语义，暴露 `aria-expanded / aria-selected`。

验证：

```bash
npm test
# 5 个测试文件通过，65 个测试通过

npm run build:server
# tsc -b && vite build --mode server 通过

npm run lint
# oxlint 0 warnings / 0 errors

impeccable detect
# []，无检测问题
```

浏览器验证：

- 自定义菜单可正常打开、选择后关闭并更新当前工作线。
- 菜单和触发器左右对齐，无裁切。
- 每项高度充足，选中状态清晰。
- 最新版已重启：`http://127.0.0.1:3012/yinian/`。

下一步：继续优化真实工作线命名质量；当前数据库中的「1 / 2」本身语义较弱，会影响菜单观感，但不属于选择器样式问题。

## 2026-07-11 合并快速记录保存语义

根据用户的真实心智模型，快速记录不应该提供「追加」和「新想法」两个按钮让用户再做一次决定。默认就是新想法；只有主动选择已有工作线后，保存才变为追加。

TDD RED：

- 新增 `uses one save action: new idea by default and append after selecting a workline`。
- 首次运行失败：页面仍有两个按钮，工作线默认选中已有项，也没有统一的「保存」动作。

GREEN：

- 快速记录只保留一个「保存」按钮。
- 工作线选择器默认显示「新想法 / 默认创建新工作线」。
- 下拉菜单首项增加「新想法 / 创建一条新工作线」。
- 未选择已有工作线时，点击保存或 Ctrl/Cmd+Enter 调用原子工作线创建 API。
- 用户选择任意已有工作线后，同一个保存按钮改为调用 Entry 创建 API，追加到该工作线。
- 保存成功后工作线选择恢复为「新想法」，下一次捕捉不会误追加到上次目标。
- 删除界面中的「追加到已有工作线 / 保存为新想法」两个分离按钮。
- API 失败时继续保留草稿，不假报成功。

验证：

```bash
npm test
# 5 个测试文件通过，66 个测试通过

npm run build:server
# tsc -b && vite build --mode server 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

运行验证：

- 已重启 `http://127.0.0.1:3012/yinian/`
- 页面和 bootstrap API 均返回 HTTP 200。
- 已确认服务使用最新构建 `index-Bl9CHNhz.js`。

下一步：继续让保存结果反馈更贴近统一动作，例如在按钮附近显示「将创建新工作线 / 将追加到 X」的轻量预览，但不增加额外操作。

## 2026-07-11 修复新记录时间占位符

用户发现新记录列表出现「现在 / 记录 / 22」「现在 / 记录 / 1」，其中时间不对。根因是所有新建 Entry 都把 `time` 硬编码为字符串 `现在`，并直接持久化到 SQLite，因此列表只能展示占位词而不是真实时间。

TDD RED：

- 新增 `stores the actual local time instead of the placeholder now`。
- 首次运行失败：新工作线请求中的 `entry.time` 实际为 `现在`，期望本地 `HH:mm`。

GREEN：

- 新增统一 `formatEntryTime(new Date())`，输出本地 24 小时制 `HH:mm`。
- 快速保存为新想法使用真实时间。
- 选择工作线后的追加记录使用真实时间。
- 工作线详情中的继续记录和“从这里继续”共用路径也使用真实时间。
- 时间在创建时写入 SQLite，刷新后仍保持原始创建时间，不会随着页面刷新变化。
- 历史记录里已经写成「现在」的数据暂不伪造修改；本次修复保证所有后续新记录正确。

验证：

```bash
npm test -- src/App.test.tsx -t "stores the actual local time"
# 1 个目标测试通过

npm test
# 5 个测试文件通过，67 个测试通过

npm run build:server
# tsc -b && vite build --mode server 通过

npm run lint
# oxlint 0 warnings / 0 errors
```

运行验证：

- 已重启 `http://127.0.0.1:3012/yinian/`
- 页面与 bootstrap API 均返回 HTTP 200。
- 已确认服务使用最新构建 `index-DqexyDNP.js`。

下一步：如需修复历史「现在」记录，应基于 SQLite 可靠的创建元数据做一次明确迁移；没有可靠时间来源的旧记录不应猜测时间。

运行方式：

```bash
npm run build:server
YINIAN_BASE_PATH=/yinian HOST=0.0.0.0 PORT=3010 npm run start
```

数据位置：

- SQLite：`server-data/yinian.sqlite`
- 上传文件：`server-data/uploads/`
- 备份时应同时备份这两个位置。

## 2026-07-11：补齐工作线删除

- 工作线列表卡片新增删除按钮和不可撤销确认。
- SQLite API 事务性删除工作线及其记录，并清理待探索条目中的工作线关联。
- TDD：UI/API 定向测试先因缺少按钮和 DELETE 路由失败，实施后通过。
- 验证：`npm run test` 68/68，`npm run build`、`npm run lint` 均通过。
