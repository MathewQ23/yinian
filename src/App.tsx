import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './design-system.css';

type TopView = 'today' | 'threads' | 'explore' | 'records';
type ThreadTab = 'overview' | 'progress' | 'chain' | 'sources';
type EntryType = '进展' | '问题' | '方案' | '决策' | '线索' | '记录';

type WorkThread = {
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

type Entry = {
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

type ExploreItem = {
  id: string;
  title: string;
  sourceType: string;
  domain: string;
  reason: string;
  status: '待探索' | '探索中' | '已验证' | '已采用' | '放弃';
  savedAt: string;
  tags: string[];
  linkedThreadIds: string[];
};

type SearchResult = {
  id: string;
  kind: '工作线' | '记录' | '待探索';
  title: string;
  subtitle: string;
  onOpen: () => void;
};

const threads: WorkThread[] = [
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

const baseEntries: Entry[] = [
  {
    id: 'e15', time: '10:33', date: '今天', threadId: 'yinian', type: '进展',
    title: '后续可以基于引用添加想法链条',
    body: '后续可以基于引用添加想法链条，每一个想法有一个生命周期，随着实践不断迭代与分叉。',
    tags: ['链条', '生命周期'], source: 'Figma', extendsId: 'e14', relatedIds: ['e18', 'e19'],
  },
  {
    id: 'e14', time: '10:17', date: '今天', threadId: 'yinian', type: '进展',
    title: '已部署到公网，且添加数据库',
    body: '已部署到公网，开启添加了数据库，支持数据持久化存储。',
    tags: ['部署', '数据库'], extendsId: 'e06', relatedIds: ['e15'],
  },
  {
    id: 'e13', time: '09:52', date: '今天', threadId: 'yinian', type: '问题',
    title: '单一链条无法表达多条工作同时推进',
    body: '发现单一链条无法表达多条工作同时推进，需要 Thread 作为一级实体。',
    tags: ['信息架构'],
  },
  {
    id: 'e12', time: '09:20', date: '今天', threadId: 'yinian', type: '线索',
    title: '研究几款视觉知识工具',
    body: '研究几款视觉知识工具，记录值得借鉴的点。',
    tags: ['Heptabase', 'Memos'], source: 'Heptabase 文章',
  },
  {
    id: 'e11', time: '22:10', date: '昨天', threadId: 'yinian', type: '方案',
    title: '准备增加 Thread 作为一级实体',
    body: '准备增加 Thread 作为一级实体，Entry 归属于 Thread。',
    tags: ['Thread'],
  },
  {
    id: 'e10', time: '21:36', date: '昨天', threadId: 'yinian', type: '决策',
    title: '保留原有 UI 资产，重组信息架构',
    body: '保留原有 UI 资产，重组信息架构以降低迁移成本。',
    tags: ['迁移', '设计'],
  },
  {
    id: 'e06', time: '14:51', date: '昨天', threadId: 'yinian', type: '记录',
    title: '一念还是要推出一个公网版',
    body: '一念还是要推出一个公网版，部署到服务器上，手机端也可以用。',
    tags: ['起点'], relatedIds: ['e14'],
  },
  {
    id: 'e18', time: '11:05', date: '今天', threadId: 'yinian', type: '进展',
    title: '链条需要支持拖拽调整顺序',
    body: '链条需要支持拖拽调整顺序。',
    tags: ['已验证'], extendsId: 'e15', relatedIds: ['e21'],
  },
  {
    id: 'e19', time: '11:22', date: '今天', threadId: 'yinian', type: '线索',
    title: '基于来源卡片自动生成关联建议',
    body: '以后可以基于来源卡片自动生成关联建议。',
    tags: ['待验证'], extendsId: 'e15',
  },
  {
    id: 'e21', time: '11:46', date: '今天', threadId: 'yinian', type: '决策',
    title: '在链条中标识当前节点和已验证节点',
    body: '需要在链条中标识当前节点和已验证节点。',
    tags: ['已验证'], extendsId: 'e18',
  },
  {
    id: 'r1', time: '09:16', date: '今天', threadId: 'roarm', type: '问题',
    title: '相机坐标无法直接映射到机械臂基座坐标',
    body: '相机坐标无法直接映射到机械臂基座坐标，需要 Eye-to-Hand 标定。',
    tags: ['标定'], source: '技术资料',
  },
  {
    id: 'p1', time: '昨天', date: '昨天', threadId: 'pdf', type: '进展',
    title: 'GPU Worker 基础功能完成',
    body: 'PDF 翻译 GPU Worker 基础功能完成，下一步处理任务状态同步。',
    tags: ['GPU Worker'],
  },
];

const exploreItems: ExploreItem[] = [
  { id: 'browser-harness', title: 'browser-harness', sourceType: 'GitHub 项目', domain: 'github.com', reason: '看到博客推荐，可能适合做浏览器自动化，先看看是否能替代当前方案。', status: '待探索', savedAt: '今天 10:33', tags: ['技术', '自动化', '测试', '工具'], linkedThreadIds: ['yinian', 'pdf'] },
  { id: 'gsap', title: 'GSAP Skills', sourceType: '网页', domain: 'gsap.com', reason: '动画库学习资源，文档和示例很全，后续项目可能用到。', status: '探索中', savedAt: '昨天 16:42', tags: ['设计', '动画'], linkedThreadIds: ['yinian'] },
  { id: 'pdf-layout', title: 'PDF Layout Parser', sourceType: 'GitHub 项目', domain: 'github.com', reason: '解析 PDF 布局结构的工具，或许能提升 PDF 翻译质量。', status: '待探索', savedAt: '昨天 11:20', tags: ['技术', 'PDF'], linkedThreadIds: ['pdf'] },
  { id: 'eye-hand', title: 'Eye-to-Hand Calibration', sourceType: '视频', domain: 'youtube.com', reason: '机械臂与相机标定方法讲解，步骤清晰，值得深入学习。', status: '探索中', savedAt: '07/06 14:10', tags: ['机械臂', '视觉'], linkedThreadIds: ['roarm', 'vision'] },
  { id: 'whiteboard', title: 'Open source whiteboard library', sourceType: '网页', domain: 'excalidraw.com', reason: '开源白板库，支持协作与自定义扩展。', status: '已验证', savedAt: '07/05 09:15', tags: ['产品', '灵感'], linkedThreadIds: ['yinian'] },
  { id: 'sync', title: 'Realtime data sync article', sourceType: '网页', domain: 'medium.com', reason: '实时数据同步方案对比，包含优缺点和适用场景分析。', status: '已验证', savedAt: '07/04 20:08', tags: ['技术'], linkedThreadIds: ['yinian'] },
];

function App() {
  const [activeView, setActiveView] = useState<TopView>('today');
  const [selectedThreadId, setSelectedThreadId] = useState('yinian');
  const [threadTab, setThreadTab] = useState<ThreadTab>('progress');
  const [selectedExploreId, setSelectedExploreId] = useState('browser-harness');
  const [selectedEntryId, setSelectedEntryId] = useState('e15');
  const [quickRecord, setQuickRecord] = useState('');
  const [quickThreadId, setQuickThreadId] = useState('yinian');
  const [quickType, setQuickType] = useState<EntryType>('记录');
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [quickSourceType, setQuickSourceType] = useState('链接');
  const [quickSourceContent, setQuickSourceContent] = useState('');
  const [savedEntries, setSavedEntries] = useState<Entry[]>(loadSavedEntries);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const quickRecordRef = useRef<HTMLTextAreaElement>(null);

  const entries = useMemo(() => [...savedEntries, ...baseEntries], [savedEntries]);
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? threads[0];
  const selectedExplore = exploreItems.find((item) => item.id === selectedExploreId) ?? exploreItems[0];
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];

  function navigate(view: TopView) {
    setActiveView(view);
    if (view === 'threads') {
      setSelectedThreadId('');
      setThreadTab('progress');
    }
  }

  function openThread(threadId: string, tab: ThreadTab = 'progress') {
    setSelectedThreadId(threadId);
    setThreadTab(tab);
    setActiveView('threads');
  }

  function saveQuickRecord() {
    const content = quickRecord.trim();
    if (!content) return;
    const newEntry: Entry = {
      id: `local-${Date.now()}`,
      time: '现在',
      date: '今天',
      threadId: quickThreadId,
      type: quickType,
      title: content,
      body: content,
      tags: [],
      source: quickSourceContent.trim() ? `${quickSourceType} · ${quickSourceContent.trim()}` : undefined,
    };
    setSavedEntries((current) => {
      const nextEntries = [newEntry, ...current];
      saveEntries(nextEntries);
      return nextEntries;
    });
    setSelectedEntryId(newEntry.id);
    setQuickRecord('');
    setQuickSourceContent('');
    setIsSourceOpen(false);
    setStatusMessage('已保存到今日记录。');
  }

  function openSelectedEntryChain(entryId: string) {
    const entry = entries.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    setSelectedEntryId(entry.id);
    setSelectedThreadId(entry.threadId);
    setThreadTab('chain');
    setActiveView('threads');
  }

  function deleteEntry(entryId: string) {
    setSavedEntries((current) => {
      const nextEntries = current.filter((entry) => entry.id !== entryId);
      saveEntries(nextEntries);
      return nextEntries;
    });
    if (selectedEntryId === entryId) {
      const fallbackEntry = entries.find((entry) => entry.id !== entryId) ?? baseEntries[0];
      setSelectedEntryId(fallbackEntry.id);
    }
  }

  function updateEntry(entryId: string, content: string) {
    const nextContent = content.trim();
    if (!nextContent) return;
    setSavedEntries((current) => {
      const nextEntries = current.map((entry) => entry.id === entryId ? { ...entry, title: nextContent, body: nextContent } : entry);
      saveEntries(nextEntries);
      return nextEntries;
    });
  }

  function openSearchResult(result: SearchResult) {
    result.onOpen();
    setSearchQuery('');
  }

  const searchResults = useMemo<SearchResult[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const includesQuery = (...values: string[]) => values.some((value) => value.toLowerCase().includes(query));

    const threadResults = threads
      .filter((thread) => includesQuery(thread.name, thread.description, thread.stage, thread.nextStep, thread.blocker, thread.status))
      .slice(0, 4)
      .map((thread): SearchResult => ({
        id: `thread-${thread.id}`,
        kind: '工作线',
        title: thread.name,
        subtitle: `${thread.stage} · 下一步：${thread.nextStep}`,
        onOpen: () => openThread(thread.id),
      }));

    const entryResults = entries
      .filter((entry) => includesQuery(entry.title, entry.body, entry.type, entry.source ?? '', ...entry.tags, threads.find((thread) => thread.id === entry.threadId)?.name ?? ''))
      .slice(0, 5)
      .map((entry): SearchResult => ({
        id: `entry-${entry.id}`,
        kind: '记录',
        title: entry.title,
        subtitle: `${threads.find((thread) => thread.id === entry.threadId)?.name ?? '未归类'} · ${entry.type} · ${entry.time}`,
        onOpen: () => {
          setSelectedEntryId(entry.id);
          setActiveView('records');
        },
      }));

    const exploreResults = exploreItems
      .filter((item) => includesQuery(item.title, item.sourceType, item.domain, item.reason, item.status, ...item.tags))
      .slice(0, 4)
      .map((item): SearchResult => ({
        id: `explore-${item.id}`,
        kind: '待探索',
        title: item.title,
        subtitle: `${item.sourceType} · ${item.domain} · ${item.status}`,
        onOpen: () => {
          setSelectedExploreId(item.id);
          setActiveView('explore');
        },
      }));

    return [...threadResults, ...entryResults, ...exploreResults].slice(0, 8);
  }, [entries, searchQuery]);

  function focusQuickRecord() {
    setActiveView('today');
    window.requestAnimationFrame(() => {
      quickRecordRef.current?.focus();
      quickRecordRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    });
  }

  return (
    <div className="product-shell">
      <GlobalHeader
        activeView={activeView}
        searchQuery={searchQuery}
        searchResults={searchResults}
        onNavigate={navigate}
        onOpenSearchResult={openSearchResult}
        onQuickRecord={focusQuickRecord}
        onSearchChange={setSearchQuery}
      />
      <main className="product-main">
        {activeView === 'today' && (
          <TodayPage
            entries={entries}
            quickRecord={quickRecord}
            quickRecordRef={quickRecordRef}
            quickThreadId={quickThreadId}
            quickType={quickType}
            isSourceOpen={isSourceOpen}
            quickSourceType={quickSourceType}
            quickSourceContent={quickSourceContent}
            statusMessage={statusMessage}
            onQuickRecordChange={setQuickRecord}
            onQuickThreadChange={setQuickThreadId}
            onQuickTypeChange={setQuickType}
            onQuickSourceTypeChange={setQuickSourceType}
            onQuickSourceContentChange={setQuickSourceContent}
            onToggleSource={() => setIsSourceOpen((isOpen) => !isOpen)}
            onSaveQuickRecord={saveQuickRecord}
            onOpenThread={openThread}
            onOpenExplore={(id) => { setSelectedExploreId(id); setActiveView('explore'); }}
            onOpenRecords={() => setActiveView('records')}
          />
        )}
        {activeView === 'threads' && threadTab === 'overview' && <ThreadProgressPage entries={entries} selectedThread={selectedThread} activeTab={threadTab} onTabChange={setThreadTab} />}
        {activeView === 'threads' && threadTab === 'progress' && (
          selectedThreadId ? <ThreadProgressPage entries={entries} selectedThread={selectedThread} activeTab={threadTab} onTabChange={setThreadTab} /> : <ThreadsPage onOpenThread={openThread} />
        )}
        {activeView === 'threads' && threadTab === 'chain' && <ThreadChainPage entries={entries} selectedEntry={selectedEntry} selectedThread={selectedThread} onDeleteEntry={deleteEntry} onSelectEntry={setSelectedEntryId} onTabChange={setThreadTab} onUpdateEntry={updateEntry} />}
        {activeView === 'threads' && threadTab === 'sources' && <ThreadProgressPage entries={entries} selectedThread={selectedThread} activeTab={threadTab} onTabChange={setThreadTab} />}
        {activeView === 'explore' && <ExplorePage selectedExplore={selectedExplore} onSelectExplore={setSelectedExploreId} />}
        {activeView === 'records' && <RecordsPage entries={entries} selectedEntry={selectedEntry} onDeleteEntry={deleteEntry} onSelectEntry={setSelectedEntryId} onOpenChain={() => openSelectedEntryChain(selectedEntry.id)} onUpdateEntry={updateEntry} />}
      </main>
    </div>
  );
}

function GlobalHeader({
  activeView,
  searchQuery,
  searchResults,
  onNavigate,
  onOpenSearchResult,
  onQuickRecord,
  onSearchChange,
}: {
  activeView: TopView;
  searchQuery: string;
  searchResults: SearchResult[];
  onNavigate: (view: TopView) => void;
  onOpenSearchResult: (result: SearchResult) => void;
  onQuickRecord: () => void;
  onSearchChange: (value: string) => void;
}) {
  const items: Array<[TopView, string, string]> = [
    ['today', '☀', '今天'],
    ['threads', '▦', '工作线'],
    ['explore', '✦', '待探索'],
    ['records', '☷', '全部记录'],
  ];
  const hasSearchQuery = searchQuery.trim().length > 0;
  return (
    <header className="global-header">
      <button className="brand-mark" onClick={() => onNavigate('today')} type="button">一念</button>
      <nav className="global-nav" aria-label="主导航">
        {items.map(([view, icon, label]) => (
          <button aria-current={activeView === view ? 'page' : undefined} aria-label={label} key={view} onClick={() => onNavigate(view)} type="button">
            <span aria-hidden="true">{icon}</span>{label}
          </button>
        ))}
      </nav>
      <div className="global-search-wrap">
        <label className="global-search">
          <span>⌕</span>
          <input value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="搜索记录、工作线、来源..." aria-label="搜索记录、工作线、来源" />
        </label>
        {hasSearchQuery && (
          <section className="search-popover" aria-label="搜索结果">
            <div className="search-popover-header">
              <strong>搜索结果</strong>
              <button onClick={() => onSearchChange('')} type="button">清空</button>
            </div>
            {searchResults.length ? (
              <div className="search-result-list">
                {searchResults.map((result) => (
                  <button className="search-result-item" key={result.id} onClick={() => onOpenSearchResult(result)} type="button">
                    <span>{result.kind}</span>
                    <strong>{result.title}</strong>
                    <small>{result.subtitle}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="search-empty">没有找到匹配内容</p>
            )}
          </section>
        )}
      </div>
      <button className="global-quick-button" onClick={onQuickRecord} type="button">+ 快速记录</button>
    </header>
  );
}

function TodayPage({
  entries,
  quickRecord,
  quickRecordRef,
  quickThreadId,
  quickType,
  isSourceOpen,
  quickSourceType,
  quickSourceContent,
  statusMessage,
  onQuickRecordChange,
  onQuickThreadChange,
  onQuickTypeChange,
  onQuickSourceTypeChange,
  onQuickSourceContentChange,
  onToggleSource,
  onSaveQuickRecord,
  onOpenThread,
  onOpenExplore,
  onOpenRecords,
}: {
  entries: Entry[];
  quickRecord: string;
  quickRecordRef: React.RefObject<HTMLTextAreaElement | null>;
  quickThreadId: string;
  quickType: EntryType;
  isSourceOpen: boolean;
  quickSourceType: string;
  quickSourceContent: string;
  statusMessage: string;
  onQuickRecordChange: (value: string) => void;
  onQuickThreadChange: (threadId: string) => void;
  onQuickTypeChange: (type: EntryType) => void;
  onQuickSourceTypeChange: (sourceType: string) => void;
  onQuickSourceContentChange: (sourceContent: string) => void;
  onToggleSource: () => void;
  onSaveQuickRecord: () => void;
  onOpenThread: (threadId: string) => void;
  onOpenExplore: (id: string) => void;
  onOpenRecords: () => void;
}) {
  const todayEntries = entries.filter((entry) => entry.date === '今天').slice(0, 6);
  return (
    <section className="page-stack today-page">
      <PageHero title="晚上好" subtitle="今天推进了 4 条工作线 · 记录 8 条 · 解决 2 个问题" />
      <div className="today-top-grid">
        <section className="panel quick-record-panel">
          <PanelTitle icon="⚡" title="快速记录" />
          <label className="sr-label" htmlFor="quick-record">刚刚发生了什么？</label>
          <textarea id="quick-record" ref={quickRecordRef} value={quickRecord} onChange={(event) => onQuickRecordChange(event.target.value)} placeholder="刚刚发生了什么？写下一条进展、问题、方案、线索..." />
          <div className="quick-tools">
            <label>
              <span>@ 工作线</span>
              <select aria-label="选择工作线" value={quickThreadId} onChange={(event) => onQuickThreadChange(event.target.value)}>
                {threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.name}</option>)}
              </select>
            </label>
            <button onClick={onToggleSource} type="button">+ 来源</button>
            <label>
              <span>/ 类型</span>
              <select aria-label="选择类型" value={quickType} onChange={(event) => onQuickTypeChange(event.target.value as EntryType)}>
                {(['进展', '问题', '方案', '决策', '线索', '记录'] as EntryType[]).map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          </div>
          {isSourceOpen && (
            <div className="quick-source-row">
              <label>
                <span>来源类型</span>
                <select aria-label="选择来源类型" value={quickSourceType} onChange={(event) => onQuickSourceTypeChange(event.target.value)}>
                  <option value="链接">链接</option>
                  <option value="文字">文字</option>
                </select>
              </label>
              <label>
                <span>来源内容</span>
                <input aria-label="来源内容" value={quickSourceContent} onChange={(event) => onQuickSourceContentChange(event.target.value)} placeholder="粘贴链接或来源文字..." />
              </label>
            </div>
          )}
          <div className="quick-footer"><span>记录时间 2026 / 07 / 08 21:18</span><button onClick={onSaveQuickRecord} type="button">保存 Ctrl+Enter</button></div>
          {statusMessage && <p className="toast-message">{statusMessage}</p>}
        </section>
        <TodayOverview />
      </div>
      <section className="panel">
        <PanelTitle icon="➤" title="继续推进" />
        <div className="continue-grid">
          {threads.slice(0, 3).map((thread) => <CompactThreadCard key={thread.id} thread={thread} onOpen={() => onOpenThread(thread.id)} />)}
        </div>
      </section>
      <div className="today-bottom-grid">
        <section className="panel">
          <PanelTitle icon="☷" title="今日记录" />
          <EntryTimeline entries={todayEntries} ariaLabel="今日记录列表" />
          <button className="text-link" onClick={onOpenRecords} type="button">查看全部记录 →</button>
        </section>
        <section className="panel">
          <PanelTitle icon="✦" title="待探索" />
          <div className="explore-mini-grid">
            {exploreItems.slice(0, 4).map((item) => <button className="explore-mini-card" key={item.id} onClick={() => onOpenExplore(item.id)} type="button"><strong>{item.title}</strong><span>{item.sourceType}</span><em>{item.status}</em></button>)}
          </div>
          <button className="text-link" onClick={() => onOpenExplore('browser-harness')} type="button">查看全部待探索 →</button>
        </section>
      </div>
    </section>
  );
}

function TodayOverview() {
  return (
    <section className="panel overview-panel">
      <PanelTitle icon="◫" title="今日概览" />
      <div className="metric-grid">
        {[['工作线', '4'], ['问题', '2'], ['待探索', '5'], ['已解决', '2']].map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <h3>最近 7 天记录趋势</h3>
      <div className="bars" aria-label="最近 7 天记录趋势">{[30, 46, 35, 62, 48, 72, 88].map((height, index) => <i key={index} style={{ height }} />)}</div>
    </section>
  );
}

function ThreadsPage({ onOpenThread }: { onOpenThread: (threadId: string) => void }) {
  return (
    <section className="page-stack">
      <PageHero title="工作线" subtitle="查看所有正在推进、暂停和已完成的工作线，清楚知道每件事现在做到哪里。" />
      <div className="page-action-row"><Segmented items={['进行中 6', '暂停 2', '已完成 12']} /><button className="secondary-button" type="button">+ 新建工作线</button></div>
      <div className="threads-layout">
        <div className="threads-grid">{threads.map((thread) => <ThreadCard key={thread.id} thread={thread} onOpen={() => onOpenThread(thread.id)} />)}</div>
        <WeeklySummary />
      </div>
    </section>
  );
}

function CompactThreadCard({ thread, onOpen }: { thread: WorkThread; onOpen: () => void }) {
  return <article className="compact-thread-card"><div><span className="thread-icon">{thread.icon}</span><strong>{thread.name}</strong><Badge>{thread.status}</Badge></div><p>当前：{thread.stage}</p><p>下一步：{thread.nextStep}</p><button onClick={onOpen} type="button">查看工作线 →</button></article>;
}

function ThreadCard({ thread, onOpen }: { thread: WorkThread; onOpen: () => void }) {
  return (
    <article className="panel thread-card">
      <div className="thread-card-head"><span className="thread-icon">{thread.icon}</span><div><h2>{thread.name}</h2><p>{thread.description}</p></div><Badge>{thread.status}</Badge></div>
      <div className="thread-columns">
        <div><h3>当前阶段</h3><div className="stage-tags">{thread.stages.map((stage) => <span className={`stage-tag ${stage.state}`} key={stage.label}>{stage.state === 'done' ? '✓' : stage.state === 'current' ? '●' : '○'} {stage.label}</span>)}</div></div>
        <div><h3>当前阻塞</h3><p>{thread.blocker}</p></div>
        <div><h3>下一步</h3><p>{thread.nextStep}</p></div>
      </div>
      <footer><span>最近更新 <b>{thread.updatedAt}</b></span><span>记录数 <b>{thread.recordCount}</b></span><span>问题数 <b>{thread.issueCount}</b></span><span>来源数 <b>{thread.sourceCount}</b></span><button aria-label={`查看${thread.name}详情`} onClick={onOpen} type="button">查看详情 →</button></footer>
    </article>
  );
}

function WeeklySummary() {
  return <aside className="panel weekly-summary"><PanelTitle icon="▥" title="本周概况" />{[['活跃工作线', '6'], ['本周更新', '28'], ['未解决问题', '3'], ['待推进下一步', '5']].map(([label, value]) => <div className="summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}<button className="text-link" type="button">查看全部工作线 →</button></aside>;
}

function ThreadProgressPage({ selectedThread, entries, activeTab, onTabChange }: { selectedThread: WorkThread; entries: Entry[]; activeTab: ThreadTab; onTabChange: (tab: ThreadTab) => void }) {
  const threadEntries = entries.filter((entry) => entry.threadId === selectedThread.id).slice(0, 8);
  return (
    <section className="page-stack">
      <ThreadHeader selectedThread={selectedThread} activeTab={activeTab} onTabChange={onTabChange} />
      <div className="summary-cards"><InfoCard title="当前阶段" value={selectedThread.stage} /><InfoCard title="下一步" value={selectedThread.nextStep} /><InfoCard title="最近更新" value={selectedThread.updatedAt} /></div>
      <div className="detail-layout">
        <section className="panel"><PanelTitle icon="〽" title="进展流" /><EntryTimeline entries={threadEntries} ariaLabel="进展流记录" /></section>
        <aside className="side-stack"><StatusPanel thread={selectedThread} /><NextStepsPanel /><SourcePanel /><DecisionPanel /><div className="side-actions"><button className="primary-button" type="button">+ 继续记录</button><button className="secondary-button" onClick={() => onTabChange('chain')} type="button">查看链条</button></div></aside>
      </div>
    </section>
  );
}

function ThreadHeader({ selectedThread, activeTab, onTabChange }: { selectedThread: WorkThread; activeTab: ThreadTab; onTabChange: (tab: ThreadTab) => void }) {
  return <section className="thread-header"><span>工作线 / {selectedThread.name}</span><div><h1>{selectedThread.name}</h1><Badge>{selectedThread.status}</Badge></div><p>记录工作和思考如何持续推进，并让结构从记录中自然生长出来。</p><nav className="sub-tabs" aria-label="工作线视图">{([['overview', '概览'], ['progress', '进展'], ['chain', '链条'], ['sources', '资料']] as Array<[ThreadTab, string]>).map(([tab, label]) => <button aria-current={activeTab === tab ? 'page' : undefined} key={tab} onClick={() => onTabChange(tab)} type="button">{label}</button>)}</nav></section>;
}

function ExplorePage({ selectedExplore, onSelectExplore }: { selectedExplore: ExploreItem; onSelectExplore: (id: string) => void }) {
  return (
    <section className="page-stack">
      <PageHero title="待探索" subtitle="先记下来，等有时间再继续研究。把值得进一步看的内容和后续结论放在一起。" />
      <div className="page-action-row"><Segmented items={['待探索 12', '探索中 4', '已验证 8', '已采用 6', '放弃 3']} /></div>
      <div className="three-column-layout explore-layout"><FilterPanel /><section className="panel"><PanelTitle icon="✦" title="待探索内容" /><div className="explore-grid">{exploreItems.map((item) => <button className={item.id === selectedExplore.id ? 'explore-card selected' : 'explore-card'} key={item.id} onClick={() => onSelectExplore(item.id)} type="button"><strong>{item.title}</strong><span>{item.sourceType} · {item.domain}</span><p>{item.reason}</p><footer>{item.savedAt}<Badge>{item.status}</Badge></footer></button>)}</div></section><ExploreDetail item={selectedExplore} /></div>
    </section>
  );
}

function ExploreDetail({ item }: { item: ExploreItem }) {
  return <aside className="panel detail-panel"><PanelTitle icon="◫" title="探索详情" /><h2>{item.title}</h2><p>{item.sourceType} · {item.domain}</p><DetailRow label="保存时间" value={item.savedAt} /><DetailRow label="保存原因" value={item.reason} /><div className="tag-row">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><section className="preview-card"><strong>预览</strong><p>{item.title} 是一个值得继续研究的资源，适合放入后续探索流程。</p><span>3.2k stars · TypeScript · MIT</span></section><section><h3>探索记录</h3><EntryTimeline entries={[{ id: 'x1', time: '今天', date: '今天', threadId: 'yinian', type: '进展', title: '跑通示例项目', body: '本地搭建成功，示例脚本可以正常运行。', tags: [] }, { id: 'x2', time: '昨天', date: '昨天', threadId: 'yinian', type: '问题', title: 'API 与现有系统不兼容', body: '关键接口差异较大，需改造成成本较高。', tags: [] }]} ariaLabel="探索记录" /></section><h3>关联工作线</h3><div className="tag-row">{item.linkedThreadIds.map((id) => <span key={id}>{threads.find((thread) => thread.id === id)?.name}</span>)}</div><div className="side-actions"><button className="primary-button" type="button">开始探索</button><button className="secondary-button" type="button">加入工作线</button></div></aside>;
}

function RecordsPage({ entries, selectedEntry, onDeleteEntry, onSelectEntry, onOpenChain, onUpdateEntry }: { entries: Entry[]; selectedEntry: Entry; onDeleteEntry: (entryId: string) => void; onSelectEntry: (id: string) => void; onOpenChain: () => void; onUpdateEntry: (entryId: string, content: string) => void }) {
  return <section className="page-stack"><PageHero title="全部记录" subtitle="按时间查看所有记录，并通过工作线、类型、来源和状态快速筛选。" /><div className="three-column-layout records-layout"><FilterPanel /><section className="panel"><div className="list-toolbar"><strong>共 128 条记录</strong><Segmented items={['最新', '最早', '最相关']} /></div><EntryList entries={entries} selectedEntryId={selectedEntry.id} onSelectEntry={onSelectEntry} /></section><RecordDetail entry={selectedEntry} onDeleteEntry={onDeleteEntry} onOpenChain={onOpenChain} onUpdateEntry={onUpdateEntry} /></div></section>;
}

function ThreadChainPage({ selectedThread, entries, selectedEntry, onDeleteEntry, onSelectEntry, onTabChange, onUpdateEntry }: { selectedThread: WorkThread; entries: Entry[]; selectedEntry: Entry; onDeleteEntry: (entryId: string) => void; onSelectEntry: (id: string) => void; onTabChange: (tab: ThreadTab) => void; onUpdateEntry: (entryId: string, content: string) => void }) {
  const threadEntries = entries.filter((entry) => entry.threadId === selectedThread.id);
  const rootEntry = findChainRoot(selectedEntry, threadEntries) ?? threadEntries[0] ?? selectedEntry;
  return <section className="page-stack"><ThreadHeader selectedThread={selectedThread} activeTab="chain" onTabChange={onTabChange} /><div className="chain-layout"><aside className="panel"><PanelTitle icon="☷" title="链条列表" /><EntryList entries={threadEntries} selectedEntryId={selectedEntry.id} onSelectEntry={onSelectEntry} compact /></aside><section className="panel chain-canvas-panel"><div className="chain-canvas-title"><h2>链条画布</h2><div><button type="button">居中</button><button type="button">−</button><span>100%</span><button type="button">＋</button></div></div><div className="chain-canvas"><ChainNode entry={rootEntry} entries={threadEntries} selectedEntryId={selectedEntry.id} onSelectEntry={onSelectEntry} /></div><div className="chain-legend"><span>● 起点</span><span>— 延伸</span><span>┄ 关联想法</span><span>✓ 已验证</span><span>○ 当前节点</span></div></section><RecordDetail entry={selectedEntry} onDeleteEntry={onDeleteEntry} onOpenChain={() => undefined} onUpdateEntry={onUpdateEntry} chainMode /></div></section>;
}

function ChainNode({ entry, entries, selectedEntryId, onSelectEntry }: { entry: Entry; entries: Entry[]; selectedEntryId: string; onSelectEntry: (id: string) => void }) {
  const children = entries.filter((candidate) => candidate.extendsId === entry.id);
  return <div className="chain-node-wrap"><button className={entry.id === selectedEntryId ? 'chain-node selected' : 'chain-node'} onClick={() => onSelectEntry(entry.id)} type="button"><span>#{entry.id.replace(/\D/g, '') || entry.id.slice(-2)} {entry.time}</span><strong>{entry.title}</strong><em>{entry.extendsId ? `延伸自 #${entry.extendsId.replace(/\D/g, '')}` : '起点'}</em>{entry.id === selectedEntryId && <Badge>当前节点</Badge>}</button>{children.length > 0 && <div className="chain-children">{children.map((child) => <ChainNode key={child.id} entry={child} entries={entries} selectedEntryId={selectedEntryId} onSelectEntry={onSelectEntry} />)}</div>}</div>;
}

function findChainRoot(entry: Entry, entries: Entry[]): Entry | undefined {
  const entryMap = new Map(entries.map((candidate) => [candidate.id, candidate]));
  let current = entryMap.get(entry.id) ?? entry;
  const seen = new Set<string>();
  while (current.extendsId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = entryMap.get(current.extendsId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

function RecordDetail({ entry, onDeleteEntry, onOpenChain, onUpdateEntry, chainMode = false }: { entry: Entry; onDeleteEntry: (entryId: string) => void; onOpenChain: () => void; onUpdateEntry: (entryId: string, content: string) => void; chainMode?: boolean }) {
  const thread = threads.find((item) => item.id === entry.threadId) ?? threads[0];
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(entry.body);

  useEffect(() => {
    setIsEditing(false);
    setDraftContent(entry.body);
  }, [entry.id, entry.body]);

  function saveEdit() {
    const content = draftContent.trim();
    if (!content) return;
    onUpdateEntry(entry.id, content);
    setIsEditing(false);
  }

  return <aside className="panel detail-panel"><PanelTitle icon="☰" title="记录详情" /><span className="muted">2026/07/08 {entry.time} · {thread.name} · {entry.type}</span>{isEditing ? <section className="record-edit-form"><label htmlFor={`edit-entry-${entry.id}`}>编辑记录内容</label><textarea id={`edit-entry-${entry.id}`} value={draftContent} onChange={(event) => setDraftContent(event.target.value)} /><div className="side-actions"><button className="primary-button" onClick={saveEdit} type="button">保存编辑</button><button className="secondary-button" onClick={() => { setDraftContent(entry.body); setIsEditing(false); }} type="button">取消</button></div></section> : <><h2>{entry.title}</h2><p>{entry.body}</p></>}<div className="tag-row">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}<span>+</span></div>{entry.source && <section className="preview-card"><strong>来源：{entry.source}</strong><p>{entry.source.includes(' · ') ? '来自快速记录保存的来源信息。' : 'Desktop Layout v2.fig · 修改于 2 小时前'}</p></section>}<section><h3>关系概览</h3><div className="relation-grid"><div><strong>来源</strong><p>{entry.extendsId ?? entry.source ?? '无'}</p></div><div><strong>延伸</strong><p>{entry.relatedIds?.length ?? 0} 条</p></div><div><strong>相关记录</strong><p>3 条</p></div></div></section><section><h3>快速操作</h3><div className="quick-action-grid"><button onClick={() => setIsEditing(true)} type="button">编辑</button><button type="button">复制</button><button type="button">加入线索</button><button type="button">移动到工作线</button><button className="danger" onClick={() => onDeleteEntry(entry.id)} type="button">删除</button></div></section><div className="side-actions"><button className="primary-button" onClick={onOpenChain} type="button">{chainMode ? '引用这个记录' : '查看链条'}</button><button className="secondary-button" type="button">{chainMode ? '加入链条' : '继续引用'}</button></div></aside>;
}

function EntryTimeline({ entries, ariaLabel }: { entries: Entry[]; ariaLabel: string }) {
  return <div className="entry-timeline" aria-label={ariaLabel}>{entries.map((entry) => <article className="timeline-entry" key={entry.id}><time>{entry.time}</time><Badge>{entry.type}</Badge><strong>{entry.title}</strong>{entry.body !== entry.title && <p>{entry.body}</p>}{entry.source && <span className="source-pill">来源：{entry.source}</span>}</article>)}</div>;
}

function EntryList({ entries, selectedEntryId, onSelectEntry, compact = false }: { entries: Entry[]; selectedEntryId: string; onSelectEntry: (id: string) => void; compact?: boolean }) {
  return <div className={compact ? 'entry-list compact' : 'entry-list'}>{['今天', '昨天'].map((date) => <section key={date}><h3>{date}</h3>{entries.filter((entry) => entry.date === date).map((entry) => <button className={entry.id === selectedEntryId ? 'entry-row selected' : 'entry-row'} key={entry.id} onClick={() => onSelectEntry(entry.id)} type="button"><time>{entry.time}</time><span>{threads.find((thread) => thread.id === entry.threadId)?.name} · {entry.type}</span><strong>{entry.title}</strong>{!compact && <p>{entry.tags.map((tag) => `#${tag}`).join(' ')}</p>}<b>›</b></button>)}</section>)}</div>;
}

function FilterPanel() {
  const groups = [
    ['时间', ['今天 18', '本周 64', '本月 128']],
    ['工作线', ['一念产品 52', 'RoArm-M3 28', 'PDF 翻译 20', '待探索 28']],
    ['类型', ['进展 48', '问题 32', '方案 16', '决策 12', '线索 10', '普通记录 10']],
    ['来源', ['有来源 76', '链接 32', '图片 12', '视频 4', 'GitHub 4']],
    ['状态', ['未解决问题 42', '待验证方案 34', '关键决策 18']],
  ];
  return <aside className="panel filter-panel"><div className="filter-title"><strong>筛选</strong><button type="button">清空</button></div>{groups.map(([title, items]) => <section key={title as string}><h3>{title}</h3>{(items as string[]).map((item) => <button className={item.startsWith('今天') ? 'active' : ''} key={item} type="button">{item}</button>)}</section>)}</aside>;
}

const SAVED_ENTRIES_KEY = 'yinian.product.savedEntries';

function loadSavedEntries(): Entry[] {
  try {
    const raw = window.localStorage.getItem(SAVED_ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: Entry[]) {
  window.localStorage.setItem(SAVED_ENTRIES_KEY, JSON.stringify(entries));
}

function PageHero({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="page-hero"><h1>{title}</h1><p>{subtitle}</p></header>;
}

function PanelTitle({ icon, title }: { icon: string; title: string }) {
  return <div className="panel-title"><span>{icon}</span><h2>{title}</h2></div>;
}

function Segmented({ items }: { items: string[] }) {
  return <div className="segmented">{items.map((item, index) => <button className={index === 0 ? 'active' : ''} key={item} type="button">{item}</button>)}</div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  const text = String(children);
  const tone = text.includes('问题') || text.includes('阻塞') || text.includes('待') || text.includes('暂停') ? 'warning' : text.includes('线索') || text.includes('探索中') ? 'info' : text.includes('方案') ? 'plan' : text.includes('记录') ? 'neutral' : 'success';
  return <span className={`badge ${tone}`}>{children}</span>;
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return <article className="panel info-card"><span>{title}</span><strong>{value}</strong></article>;
}
function StatusPanel({ thread }: { thread: WorkThread }) { return <section className="panel"><PanelTitle icon="●" title="当前状态" /><p>{thread.status}</p><p>当前阶段：{thread.stage}</p><p>阻塞项：1</p><p>待探索：3</p><p>已解决问题：4</p></section>; }
function NextStepsPanel() { return <section className="panel"><PanelTitle icon="○" title="下一步" /><ul><li>完成首页信息架构</li><li>梳理核心概念与关系</li><li>输出工作线使用指南（v0.1）</li></ul></section>; }
function SourcePanel() { return <section className="panel"><PanelTitle icon="↗" title="相关来源" /><p>Heptabase · 文章</p><p>Memos · 笔记</p></section>; }
function DecisionPanel() { return <section className="panel"><PanelTitle icon="◆" title="关键决定" /><ul><li>保留原有 UI 资产，重组信息架构以降低迁移成本。</li><li>增加 Thread 作为一级实体，支持多条线索并行推进。</li></ul></section>; }
function DetailRow({ label, value }: { label: string; value: string }) { return <p className="detail-row"><strong>{label}</strong><span>{value}</span></p>; }

export default App;
