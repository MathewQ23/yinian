import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultThreads, type Entry, type EntryType, type ExploreItem, type ThreadTab, type TopView, type WorkThread } from './productData';
import { loadProductEntries, loadProductExploreItems, loadProductThreads, saveProductEntries, saveProductExploreItems, saveProductThreads } from './productStorage';
import './App.css';
import './design-system.css';

type SearchResult = {
  id: string;
  kind: '工作线' | '记录' | '待探索';
  title: string;
  subtitle: string;
  onOpen: () => void;
};

const threads = defaultThreads;

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
  const [productThreads, setProductThreads] = useState<WorkThread[]>(loadProductThreads);
  const [entries, setEntries] = useState<Entry[]>(loadProductEntries);
  const [productExploreItems, setProductExploreItems] = useState<ExploreItem[]>(loadProductExploreItems);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const quickRecordRef = useRef<HTMLTextAreaElement>(null);

  const selectedThread = productThreads.find((thread) => thread.id === selectedThreadId) ?? productThreads[0];
  const selectedExplore = productExploreItems.find((item) => item.id === selectedExploreId) ?? productExploreItems[0];
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
    setEntries((current) => {
      const nextEntries = [newEntry, ...current];
      saveProductEntries(nextEntries);
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
    setEntries((current) => {
      const nextEntries = current.filter((entry) => entry.id !== entryId);
      saveProductEntries(nextEntries);
      return nextEntries;
    });
    if (selectedEntryId === entryId) {
      const fallbackEntry = entries.find((entry) => entry.id !== entryId) ?? entries[0];
      setSelectedEntryId(fallbackEntry.id);
    }
  }

  function updateEntry(entryId: string, content: string) {
    const nextContent = content.trim();
    if (!nextContent) return;
    setEntries((current) => {
      const nextEntries = current.map((entry) => entry.id === entryId ? { ...entry, title: nextContent, body: nextContent } : entry);
      saveProductEntries(nextEntries);
      return nextEntries;
    });
  }

  function addThreadEntry(threadId: string, type: EntryType, content: string, extendsId?: string) {
    const nextContent = content.trim();
    if (!nextContent) return;
    const newEntry: Entry = {
      id: `local-${Date.now()}`,
      time: '现在',
      date: '今天',
      threadId,
      type,
      title: nextContent,
      body: nextContent,
      tags: [],
      extendsId,
    };
    setEntries((current) => {
      const nextEntries = [newEntry, ...current];
      saveProductEntries(nextEntries);
      return nextEntries;
    });
    setSelectedEntryId(newEntry.id);
  }

  function updateExploreStatus(exploreId: string, status: ExploreItem['status']) {
    setProductExploreItems((current) => {
      const nextItems = current.map((item) => item.id === exploreId ? { ...item, status } : item);
      saveProductExploreItems(nextItems);
      return nextItems;
    });
  }

  function addExploreNote(exploreId: string, content: string) {
    const nextContent = content.trim();
    if (!nextContent) return;
    setProductExploreItems((current) => {
      const nextItems = current.map((item) => item.id === exploreId ? {
        ...item,
        explorationNotes: [{ id: `note-${Date.now()}`, time: '现在', content: nextContent }, ...(item.explorationNotes ?? [])],
      } : item);
      saveProductExploreItems(nextItems);
      return nextItems;
    });
  }

  function addExploreToThread(exploreId: string, threadId: string) {
    setProductExploreItems((current) => {
      const nextItems = current.map((item) => {
        if (item.id !== exploreId || item.linkedThreadIds.includes(threadId)) return item;
        return { ...item, linkedThreadIds: [...item.linkedThreadIds, threadId] };
      });
      saveProductExploreItems(nextItems);
      return nextItems;
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

    const threadResults = productThreads
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
      .filter((entry) => includesQuery(entry.title, entry.body, entry.type, entry.source ?? '', ...entry.tags, productThreads.find((thread) => thread.id === entry.threadId)?.name ?? ''))
      .slice(0, 5)
      .map((entry): SearchResult => ({
        id: `entry-${entry.id}`,
        kind: '记录',
        title: entry.title,
        subtitle: `${productThreads.find((thread) => thread.id === entry.threadId)?.name ?? '未归类'} · ${entry.type} · ${entry.time}`,
        onOpen: () => {
          setSelectedEntryId(entry.id);
          setActiveView('records');
        },
      }));

    const exploreResults = productExploreItems
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
  }, [entries, productExploreItems, productThreads, searchQuery]);

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
            exploreItems={productExploreItems}
            threads={productThreads}
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
            onQuickRecordKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                saveQuickRecord();
              }
            }}
            onToggleSource={() => setIsSourceOpen((isOpen) => !isOpen)}
            onSaveQuickRecord={saveQuickRecord}
            onOpenThread={openThread}
            onOpenExplore={(id) => { setSelectedExploreId(id); setActiveView('explore'); }}
            onOpenRecords={() => setActiveView('records')}
          />
        )}
        {activeView === 'threads' && threadTab === 'overview' && <ThreadProgressPage entries={entries} selectedEntry={selectedEntry} selectedThread={selectedThread} activeTab={threadTab} onAddEntry={addThreadEntry} onTabChange={setThreadTab} />}
        {activeView === 'threads' && threadTab === 'progress' && (
          selectedThreadId ? <ThreadProgressPage entries={entries} selectedEntry={selectedEntry} selectedThread={selectedThread} activeTab={threadTab} onAddEntry={addThreadEntry} onTabChange={setThreadTab} /> : <ThreadsPage threads={productThreads} onThreadsChange={(nextThreads) => { setProductThreads(nextThreads); saveProductThreads(nextThreads); }} onOpenThread={openThread} />
        )}
        {activeView === 'threads' && threadTab === 'chain' && <ThreadChainPage entries={entries} selectedEntry={selectedEntry} selectedThread={selectedThread} onDeleteEntry={deleteEntry} onSelectEntry={setSelectedEntryId} onTabChange={setThreadTab} onUpdateEntry={updateEntry} />}
        {activeView === 'threads' && threadTab === 'sources' && <ThreadProgressPage entries={entries} selectedEntry={selectedEntry} selectedThread={selectedThread} activeTab={threadTab} onAddEntry={addThreadEntry} onTabChange={setThreadTab} />}
        {activeView === 'explore' && <ExplorePage exploreItems={productExploreItems} threads={productThreads} selectedExplore={selectedExplore} onAddExploreNote={addExploreNote} onAddExploreToThread={addExploreToThread} onSelectExplore={setSelectedExploreId} onUpdateExploreStatus={updateExploreStatus} />}
        {activeView === 'records' && <RecordsPage entries={entries} threads={productThreads} selectedEntry={selectedEntry} onDeleteEntry={deleteEntry} onSelectEntry={setSelectedEntryId} onOpenChain={() => openSelectedEntryChain(selectedEntry.id)} onUpdateEntry={updateEntry} />}
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
  exploreItems,
  threads,
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
  onQuickRecordKeyDown,
  onToggleSource,
  onSaveQuickRecord,
  onOpenThread,
  onOpenExplore,
  onOpenRecords,
}: {
  entries: Entry[];
  exploreItems: ExploreItem[];
  threads: WorkThread[];
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
  onQuickRecordKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
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
          <textarea id="quick-record" ref={quickRecordRef} value={quickRecord} onChange={(event) => onQuickRecordChange(event.target.value)} onKeyDown={onQuickRecordKeyDown} placeholder="刚刚发生了什么？写下一条进展、问题、方案、线索..." />
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

function ThreadsPage({ threads, onThreadsChange, onOpenThread }: { threads: WorkThread[]; onThreadsChange: (threads: WorkThread[]) => void; onOpenThread: (threadId: string) => void }) {
  const emptyDraft = { name: '', stage: '', nextStep: '', description: '', blocker: '' };
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const isEditing = editingThreadId !== null;

  function openCreateForm() {
    setEditingThreadId('new');
    setDraft(emptyDraft);
  }

  function openEditForm(thread: WorkThread) {
    setEditingThreadId(thread.id);
    setDraft({ name: thread.name, stage: thread.stage, nextStep: thread.nextStep, description: thread.description, blocker: thread.blocker });
  }

  function saveThread() {
    const name = draft.name.trim();
    if (!name) return;
    const nextStage = draft.stage.trim() || '待明确';
    const nextStep = draft.nextStep.trim() || '待明确下一步';
    const description = draft.description.trim() || '记录这条工作线的持续推进过程';
    const blocker = draft.blocker.trim() || '暂无';
    const existingThread = threads.find((thread) => thread.id === editingThreadId);
    const savedThread: WorkThread = existingThread ? { ...existingThread, name, stage: nextStage, nextStep, description, blocker, updatedAt: '现在' } : {
      id: `thread-${Date.now()}`,
      name,
      description,
      status: '进行中',
      stage: nextStage,
      blocker,
      nextStep,
      updatedAt: '现在',
      recordCount: 0,
      issueCount: 0,
      sourceCount: 0,
      icon: name.slice(0, 2),
      stages: [{ label: nextStage, state: 'current' }],
    };
    const nextThreads = existingThread ? threads.map((thread) => thread.id === existingThread.id ? savedThread : thread) : [savedThread, ...threads];
    onThreadsChange(nextThreads);
    setEditingThreadId(null);
    setDraft(emptyDraft);
  }

  return (
    <section className="page-stack">
      <PageHero title="工作线" subtitle="查看所有正在推进、暂停和已完成的工作线，清楚知道每件事现在做到哪里。" />
      <div className="page-action-row"><Segmented items={['进行中 6', '暂停 2', '已完成 12']} /><button className="secondary-button" onClick={openCreateForm} type="button">+ 新建工作线</button></div>
      {isEditing && (
        <section className="panel thread-edit-form" aria-label="工作线编辑">
          <PanelTitle icon="✎" title={editingThreadId === 'new' ? '新建工作线' : '编辑工作线'} />
          <label>工作线名称<input aria-label="工作线名称" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>当前阶段<input aria-label="当前阶段" value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value })} /></label>
          <label>下一步<input aria-label="下一步" value={draft.nextStep} onChange={(event) => setDraft({ ...draft, nextStep: event.target.value })} /></label>
          <label>描述<input aria-label="描述" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label>当前阻塞<input aria-label="当前阻塞" value={draft.blocker} onChange={(event) => setDraft({ ...draft, blocker: event.target.value })} /></label>
          <div className="side-actions"><button className="primary-button" onClick={saveThread} type="button">保存工作线</button><button className="secondary-button" onClick={() => setEditingThreadId(null)} type="button">取消</button></div>
        </section>
      )}
      <div className="threads-layout">
        <div className="threads-grid">{threads.map((thread) => <ThreadCard key={thread.id} thread={thread} onEdit={() => openEditForm(thread)} onOpen={() => onOpenThread(thread.id)} />)}</div>
        <WeeklySummary />
      </div>
    </section>
  );
}

