export type TopView = 'today' | 'threads' | 'explore' | 'records';
export type ThreadTab = 'overview' | 'progress' | 'chain' | 'sources';
export type EntryType = '进展' | '问题' | '方案' | '决策' | '线索' | '记录';

export type WorkThread = {
  id: string;
  name: string;
  description: string;
  status: '进行中' | '暂停' | '已完成';
  stage: string;
  blocker: string;
  nextStep: string;
  updatedAt: string;
  recordCount: number;
  issueCount: number;
  sourceCount: number;
  icon: string;
  stages: Array<{ label: string; state: 'done' | 'current' | 'todo' }>;
};

export type Entry = {
  id: string;
  time: string;
  date: '今天' | '昨天';
  threadId: string;
  type: EntryType;
  title: string;
  body: string;
  tags: string[];
  source?: string;
  extendsId?: string;
  relatedIds?: string[];
};

export type ExploreNote = {
  id: string;
  time: string;
  content: string;
};

export type ExploreItem = {
  id: string;
  title: string;
  sourceType: string;
  domain: string;
  reason: string;
  status: '待探索' | '探索中' | '已验证' | '已采用' | '放弃';
  savedAt: string;
  tags: string[];
  linkedThreadIds: string[];
  explorationNotes?: ExploreNote[];
};

export const defaultThreads: WorkThread[] = [
  {
    id: 'yinian',
    name: '一念产品',
    description: '打造一款帮助思考与记录、连接来源与行动的个人生产力工具',
    status: '进行中',
    stage: '重新定义产品模型',
    blocker: '部分产品流程细节尚未最终确定',
    nextStep: '完成产品信息架构并设计关键页面',
    updatedAt: '今天 10:33',
    recordCount: 48,
    issueCount: 3,
    sourceCount: 27,
    icon: '念',
    stages: [
      { label: '来源保存', state: 'done' },
      { label: '引用关系', state: 'done' },
      { label: '工作线设计', state: 'current' },
      { label: '待探索', state: 'todo' },
    ],
  },
  {
    id: 'roarm',
    name: 'RoArm-M3',
    description: '开发新一代桌面级机械臂，提高精度和易用性',
    status: '进行中',
    stage: '视觉坐标转换',
    blocker: '相机坐标 → 机械臂基座坐标',
    nextStep: '完成相机标定算法初版实现',
    updatedAt: '今天 09:16',
    recordCount: 28,
    issueCount: 5,
    sourceCount: 14,
    icon: '臂',
    stages: [
      { label: '原型开发', state: 'current' },
      { label: '测试验证', state: 'todo' },
      { label: '标定方案', state: 'done' },
    ],
  },
  {
    id: 'pdf',
    name: 'PDF 翻译',
    description: '构建高质量 PDF 翻译流程，提升版式保留与术语一致性',
    status: '进行中',
    stage: 'GPU Worker 基础功能完成',
    blocker: '表格理解效果不稳定',
    nextStep: '优化表格与公式的翻译策略',
    updatedAt: '昨天',
    recordCount: 20,
    issueCount: 2,
    sourceCount: 18,
    icon: 'PDF',
    stages: [
      { label: '模型评估', state: 'current' },
      { label: '质量优化', state: 'todo' },
    ],
  },
  {
    id: 'browser',
    name: 'browser-harness 调研',
    description: '评估浏览器自动化工具是否适合替代当前方案',
    status: '暂停',
    stage: '方案评估',
    blocker: '关键能力文档仍在更新中',
    nextStep: '完成对比评估报告并确定试点范围',
    updatedAt: '07/07',
    recordCount: 12,
    issueCount: 1,
    sourceCount: 9,
    icon: 'Web',
    stages: [
      { label: '资料收集', state: 'done' },
      { label: '方案评估', state: 'current' },
      { label: '小范围试点', state: 'todo' },
    ],
  },
  {
    id: 'time',
    name: '时间记录小工具',
    description: '记录每日真实投入时间，帮助复盘注意力分布',
    status: '暂停',
    stage: '明确 MVP 范围',
    blocker: '优先级调整，等待排期',
    nextStep: '明确 MVP 范围并重新排期',
    updatedAt: '07/05',
    recordCount: 8,
    issueCount: 1,
    sourceCount: 3,
    icon: '时',
    stages: [{ label: 'MVP 范围', state: 'current' }],
  },
  {
    id: 'vision',
    name: '视觉标定研究',
    description: '研究固定相机与机械臂坐标映射方法',
    status: '进行中',
    stage: '实验数据采集',
    blocker: '实验设备占用，暂无进行采集',
    nextStep: '预约实验设备，补充数据采集',
    updatedAt: '07/04',
    recordCount: 14,
    issueCount: 4,
    sourceCount: 11,
    icon: '视',
    stages: [{ label: '实验优化', state: 'current' }],
  },
];

