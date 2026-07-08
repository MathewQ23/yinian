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