function CompactThreadCard({ thread, onOpen }: { thread: WorkThread; onOpen: () => void }) {
  return <article className="compact-thread-card"><div><span className="thread-icon">{thread.icon}</span><strong>{thread.name}</strong><Badge>{thread.status}</Badge></div><p>当前：{thread.stage}</p><p>下一步：{thread.nextStep}</p><button onClick={onOpen} type="button">查看工作线 →</button></article>;
}

function ThreadCard({ thread, onEdit, onOpen }: { thread: WorkThread; onEdit: () => void; onOpen: () => void }) {
  return (
    <article className="panel thread-card">
      <div className="thread-card-head"><span className="thread-icon">{thread.icon}</span><div><h2>{thread.name}</h2><p>{thread.description}</p></div><Badge>{thread.status}</Badge></div>
      <div className="thread-columns">
        <div><h3>当前阶段</h3><div className="stage-tags">{thread.stages.map((stage) => <span className={`stage-tag ${stage.state}`} key={stage.label}>{stage.state === 'done' ? '✓' : stage.state === 'current' ? '●' : '○'} {stage.label}</span>)}</div></div>
        <div><h3>当前阻塞</h3><p>{thread.blocker}</p></div>
        <div><h3>下一步</h3><p>{thread.nextStep}</p></div>
      </div>
      <footer><span>最近更新 <b>{thread.updatedAt}</b></span><span>记录数 <b>{thread.recordCount}</b></span><span>问题数 <b>{thread.issueCount}</b></span><span>来源数 <b>{thread.sourceCount}</b></span><button aria-label={`编辑${thread.name}`} onClick={onEdit} type="button">编辑</button><button aria-label={`查看${thread.name}详情`} onClick={onOpen} type="button">查看详情 →</button></footer>
    </article>
  );
}