export const defaultEntries: Entry[] = [
  { id: 'e15', time: '10:33', date: '今天', threadId: 'yinian', type: '进展', title: '后续可以基于引用添加想法链条', body: '后续可以基于引用添加想法链条，每一个想法有一个生命周期，随着实践不断迭代与分叉。', tags: ['链条', '生命周期'], source: 'Figma', extendsId: 'e14', relatedIds: ['e18', 'e19'] },
  { id: 'e14', time: '10:17', date: '今天', threadId: 'yinian', type: '进展', title: '已部署到公网，且添加数据库', body: '已部署到公网，开启添加了数据库，支持数据持久化存储。', tags: ['部署', '数据库'], extendsId: 'e06', relatedIds: ['e15'] },
  { id: 'e13', time: '09:52', date: '今天', threadId: 'yinian', type: '问题', title: '单一链条无法表达多条工作同时推进', body: '发现单一链条无法表达多条工作同时推进，需要 Thread 作为一级实体。', tags: ['信息架构'] },
  { id: 'e12', time: '09:20', date: '今天', threadId: 'yinian', type: '线索', title: '研究几款视觉知识工具', body: '研究几款视觉知识工具，记录值得借鉴的点。', tags: ['Heptabase', 'Memos'], source: 'Heptabase 文章' },
  { id: 'e11', time: '22:10', date: '昨天', threadId: 'yinian', type: '方案', title: '准备增加 Thread 作为一级实体', body: '准备增加 Thread 作为一级实体，Entry 归属于 Thread。', tags: ['Thread'] },
  { id: 'e10', time: '21:36', date: '昨天', threadId: 'yinian', type: '决策', title: '保留原有 UI 资产，重组信息架构', body: '保留原有 UI 资产，重组信息架构以降低迁移成本。', tags: ['迁移', '设计'] },
  { id: 'e06', time: '14:51', date: '昨天', threadId: 'yinian', type: '记录', title: '一念还是要推出一个公网版', body: '一念还是要推出一个公网版，部署到服务器上，手机端也可以用。', tags: ['起点'], relatedIds: ['e14'] },
  { id: 'e18', time: '11:05', date: '今天', threadId: 'yinian', type: '进展', title: '链条需要支持拖拽调整顺序', body: '链条需要支持拖拽调整顺序。', tags: ['已验证'], extendsId: 'e15', relatedIds: ['e21'] },
  { id: 'e19', time: '11:22', date: '今天', threadId: 'yinian', type: '线索', title: '基于来源卡片自动生成关联建议', body: '以后可以基于来源卡片自动生成关联建议。', tags: ['待验证'], extendsId: 'e15' },
  { id: 'e21', time: '11:46', date: '今天', threadId: 'yinian', type: '决策', title: '在链条中标识当前节点和已验证节点', body: '需要在链条中标识当前节点和已验证节点。', tags: ['已验证'], extendsId: 'e18' },
  { id: 'r1', time: '09:16', date: '今天', threadId: 'roarm', type: '问题', title: '相机坐标无法直接映射到机械臂基座坐标', body: '相机坐标无法直接映射到机械臂基座坐标，需要 Eye-to-Hand 标定。', tags: ['标定'], source: '技术资料' },
  { id: 'p1', time: '昨天', date: '昨天', threadId: 'pdf', type: '进展', title: 'GPU Worker 基础功能完成', body: 'PDF 翻译 GPU Worker 基础功能完成，下一步处理任务状态同步。', tags: ['GPU Worker'] },
];

export const defaultExploreItems: ExploreItem[] = [
  { id: 'browser-harness', title: 'browser-harness', sourceType: 'GitHub 项目', domain: 'github.com', reason: '看到博客推荐，可能适合做浏览器自动化，先看看是否能替代当前方案。', status: '待探索', savedAt: '今天 10:33', tags: ['技术', '自动化', '测试', '工具'], linkedThreadIds: ['yinian', 'pdf'] },
  { id: 'gsap', title: 'GSAP Skills', sourceType: '网页', domain: 'gsap.com', reason: '动画库学习资源，文档和示例很全，后续项目可能用到。', status: '探索中', savedAt: '昨天 16:42', tags: ['设计', '动画'], linkedThreadIds: ['yinian'] },
  { id: 'pdf-layout', title: 'PDF Layout Parser', sourceType: 'GitHub 项目', domain: 'github.com', reason: '解析 PDF 布局结构的工具，或许能提升 PDF 翻译质量。', status: '待探索', savedAt: '昨天 11:20', tags: ['技术', 'PDF'], linkedThreadIds: ['pdf'] },
  { id: 'eye-hand', title: 'Eye-to-Hand Calibration', sourceType: '视频', domain: 'youtube.com', reason: '机械臂与相机标定方法讲解，步骤清晰，值得深入学习。', status: '探索中', savedAt: '07/06 14:10', tags: ['机械臂', '视觉'], linkedThreadIds: ['roarm', 'vision'] },
  { id: 'whiteboard', title: 'Open source whiteboard library', sourceType: '网页', domain: 'excalidraw.com', reason: '开源白板库，支持协作与自定义扩展。', status: '已验证', savedAt: '07/05 09:15', tags: ['产品', '灵感'], linkedThreadIds: ['yinian'] },
  { id: 'sync', title: 'Realtime data sync article', sourceType: '网页', domain: 'medium.com', reason: '实时数据同步方案对比，包含优缺点和适用场景分析。', status: '已验证', savedAt: '07/04 20:08', tags: ['技术'], linkedThreadIds: ['yinian'] },
];
