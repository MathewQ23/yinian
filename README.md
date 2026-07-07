# 一念

记录想法，也记录它从哪里来。

一念是一个极简灵感记录工具。核心目标不是做复杂收藏夹，而是保留一个最小闭环：

> 我看到一个东西 → 产生想法 → 立刻记下来 → 以后还能知道这个想法从哪里来的。

## 当前功能

- 写想法：一个大输入框，快速记录此刻想到的内容
- 可选来源：想法可以没有来源，也可以附加三种来源
  - 链接
  - 图片
  - 文字
- 引用其他想法：新增想法时可以选择已有想法作为引用，并在列表中展示引用关系
- 想法列表：通过导航进入列表页查看已记录内容
- 时间线展示：按今天、昨天、具体日期分组
- 长内容折叠：较长想法默认折叠为紧凑卡片，可展开全文/收起
- 删除二次确认：删除前需要再次确认，降低误删风险
- JSON 导出：可以导出全部记录作为备份
- 可选服务端模式：可以使用 Node 服务端运行，也可以只使用静态前端版本

## 数据保存

一念支持两种运行方式：

### 静态前端模式

适合本地试用或静态站点部署。数据保存在当前浏览器中：

- 想法文本、可选来源、时间戳：LocalStorage
- 上传图片：IndexedDB

注意：换浏览器、换设备或清理站点数据后，本地记录可能不可见。重要内容建议定期使用“导出 JSON”备份。

### 服务端模式

适合需要跨设备或长期运行的场景。服务端模式会通过 Node 服务端提供 API，并由服务端负责保存数据。

## 本地开发

```bash
npm install
npm run dev
```

然后打开 Vite 输出的本地地址。

## 构建

构建静态前端：

```bash
npm run build
```

构建服务端版本：

```bash
npm run build:server
```

启动服务端：

```bash
npm run start
```

## GitHub Pages 静态部署

项目保留 GitHub Pages project site 配置，默认构建路径为：

```text
/yinian/
```

部署命令：

```bash
npm run deploy:pages
```

如果第一次部署，需要在 GitHub 仓库页面设置 Pages 来源：

```text
Settings → Pages → Build and deployment → Source → Deploy from a branch
Branch: gh-pages
Folder: / (root)
```

## 测试与构建检查

```bash
npm run test
npm run build
npm run build:server
npm run lint
```

当前验证结果：

- 测试：7 个测试文件，22 个测试通过
- 构建：`npm run build:server` 通过

## 技术栈

- React
- TypeScript
- Vite
- Vitest
- Testing Library
- Node.js
- better-sqlite3
- LocalStorage / IndexedDB fallback

## 暂时不做什么

为了保持 MVP 聚焦，当前版本刻意不做：

- AI 自动总结
- AI 标签
- 自动分类
- 知识图谱
- 向量搜索
- 浏览器插件
- 视频时间戳解析
- 网页全文保存
- 自动截图网页
- 多用户账号系统
- 社交功能
- Markdown 编辑器

## 产品原则

记录一个灵感不能比发一条微信消息更麻烦。

第一版只关注：

> 用户是否愿意在产生想法之后，同时记录自己的想法和来源？