function WeeklySummary() {
  return <aside className="panel weekly-summary"><PanelTitle icon="▥" title="本周概况" />{[['活跃工作线', '6'], ['本周更新', '28'], ['未解决问题', '3'], ['待推进下一步', '5']].map(([label, value]) => <div className="summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}<button className="text-link" type="button">查看全部工作线 →</button></aside>;
}

function ThreadProgressPage({ selectedThread, selectedEntry, entries, activeTab, onAddEntry, onTabChange }: { selectedThread: WorkThread; selectedEntry: Entry; entries: Entry[]; activeTab: ThreadTab; onAddEntry: (threadId: string, type: EntryType, content: string, extendsId?: string) => void; onTabChange: (tab: ThreadTab) => void }) {
  const threadEntries = entries.filter((entry) => entry.threadId === selectedThread.id).slice(0, 8);
  const [isContinueOpen, setIsContinueOpen] = useState(false);
  const [continueType, setContinueType] = useState<EntryType>('进展');
  const [continueContent, setContinueContent] = useState('');
  const [shouldExtendCurrent, setShouldExtendCurrent] = useState(false);
  const [extendTargetId, setExtendTargetId] = useState('');
  const [continueMessage, setContinueMessage] = useState('');

  function saveContinueEntry() {
    const content = continueContent.trim();
    if (!content) return;
    const selectedExtendId = extendTargetId || (shouldExtendCurrent ? selectedEntry.id : undefined);
    onAddEntry(selectedThread.id, continueType, content, selectedExtendId);
    setContinueContent('');
    setShouldExtendCurrent(false);
    setExtendTargetId('');
    setContinueMessage(`已保存到${selectedThread.name}进展流。`);
  }

  return (
    <section className="page-stack">
      <ThreadHeader selectedThread={selectedThread} activeTab={activeTab} onTabChange={onTabChange} />
      <div className="summary-cards"><InfoCard title="当前阶段" value={selectedThread.stage} /><InfoCard title="下一步" value={selectedThread.nextStep} /><InfoCard title="最近更新" value={selectedThread.updatedAt} /></div>
      <div className="detail-layout">
        <section className="panel"><PanelTitle icon="〽" title="进展流" /><EntryTimeline entries={threadEntries} ariaLabel="进展流记录" /></section>
        <aside className="side-stack"><StatusPanel thread={selectedThread} /><NextStepsPanel /><SourcePanel /><DecisionPanel />{isContinueOpen && <section className="panel continue-entry-form" aria-label="继续记录表单"><PanelTitle icon="✎" title="继续记录" /><label>继续记录类型<select aria-label="继续记录类型" value={continueType} onChange={(event) => setContinueType(event.target.value as EntryType)}>{(['进展', '问题', '方案', '决策', '线索', '记录'] as EntryType[]).map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label>选择延伸对象<select aria-label="选择延伸对象" value={extendTargetId} onChange={(event) => { setExtendTargetId(event.target.value); setShouldExtendCurrent(false); }}><option value="">不选择延伸对象</option>{threadEntries.map((entry) => <option key={entry.id} value={entry.id}>#{entry.id.replace(/\D/g, '') || entry.id.slice(-2)} {entry.title}</option>)}</select></label><label className="inline-check"><input aria-label="延伸当前记录" checked={shouldExtendCurrent} onChange={(event) => { setShouldExtendCurrent(event.target.checked); setExtendTargetId(event.target.checked ? '' : extendTargetId); }} type="checkbox" />延伸当前记录</label>{shouldExtendCurrent && <p className="muted">将延伸：{selectedEntry.title}</p>}<label>继续记录内容<textarea aria-label="继续记录内容" value={continueContent} onChange={(event) => setContinueContent(event.target.value)} placeholder="写下这条工作线的新进展、问题、方案或决定..." /></label><button className="primary-button" onClick={saveContinueEntry} type="button">保存到当前工作线</button>{continueMessage && <p className="toast-message">{continueMessage}</p>}</section>}<div className="side-actions"><button className="primary-button" onClick={() => setIsContinueOpen((isOpen) => !isOpen)} type="button">+ 继续记录</button><button className="secondary-button" onClick={() => onTabChange('chain')} type="button">查看链条</button></div></aside>
      </div>
    </section>
  );
}
function ThreadHeader({ selectedThread, activeTab, onTabChange }: { selectedThread: WorkThread; activeTab: ThreadTab; onTabChange: (tab: ThreadTab) => void }) {
  return <section className="thread-header"><span>工作线 / {selectedThread.name}</span><div><h1>{selectedThread.name}</h1><Badge>{selectedThread.status}</Badge></div><p>记录工作和思考如何持续推进，并让结构从记录中自然生长出来。</p><nav className="sub-tabs" aria-label="工作线视图">{([['overview', '概览'], ['progress', '进展'], ['chain', '链条'], ['sources', '资料']] as Array<[ThreadTab, string]>).map(([tab, label]) => <button aria-current={activeTab === tab ? 'page' : undefined} key={tab} onClick={() => onTabChange(tab)} type="button">{label}</button>)}</nav></section>;
}

function ExplorePage({ exploreItems, threads, selectedExplore, onAddExploreNote, onAddExploreToThread, onSelectExplore, onUpdateExploreStatus }: { exploreItems: ExploreItem[]; threads: WorkThread[]; selectedExplore: ExploreItem; onAddExploreNote: (id: string, content: string) => void; onAddExploreToThread: (id: string, threadId: string) => void; onSelectExplore: (id: string) => void; onUpdateExploreStatus: (id: string, status: ExploreItem['status']) => void }) {
  const [message, setMessage] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [joinThreadId, setJoinThreadId] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExploreItem['status'] | null>(null);
  const [threadFilter, setThreadFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const statusTabs: ExploreItem['status'][] = ['待探索', '探索中', '已验证', '已采用', '放弃'];
  const filteredExploreItems = exploreItems.filter((item) => (!statusFilter || item.status === statusFilter) && (!threadFilter || item.linkedThreadIds.includes(threadFilter)) && (!sourceFilter || item.sourceType === sourceFilter));
  const selectedVisibleExplore = filteredExploreItems.find((item) => item.id === selectedExplore.id) ?? filteredExploreItems[0] ?? selectedExplore;

  function resetExploreDraft() {
    setMessage('');
    setDraftNote('');
  }

  function joinSelectedThread() {
    const targetThreadId = joinThreadId || threads.find((thread) => !selectedVisibleExplore.linkedThreadIds.includes(thread.id))?.id || threads[0]?.id;
    if (!targetThreadId) return;
    const targetThread = threads.find((thread) => thread.id === targetThreadId);
    onAddExploreToThread(selectedVisibleExplore.id, targetThreadId);
    setMessage(`已加入 ${targetThread?.name ?? '工作线'}。`);
  }

  function clearExploreFilters() {
    setStatusFilter(null);
    setThreadFilter(null);
    setSourceFilter(null);
  }

  function setExploreStatus(status: ExploreItem['status']) {
    onUpdateExploreStatus(selectedVisibleExplore.id, status);
    setMessage(`状态已更新为${status}。`);
  }

  function startExploring() {
    setExploreStatus('探索中');
  }

  function saveExploreNote() {
    if (!draftNote.trim()) return;
    onAddExploreNote(selectedVisibleExplore.id, draftNote);
    setDraftNote('');
    setMessage('已追加探索记录。');
  }

  return (
    <section className="page-stack">
      <PageHero title="待探索" subtitle="先记下来，等有时间再继续研究。把值得进一步看的内容和后续结论放在一起。" />
      <div className="page-action-row explore-summary-row">{statusTabs.map((status) => <span className="summary-chip" key={status}>{status} {exploreItems.filter((item) => item.status === status).length}</span>)}</div>
      <div className="three-column-layout explore-layout"><ExploreFilterPanel activeSourceType={sourceFilter} activeStatus={statusFilter} activeThreadId={threadFilter} exploreItems={exploreItems} onClear={clearExploreFilters} onSourceFilter={setSourceFilter} onStatusFilter={setStatusFilter} onThreadFilter={setThreadFilter} /><section className="panel"><PanelTitle icon="✦" title="待探索内容" /><div className="list-toolbar"><strong>共 {filteredExploreItems.length} 个待探索</strong></div><div className="explore-grid">{filteredExploreItems.map((item) => <button className={item.id === selectedVisibleExplore.id ? 'explore-card selected' : 'explore-card'} key={item.id} onClick={() => { onSelectExplore(item.id); resetExploreDraft(); }} type="button"><strong>{item.title}</strong><span>{item.sourceType} · {item.domain}</span><p>{item.reason}</p><footer>{item.savedAt}<Badge>{item.status}</Badge></footer></button>)}</div></section><ExploreDetail draftNote={draftNote} item={selectedVisibleExplore} joinThreadId={joinThreadId} message={message} threads={threads} onDraftNoteChange={setDraftNote} onJoinThread={joinSelectedThread} onJoinThreadChange={setJoinThreadId} onSaveExploreNote={saveExploreNote} onStartExploring={startExploring} onUpdateStatus={setExploreStatus} /></div>
    </section>
  );
}

function ExploreFilterPanel({ activeSourceType, activeStatus, activeThreadId, exploreItems, onClear, onSourceFilter, onStatusFilter, onThreadFilter }: { activeSourceType: string | null; activeStatus: ExploreItem['status'] | null; activeThreadId: string | null; exploreItems: ExploreItem[]; onClear: () => void; onSourceFilter: (sourceType: string) => void; onStatusFilter: (status: ExploreItem['status']) => void; onThreadFilter: (threadId: string) => void }) {
  const statusItems = (['待探索', '探索中', '已验证', '已采用', '放弃'] as ExploreItem['status'][]).map((status) => ({ status, count: exploreItems.filter((item) => item.status === status).length })).filter((item) => item.count > 0);
  const threadItems = threads.map((thread) => ({ id: thread.id, label: thread.name, count: exploreItems.filter((item) => item.linkedThreadIds.includes(thread.id)).length })).filter((item) => item.count > 0);
  const sourceItems = Array.from(new Set(exploreItems.map((item) => item.sourceType))).map((sourceType) => ({ sourceType, count: exploreItems.filter((item) => item.sourceType === sourceType).length })).filter((item) => item.count > 0);
  return <aside className="panel filter-panel"><div className="filter-title"><strong>筛选</strong><button onClick={onClear} type="button">清空筛选</button></div><section><h3>状态</h3>{statusItems.map((item) => <button className={activeStatus === item.status ? 'active' : ''} key={item.status} onClick={() => onStatusFilter(item.status)} type="button">{item.status} {item.count}</button>)}</section><section><h3>工作线</h3>{threadItems.map((item) => <button className={activeThreadId === item.id ? 'active' : ''} key={item.id} onClick={() => onThreadFilter(item.id)} type="button">{item.label} {item.count}</button>)}</section><section><h3>来源</h3>{sourceItems.map((item) => <button className={activeSourceType === item.sourceType ? 'active' : ''} key={item.sourceType} onClick={() => onSourceFilter(item.sourceType)} type="button">{item.sourceType} {item.count}</button>)}</section></aside>;
}

function ExploreDetail({ draftNote, item, joinThreadId, message, threads, onDraftNoteChange, onJoinThread, onJoinThreadChange, onSaveExploreNote, onStartExploring, onUpdateStatus }: { draftNote: string; item: ExploreItem; joinThreadId: string; message: string; threads: WorkThread[]; onDraftNoteChange: (value: string) => void; onJoinThread: () => void; onJoinThreadChange: (threadId: string) => void; onSaveExploreNote: () => void; onStartExploring: () => void; onUpdateStatus: (status: ExploreItem['status']) => void }) {
  const noteEntries: Entry[] = (item.explorationNotes ?? []).map((note) => ({ id: note.id, time: note.time, date: '今天', threadId: item.linkedThreadIds[0] ?? 'yinian', type: '进展', title: note.content, body: note.content, tags: [] }));
  const fallbackEntries: Entry[] = [{ id: 'x1', time: '今天', date: '今天', threadId: 'yinian', type: '进展', title: '跑通示例项目', body: '本地搭建成功，示例脚本可以正常运行。', tags: [] }, { id: 'x2', time: '昨天', date: '昨天', threadId: 'yinian', type: '问题', title: 'API 与现有系统不兼容', body: '关键接口差异较大，需改造成成本较高。', tags: [] }];
  return <aside className="panel detail-panel"><PanelTitle icon="◫" title="探索详情" /><h2>{item.title}</h2><p>{item.sourceType} · {item.domain}</p><DetailRow label="当前状态" value={item.status} /><DetailRow label="保存时间" value={item.savedAt} /><DetailRow label="保存原因" value={item.reason} /><div className="tag-row">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div><section className="preview-card"><strong>预览</strong><p>{item.title} 是一个值得继续研究的资源，适合放入后续探索流程。</p><span>3.2k stars · TypeScript · MIT</span></section><section><h3>探索记录</h3><EntryTimeline entries={noteEntries.length ? noteEntries : fallbackEntries} ariaLabel="探索记录" /><label className="record-edit-form"><span>追加探索记录</span><textarea aria-label="追加探索记录" value={draftNote} onChange={(event) => onDraftNoteChange(event.target.value)} placeholder="记录这次探索的结果、问题或判断..." /></label><button className="secondary-button" onClick={onSaveExploreNote} type="button">保存探索记录</button></section>{message && <p className="toast-message">{message}</p>}<h3>关联工作线</h3><div className="tag-row">{item.linkedThreadIds.map((id) => <span key={id}>{threads.find((thread) => thread.id === id)?.name}</span>)}</div><label className="record-edit-form"><span>选择加入工作线</span><select aria-label="选择加入工作线" value={joinThreadId} onChange={(event) => onJoinThreadChange(event.target.value)}>{threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.name}</option>)}</select></label><div className="side-actions"><button className="primary-button" onClick={onStartExploring} type="button">开始探索</button><button className="secondary-button" onClick={() => onUpdateStatus('已验证')} type="button">标记已验证</button><button className="secondary-button" onClick={() => onUpdateStatus('已采用')} type="button">标记已采用</button><button className="secondary-button" onClick={() => onUpdateStatus('放弃')} type="button">放弃探索</button><button className="secondary-button" onClick={onJoinThread} type="button">加入工作线</button></div></aside>;
}

function RecordsPage({ entries, threads, selectedEntry, onDeleteEntry, onSelectEntry, onOpenChain, onUpdateEntry }: { entries: Entry[]; threads: WorkThread[]; selectedEntry: Entry; onDeleteEntry: (entryId: string) => void; onSelectEntry: (id: string) => void; onOpenChain: () => void; onUpdateEntry: (entryId: string, content: string) => void }) {
  const [threadFilter, setThreadFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<EntryType | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'relevant'>('newest');
  const filteredEntries = entries.filter((entry) => (!threadFilter || entry.threadId === threadFilter) && (!typeFilter || entry.type === typeFilter));
  const sortedEntries = [...filteredEntries].sort((first, second) => {
    if (sortOrder === 'oldest') return entrySortValue(first) - entrySortValue(second);
    return entrySortValue(second) - entrySortValue(first);
  });
  const selectedVisibleEntry = sortedEntries.find((entry) => entry.id === selectedEntry.id) ?? sortedEntries[0] ?? selectedEntry;

  function clearFilters() {
    setThreadFilter(null);
    setTypeFilter(null);
  }

  return <section className="page-stack"><PageHero title="全部记录" subtitle="按时间查看所有记录，并通过工作线、类型、来源和状态快速筛选。" /><div className="three-column-layout records-layout"><RecordsFilterPanel entries={entries} threads={threads} activeThreadId={threadFilter} activeType={typeFilter} onClear={clearFilters} onThreadFilter={setThreadFilter} onTypeFilter={setTypeFilter} /><section className="panel"><div className="list-toolbar"><strong>共 {sortedEntries.length} 条记录</strong><RecordsSortTabs activeSort={sortOrder} onSortChange={setSortOrder} /></div><EntryList entries={sortedEntries} selectedEntryId={selectedVisibleEntry.id} onSelectEntry={onSelectEntry} /></section><RecordDetail entry={selectedVisibleEntry} onDeleteEntry={onDeleteEntry} onOpenChain={onOpenChain} onUpdateEntry={onUpdateEntry} /></div></section>;
}

function entrySortValue(entry: Entry) {
  const dayOffset = entry.date === '今天' ? 1 : 0;
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(entry.time);
  const minutes = timeMatch ? Number(timeMatch[1]) * 60 + Number(timeMatch[2]) : 24 * 60 - 1;
  return dayOffset * 24 * 60 + minutes;
}

function RecordsSortTabs({ activeSort, onSortChange }: { activeSort: 'newest' | 'oldest' | 'relevant'; onSortChange: (sort: 'newest' | 'oldest' | 'relevant') => void }) {
  const items: Array<['newest' | 'oldest' | 'relevant', string]> = [['newest', '最新'], ['oldest', '最早'], ['relevant', '最相关']];
  return <div className="segmented">{items.map(([sort, label]) => <button className={activeSort === sort ? 'active' : ''} key={sort} onClick={() => onSortChange(sort)} type="button">{label}</button>)}</div>;
}

function RecordsFilterPanel({ entries, threads, activeThreadId, activeType, onClear, onThreadFilter, onTypeFilter }: { entries: Entry[]; threads: WorkThread[]; activeThreadId: string | null; activeType: EntryType | null; onClear: () => void; onThreadFilter: (threadId: string) => void; onTypeFilter: (type: EntryType) => void }) {
  const todayCount = entries.filter((entry) => entry.date === '今天').length;
  const threadItems = threads.map((thread) => ({ id: thread.id, label: thread.name, count: entries.filter((entry) => entry.threadId === thread.id).length })).filter((item) => item.count > 0);
  const typeItems = (['进展', '问题', '方案', '决策', '线索', '记录'] as EntryType[]).map((type) => ({ type, label: type === '记录' ? '普通记录' : type, count: entries.filter((entry) => entry.type === type).length })).filter((item) => item.count > 0);
  return <aside className="panel filter-panel"><div className="filter-title"><strong>筛选</strong><button onClick={onClear} type="button">清空筛选</button></div><section><h3>时间</h3><button className="active" type="button">今天 {todayCount}</button><button type="button">全部 {entries.length}</button></section><section><h3>工作线</h3>{threadItems.map((item) => <button className={activeThreadId === item.id ? 'active' : ''} key={item.id} onClick={() => onThreadFilter(item.id)} type="button">{item.label} {item.count}</button>)}</section><section><h3>类型</h3>{typeItems.map((item) => <button className={activeType === item.type ? 'active' : ''} key={item.type} onClick={() => onTypeFilter(item.type)} type="button">{item.label} {item.count}</button>)}</section><section><h3>来源</h3><button type="button">有来源 {entries.filter((entry) => entry.source).length}</button></section></aside>;
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
  const dateGroups = Array.from(new Set(entries.map((entry) => entry.date)));
  return <div className={compact ? 'entry-list compact' : 'entry-list'}>{dateGroups.map((date) => <section key={date}><h3>{date}</h3>{entries.filter((entry) => entry.date === date).map((entry) => <button className={entry.id === selectedEntryId ? 'entry-row selected' : 'entry-row'} key={entry.id} onClick={() => onSelectEntry(entry.id)} type="button"><time>{entry.time}</time><span>{threads.find((thread) => thread.id === entry.threadId)?.name} · {entry.type}</span><strong>{entry.title}</strong>{!compact && <p>{entry.tags.map((tag) => `#${tag}`).join(' ')}</p>}<b>›</b></button>)}</section>)}</div>;
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

