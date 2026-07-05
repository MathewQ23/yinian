# 一念

记录想法，也记录它从哪里来。

这是一个 local-first 的极简灵感记录 MVP。它不把自己做成复杂收藏夹，而是先验证一个最小闭环：

> 我看到一个东西 → 产生想法 → 立刻记下来 → 以后还能知道这个想法从哪里来的。

## 当前功能

- 写想法：一个大输入框，快速记录此刻想到的内容
- 可选来源：想法可以没有来源，也可以附加三种来源
  - 链接
  - 图片
  - 文字
- 删除想法：在“想法列表”里删除不需要的记录
- 自动记录时间：保存时自动写入创建/更新时间
- 独立列表页：已记录内容不堆在首页，通过导航进入“想法列表”查看
- 时间线展示：按今天、昨天、具体日期分组
- 本地保存：不需要登录，不需要服务器
- JSON 导出：可以把本地记录导出为备份文件

## 数据保存在哪里

当前版本是纯前端应用，所有数据都保存在浏览器本地：

- 想法文本、可选来源、时间戳：LocalStorage
  - key: `yinian.ideas.v1`
- 上传图片：IndexedDB
  - database: `yinian-images`
  - store: `images`

注意：

- 换浏览器、换设备后看不到原来的记录
- 清理浏览器站点数据会删除记录
- GitHub Pages 只托管静态页面，不会保存用户数据
- 建议定期使用“导出 JSON”备份

## 在线部署

项目已经按 GitHub Pages project site 配置，生产构建路径为：

```text
/yinian/
```

当前采用 `gh-pages` 分支部署，避免依赖 GitHub Actions 的 Pages 部署权限。

预期访问地址：

```text
https://mathewq23.github.io/yinian/
```

第一次部署后，需要在 GitHub 仓库页面设置 Pages 来源：

```text
Settings → Pages → Build and deployment → Source → Deploy from a branch
Branch: gh-pages
Folder: / (root)
```

本地重新部署：

```bash
npm run deploy:pages
```

## 本地开发

```bash
npm install
npm run dev
```

然后打开 Vite 输出的本地地址。

## 测试与构建

```bash
npm run test
npm run build
npm run lint
```

当前验证结果：

- 测试：6 个测试文件，15 个测试通过
- 构建：通过
- Lint：0 warnings / 0 errors

## 技术栈

- React
- TypeScript
- Vite
- Vitest
- Testing Library
- LocalStorage
- IndexedDB

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
- 用户系统
- 社交功能
- Markdown 编辑器

## 产品原则

记录一个灵感不能比发一条微信消息更麻烦。

第一版只关注：

> 用户是否愿意在产生想法之后，同时记录自己的想法和来源？
