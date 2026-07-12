import { useEffect, useMemo, useRef, useState } from 'react';
import { type Entry, type EntryType, type ExploreItem, type ThreadTab, type TopView, type WorkThread } from './productData';
import { addExploreItemNote, batchMoveProductEntries, createProductEntry, createProductThread, createProductWorkline, deleteProductEntry, deleteProductThread, fetchProductBootstrap, importLegacyLocalStorageFrom, setExploreItemThreadLink, updateExploreItemStatus, updateProductEntry, updateProductThread } from './api';
import './App.css';
import './design-system.css';

type SearchResult = {
  id: string;
  kind: '工作线' | '记录' | '待探索';
  title: string;
  subtitle: string;
  onOpen: () => void;
};

function greetingForHour(hour: number): string {
  if (hour < 6) return '夜深了';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function formatRecordTime(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()} / ${pad(now.getMonth() + 1)} / ${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function formatEntryTime(now: Date) {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function App() {
  const [activeView, setActiveView] = useState<TopView>('today');
  const [selectedThreadId, setSelectedThreadId] = useState('yinian');
  const [threadTab, setThreadTab] = useState<ThreadTab>('progress');
  const [selectedExploreId, setSelectedExploreId] = useState('browser-harness');
  const [selectedEntryId, setSelectedEntryId] = useState('e15');
  const [quickRecord, setQuickRecord] = useState('');
  const [quickThreadId, setQuickThreadId] = useState('');
  const [quickSourceType, setQuickSourceType] = useState('链接');
  const [quickSourceContent, setQuickSourceContent] = useState('');
  const [productThreads, setProductThreads] = useState<WorkThread[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [productExploreItems, setProductExploreItems] = useState<ExploreItem[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [operationError, setOperationError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const quickRecordRef = useRef<HTMLTextAreaElement>(null);

  async function loadProduct() {
    setLoadState('loading');
    setOperationError('');
    try {
      await importLegacyLocalStorageFrom();
      const bootstrap = await fetchProductBootstrap();
      setProductThreads(bootstrap.threads); setEntries(bootstrap.entries); setProductExploreItems(bootstrap.exploreItems);
      setSelectedThreadId(bootstrap.threads[0]?.id ?? ''); setQuickThreadId('');
      setSelectedEntryId(bootstrap.entries[0]?.id ?? ''); setSelectedExploreId(bootstrap.exploreItems[0]?.id ?? '');
      setLoadState('ready');
    } catch { setLoadState('error'); }
  }

  useEffect(() => { void loadProduct(); }, []);

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

  async function saveQuickRecord() {
    const content = quickRecord.trim();
    if (!content) return;
    const entryInput: Omit<Entry, 'id' | 'threadId'> = {
      time: formatEntryTime(new Date()), date: '今天', type: '记录',
      title: content, body: content, tags: [],
      source: quickSourceContent.trim() ? `${quickSourceType} · ${quickSourceContent.trim()}` : undefined,
    };
    try {
      const threadInput: Omit<WorkThread, 'id'> = {
        name: content, description: '', status: '进行中', stage: '', blocker: '', nextStep: '',
        updatedAt: formatEntryTime(new Date()), recordCount: 1, issueCount: 0, sourceCount: entryInput.source ? 1 : 0, icon: content.slice(0, 1), stages: [],
      };
      const { thread, entry } = await createProductWorkline(threadInput, entryInput);
      setProductThreads((current) => [thread, ...current]); setEntries((current) => [entry, ...current]);
      setSelectedThreadId(thread.id); setQuickThreadId(''); setSelectedEntryId(entry.id);
      setQuickRecord(''); setQuickSourceContent('');
      setStatusMessage(`已创建工作线「${thread.name}」。`); setOperationError('');
    } catch { setOperationError('保存失败，请重试。'); }
  }

  async function appendQuickRecord() {
    const content = quickRecord.trim();
    if (!content || !quickThreadId) return;
    try {
      const entry = await createProductEntry({ time: formatEntryTime(new Date()), date: '今天', threadId: quickThreadId, type: '记录', title: content, body: content, tags: [], source: quickSourceContent.trim() ? `${quickSourceType} · ${quickSourceContent.trim()}` : undefined });
      setEntries((current) => [entry, ...current]); setSelectedEntryId(entry.id);
      setQuickRecord(''); setQuickSourceContent(''); setQuickThreadId('');
      setStatusMessage('已追加到所选工作线。'); setOperationError('');
    } catch { setOperationError('保存失败，请重试。'); }
  }

  async function deleteEntry(entryId: string) {
    try { await deleteProductEntry(entryId); }
    catch { setOperationError('删除失败，请重试。'); return false; }
    setEntries((current) => current.filter((entry) => entry.id !== entryId));
    if (selectedEntryId === entryId) {
      const fallbackEntry = entries.find((entry) => entry.id !== entryId);
      setSelectedEntryId(fallbackEntry?.id ?? '');
    }
    setOperationError(''); return true;
  }

  async function updateEntry(entryId: string, content: string) {
    const nextContent = content.trim();
    if (!nextContent) return false;
    try {
      const saved = await updateProductEntry(entryId, { title: nextContent, body: nextContent });
      setEntries((current) => current.map((entry) => entry.id === entryId ? saved : entry));
      setOperationError(''); return true;
    } catch { setOperationError('编辑失败，请重试。'); return false; }
  }

  async function moveEntry(entryId: string, threadId: string) {
    try {
      const saved = await updateProductEntry(entryId, { threadId });
      setEntries((current) => current.map((entry) => entry.id === entryId ? saved : entry));
      setOperationError(''); return true;
    } catch { setOperationError('移动失败，请重试。'); return false; }
  }

  async function addThreadEntry(threadId: string, type: EntryType, content: string, extendsId?: string, selectNewEntry = true) {
    const nextContent = content.trim();
    if (!nextContent) return false;
    const entryInput: Omit<Entry, 'id'> = { time: formatEntryTime(new Date()), date: '今天', threadId, type, title: nextContent, body: nextContent, tags: [], extendsId };
    try {
      const newEntry = await createProductEntry(entryInput);
      setEntries((current) => [newEntry, ...current]); if (selectNewEntry) setSelectedEntryId(newEntry.id); setOperationError(''); return true;
    } catch { setOperationError('保存失败，请重试。'); return false; }
  }

  async function updateExploreStatus(exploreId: string, status: ExploreItem['status']) {
    try { const saved = await updateExploreItemStatus(exploreId, status); setProductExploreItems((current) => current.map((item) => item.id === exploreId ? saved : item)); setOperationError(''); return true; }
    catch { setOperationError('状态更新失败，请重试。'); return false; }
  }

  async function addExploreNote(exploreId: string, content: string) {
    const nextContent = content.trim();
    if (!nextContent) return false;
    try { const saved = await addExploreItemNote(exploreId, { time: formatEntryTime(new Date()), content: nextContent }); setProductExploreItems((current) => current.map((item) => item.id === exploreId ? saved : item)); setOperationError(''); return true; }
    catch { setOperationError('探索记录保存失败，请重试。'); return false; }
  }

  async function addExploreToThread(exploreId: string, threadId: string) {
    try { const saved = await setExploreItemThreadLink(exploreId, threadId); setProductExploreItems((current) => current.map((item) => item.id === exploreId ? saved : item)); setOperationError(''); return true; }
    catch { setOperationError('加入工作线失败，请重试。'); return false; }
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

  if (loadState === 'loading') return <main className="product-main" role="status">正在加载 SQLite 数据…</main>;
  if (loadState === 'error') return <main className="product-main"><section className="panel" role="alert">数据加载失败，请检查服务后重试。</section><button onClick={() => void loadProduct()} type="button">重试</button></main>;

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
      {operationError && <p className="toast-message" role="alert">{operationError}</p>}
      <main className="product-main">
        {activeView === 'today' && (
          <TodayPage
            entries={entries}
            exploreItems={productExploreItems}
            threads={productThreads}
            quickRecord={quickRecord}
            quickRecordRef={quickRecordRef}
            quickThreadId={quickThreadId}
            quickSourceType={quickSourceType}
            quickSourceContent={quickSourceContent}
            statusMessage={statusMessage}
            onQuickRecordChange={setQuickRecord}
            onQuickThreadChange={setQuickThreadId}
            onQuickSourceTypeChange={setQuickSourceType}
            onQuickSourceContentChange={setQuickSourceContent}
            onQuickRecordKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                if (quickThreadId) appendQuickRecord(); else saveQuickRecord();
              }
            }}
            onSaveQuickRecord={() => { if (quickThreadId) appendQuickRecord(); else saveQuickRecord(); }}
            onOpenThread={openThread}
            onOpenExplore={(id) => { setSelectedExploreId(id); setActiveView('explore'); }}
            onOpenRecords={() => setActiveView('records')}
          />
        )}
        {activeView === 'threads' && threadTab === 'overview' && <ThreadProgressPage entries={entries} selectedEntry={selectedEntry} selectedThread={selectedThread} activeTab={threadTab} onAddEntry={addThreadEntry} onDeleteEntry={deleteEntry} onTabChange={setThreadTab} onUpdateEntry={updateEntry} />}
        {activeView === 'threads' && threadTab === 'progress' && (
          selectedThreadId && selectedThread && selectedEntry ? <ThreadProgressPage entries={entries} selectedEntry={selectedEntry} selectedThread={selectedThread} activeTab={threadTab} onAddEntry={addThreadEntry} onDeleteEntry={deleteEntry} onTabChange={setThreadTab} onUpdateEntry={updateEntry} /> : <ThreadsPage entries={entries} threads={productThreads} onDeleteThread={async (thread) => { if (!window.confirm(`删除“${thread.name}”及其全部记录？此操作无法撤销。`)) return; try { await deleteProductThread(thread.id); setProductThreads((current) => current.filter((item) => item.id !== thread.id)); setEntries((current) => current.filter((entry) => entry.threadId !== thread.id)); setProductExploreItems((current) => current.map((item) => ({ ...item, linkedThreadIds: item.linkedThreadIds.filter((id) => id !== thread.id) }))); setOperationError(''); } catch { setOperationError('工作线删除失败，请重试。'); } }} onSaveThread={async (draft, existing) => { try { const saved = existing ? await updateProductThread(existing.id, draft) : await createProductThread(draft as Omit<WorkThread, 'id'>); setProductThreads((current) => existing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]); setOperationError(''); return true; } catch { setOperationError('工作线保存失败，请重试。'); return false; } }} onOpenThread={openThread} />
        )}

        {activeView === 'threads' && threadTab === 'sources' && selectedThread && selectedEntry && <ThreadProgressPage entries={entries} selectedEntry={selectedEntry} selectedThread={selectedThread} activeTab={threadTab} onAddEntry={addThreadEntry} onDeleteEntry={deleteEntry} onTabChange={setThreadTab} onUpdateEntry={updateEntry} />}
        {activeView === 'explore' && selectedExplore && <ExplorePage exploreItems={productExploreItems} threads={productThreads} selectedExplore={selectedExplore} onAddExploreNote={addExploreNote} onAddExploreToThread={addExploreToThread} onSelectExplore={setSelectedExploreId} onUpdateExploreStatus={updateExploreStatus} />}
        {activeView === 'records' && selectedEntry && <RecordsPage entries={entries} threads={productThreads} selectedEntry={selectedEntry} onBatchMove={async (entryIds, target) => { try { const result = await batchMoveProductEntries(entryIds, target); setProductThreads((current) => current.some((thread) => thread.id === result.thread.id) ? current : [result.thread, ...current]); const moved = new Map(result.entries.map((entry) => [entry.id, entry])); setEntries((current) => current.map((entry) => moved.get(entry.id) ?? entry)); setOperationError(''); return true; } catch { setOperationError('批量移动失败，请重试。'); return false; } }} onContinueFrom={async (entry, content, asComment) => addThreadEntry(entry.threadId, '记录', content, asComment ? entry.id : undefined, false)} onDeleteEntry={deleteEntry} onMoveEntry={moveEntry} onSelectEntry={setSelectedEntryId} onUpdateEntry={updateEntry} />}
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
  quickSourceType,
  quickSourceContent,
  statusMessage,
  onQuickRecordChange,
  onQuickThreadChange,
  onQuickSourceTypeChange,
  onQuickSourceContentChange,
  onQuickRecordKeyDown,
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
  quickSourceType: string;
  quickSourceContent: string;
  statusMessage: string;
  onQuickRecordChange: (value: string) => void;
  onQuickThreadChange: (threadId: string) => void;
  onQuickSourceTypeChange: (sourceType: string) => void;
  onQuickSourceContentChange: (sourceContent: string) => void;
  onQuickRecordKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  onSaveQuickRecord: () => void;
  onOpenThread: (threadId: string) => void;
  onOpenExplore: (id: string) => void;
  onOpenRecords: () => void;
}) {
  const todayEntries = entries.filter((entry) => entry.date === '今天').slice(0, 6);
  const [isWorklineMenuOpen, setIsWorklineMenuOpen] = useState(false);
  const selectedQuickThread = threads.find((thread) => thread.id === quickThreadId);
  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const recordTime = formatRecordTime(now);
  return (
    <section className="page-stack today-page">
      <PageHero title={greeting} subtitle={`当前有 ${threads.filter((thread) => thread.status === '进行中').length} 条活跃工作线 · 今日记录 ${entries.filter((entry) => entry.date === '今天').length} 条`} />
      <div className="today-top-grid">
        <section className="panel quick-record-panel">
          <PanelTitle icon="⚡" title="快速记录" />
          <label className="sr-label" htmlFor="quick-record">刚刚发生了什么？</label>
          <textarea id="quick-record" ref={quickRecordRef} value={quickRecord} onChange={(event) => onQuickRecordChange(event.target.value)} onKeyDown={onQuickRecordKeyDown} placeholder="刚刚发生了什么？写下一条进展、问题、方案、线索..." />
          <div className="quick-tools">
            <div className="workline-picker-field">
              <span>归入工作线</span>
              <div className="workline-picker-wrap">
                <button aria-expanded={isWorklineMenuOpen} aria-haspopup="listbox" aria-label="选择工作线" className="workline-picker-trigger" onClick={() => setIsWorklineMenuOpen((open) => !open)} style={{ minHeight: 56, fontSize: 15 }} type="button">
                  <span aria-hidden="true" className="workline-picker-icon">@</span>
                  <span className="workline-picker-copy"><strong>{selectedQuickThread?.name ?? '新想法'}</strong><small>{selectedQuickThread?.status ?? '默认创建新工作线'}</small></span>
                  <span aria-hidden="true" className="workline-picker-chevron">⌄</span>
                </button>
                {isWorklineMenuOpen && <div aria-label="工作线选项" className="workline-picker-menu" role="listbox"><button aria-selected={!quickThreadId} onClick={() => { onQuickThreadChange(''); setIsWorklineMenuOpen(false); }} role="option" type="button"><span className="thread-icon">新</span><span><strong>新想法</strong><small>创建一条新工作线</small></span>{!quickThreadId && <b aria-hidden="true">✓</b>}</button>{threads.map((thread) => <button aria-selected={thread.id === quickThreadId} key={thread.id} onClick={() => { onQuickThreadChange(thread.id); setIsWorklineMenuOpen(false); }} role="option" type="button"><span className="thread-icon">{thread.icon}</span><span><strong>{thread.name}</strong><small>{thread.stage || thread.status}</small></span>{thread.id === quickThreadId && <b aria-hidden="true">✓</b>}</button>)}</div>}
              </div>
              <select aria-hidden="true" aria-label="选择工作线原生值" className="workline-picker-native" tabIndex={-1} value={quickThreadId} onChange={(event) => onQuickThreadChange(event.target.value)}>
                <option value="">新想法</option>
                {threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.name}</option>)}
              </select>
            </div>
          </div>
          <div className="quick-source-row">
            <label>
              <span>来源类型</span>
              <select aria-label="选择来源类型" value={quickSourceType} onChange={(event) => onQuickSourceTypeChange(event.target.value)}>
                <option value="链接">链接</option>
                <option value="文字">文字</option>
              </select>
            </label>
            <label>
              <span>来源内容（可选）</span>
              <input aria-label="来源内容" value={quickSourceContent} onChange={(event) => onQuickSourceContentChange(event.target.value)} placeholder="粘贴链接或来源文字（可选）..." />
            </label>
          </div>
          <div className="quick-footer"><span>记录时间 {recordTime}</span><button onClick={onSaveQuickRecord} type="button">保存</button></div>
          {statusMessage && <p className="toast-message">{statusMessage}</p>}
        </section>
        <TodayOverview entries={entries} exploreItems={exploreItems} threads={threads} />
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

function TodayOverview({ entries, exploreItems, threads }: { entries: Entry[]; exploreItems: ExploreItem[]; threads: WorkThread[] }) {
  const metrics = [
    ['活跃工作线', threads.filter((thread) => thread.status === '进行中').length],
    ['今日记录', entries.filter((entry) => entry.date === '今天').length],
    ['今日问题', entries.filter((entry) => entry.date === '今天' && entry.type === '问题').length],
    ['待探索', exploreItems.filter((item) => item.status === '待探索').length],
  ];
  return (
    <section className="panel overview-panel" aria-label="今日概览统计">
      <PanelTitle icon="◫" title="今日概览" />
      <div className="metric-grid">
        {metrics.map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>

    </section>
  );
}

function ThreadsPage({ entries, threads, onDeleteThread, onSaveThread, onOpenThread }: { entries: Entry[]; threads: WorkThread[]; onDeleteThread: (thread: WorkThread) => void; onSaveThread: (thread: WorkThread, existing?: WorkThread) => Promise<boolean>; onOpenThread: (threadId: string) => void }) {
  const emptyDraft = { name: '' };
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const isEditing = editingThreadId !== null;

  useEffect(() => {
    if (!isEditing) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setEditingThreadId(null);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isEditing]);

  function openCreateForm() {
    setEditingThreadId('new');
    setDraft(emptyDraft);
  }

  function openEditForm(thread: WorkThread) {
    setEditingThreadId(thread.id);
    setDraft({ name: thread.name });
  }

  async function saveThread() {
    const name = draft.name.trim();
    if (!name) return;
    const existingThread = threads.find((thread) => thread.id === editingThreadId);
    const savedThread: WorkThread = existingThread ? { ...existingThread, name, updatedAt: formatEntryTime(new Date()) } : {
      id: `thread-${Date.now()}`,
      name,
      description: '',
      status: '进行中',
      stage: '',
      blocker: '',
      nextStep: '',
      updatedAt: formatEntryTime(new Date()),
      recordCount: 0,
      issueCount: 0,
      sourceCount: 0,
      icon: name.slice(0, 2),
      stages: [],
    };
    if (!await onSaveThread(savedThread, existingThread)) return;
    setEditingThreadId(null);
    setDraft(emptyDraft);
  }

  return (
    <section className="page-stack">
      <PageHero title="工作线" subtitle="查看所有正在推进、暂停和已完成的工作线，清楚知道每件事现在做到哪里。" />
      <div className="page-action-row"><span>{threads.length} 条工作线</span><button className="secondary-button" onClick={openCreateForm} type="button">+ 新建工作线</button></div>
      {isEditing && (
        <div className="thread-edit-backdrop" onMouseDown={() => setEditingThreadId(null)}>
          <section aria-labelledby="thread-edit-title" aria-modal="true" className="panel thread-edit-form" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <div className="thread-edit-heading">
              <div className="panel-title"><span>✎</span><h2 id="thread-edit-title">{editingThreadId === 'new' ? '新建工作线' : '编辑工作线'}</h2></div>
              <p>{editingThreadId === 'new' ? '给正在持续推进的事情起个名字。' : '修改工作线名称，不会影响已有记录。'}</p>
            </div>
            <label className="thread-name-field">工作线名称<input aria-label="工作线名称" autoFocus placeholder="例如：一念产品" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <div className="thread-edit-actions"><button className="secondary-button" onClick={() => setEditingThreadId(null)} type="button">取消</button><button className="primary-button" disabled={!draft.name.trim()} onClick={saveThread} type="button">保存工作线</button></div>
          </section>
        </div>
      )}
      <div className="threads-layout">
        <div className="threads-grid">{threads.map((thread) => <ThreadCard entries={entries} key={thread.id} thread={thread} onDelete={() => onDeleteThread(thread)} onEdit={() => openEditForm(thread)} onOpen={() => onOpenThread(thread.id)} />)}</div>
        <WeeklySummary entries={entries} threads={threads} />
      </div>
    </section>
  );
}

function CompactThreadCard({ thread, onOpen }: { thread: WorkThread; onOpen: () => void }) {
  return <article className="compact-thread-card"><div><span className="thread-icon">{thread.icon}</span><strong>{thread.name}</strong><Badge>{thread.status}</Badge></div><p>当前：{thread.stage}</p><p>下一步：{thread.nextStep}</p><button onClick={onOpen} type="button">查看工作线 →</button></article>;
}

function ThreadCard({ thread, entries, onDelete, onEdit, onOpen }: { thread: WorkThread; entries: Entry[]; onDelete: () => void; onEdit: () => void; onOpen: () => void }) {
  const threadEntries = entries.filter((entry) => entry.threadId === thread.id);
  const issueCount = threadEntries.filter((entry) => entry.type === '问题').length;
  const sourceCount = threadEntries.filter((entry) => Boolean(entry.source?.trim())).length;
  return (
    <article aria-label={`${thread.name}统计`} className="panel thread-card">
      <div className="thread-card-head"><span className="thread-icon">{thread.icon}</span><h2>{thread.name}</h2><Badge>{thread.status}</Badge></div>
      {(thread.stage || thread.blocker || thread.nextStep) && <div className="thread-columns">
        {thread.stage && <div><h3>当前阶段</h3><p>{thread.stage}</p></div>}
        {thread.blocker && <div><h3>当前阻塞</h3><p>{thread.blocker}</p></div>}
        {thread.nextStep && <div><h3>下一步</h3><p>{thread.nextStep}</p></div>}
      </div>}
      <footer><span>最近更新 <b>{thread.updatedAt}</b></span><span aria-label="工作线记录数">记录数 <b>{threadEntries.length}</b></span><span aria-label="工作线问题数">问题数 <b>{issueCount}</b></span><span aria-label="工作线来源数">来源数 <b>{sourceCount}</b></span><button aria-label={`编辑${thread.name}`} onClick={onEdit} type="button">编辑</button><button aria-label={`删除${thread.name}`} onClick={onDelete} type="button">删除</button><button aria-label={`查看${thread.name}详情`} onClick={onOpen} type="button">查看详情 →</button></footer>
    </article>
  );
}

function WeeklySummary({ entries, threads }: { entries: Entry[]; threads: WorkThread[] }) {
  const metrics = [['活跃工作线', threads.filter((thread) => thread.status === '进行中').length], ['全部记录', entries.length], ['未解决问题', entries.filter((entry) => entry.type === '问题').length], ['待推进下一步', threads.filter((thread) => thread.nextStep.trim().length > 0).length]];
  return <aside className="panel weekly-summary" aria-label="工作线概况统计"><PanelTitle icon="▥" title="本周概况" />{metrics.map(([label, value]) => <div className="summary-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}</aside>;
}

function ThreadProgressPage({ selectedThread, entries, activeTab, onAddEntry, onDeleteEntry, onTabChange, onUpdateEntry }: { selectedThread: WorkThread; selectedEntry: Entry; entries: Entry[]; activeTab: ThreadTab; onAddEntry: (threadId: string, type: EntryType, content: string, extendsId?: string) => Promise<boolean>; onDeleteEntry: (entryId: string) => Promise<boolean>; onTabChange: (tab: ThreadTab) => void; onUpdateEntry: (entryId: string, content: string) => Promise<boolean> }) {
  const threadEntries = entries.filter((entry) => entry.threadId === selectedThread.id).slice(0, 8);
  const [continueContent, setContinueContent] = useState('');
  const [recordMode, setRecordMode] = useState<'idea' | 'comment'>('idea');
  const [extendTargetId, setExtendTargetId] = useState('');
  const [continueMessage, setContinueMessage] = useState('');
  const continueRecordRef = useRef<HTMLTextAreaElement>(null);

  async function saveContinueEntry() {
    const content = continueContent.trim();
    if (!content) return;
    const selectedExtendId = recordMode === 'comment' ? extendTargetId : undefined;
    if (recordMode === 'comment' && !selectedExtendId) return;
    if (!await onAddEntry(selectedThread.id, '记录', content, selectedExtendId)) return;
    setContinueContent('');
    setRecordMode('idea');
    setExtendTargetId('');
    setContinueMessage(`已保存到${selectedThread.name}进展流。`);
  }

  return (
    <section className="page-stack">
      <ThreadHeader selectedThread={selectedThread} activeTab={activeTab} onTabChange={onTabChange} />
      <div className="detail-layout">
        <section className="panel"><PanelTitle icon="〽" title="进展流" /><EntryTimeline entries={threadEntries} ariaLabel="进展流记录" onDeleteEntry={onDeleteEntry} onUpdateEntry={onUpdateEntry} /></section>
        <aside className="side-stack"><section className="panel continue-entry-form" aria-label="继续记录表单"><PanelTitle icon="✎" title="继续记录这件事" /><fieldset className="record-mode-field"><legend>记录方式</legend><label><input checked={recordMode === 'idea'} name="record-mode" onChange={() => { setRecordMode('idea'); setExtendTargetId(''); }} type="radio" />新想法</label><label><input checked={recordMode === 'comment'} name="record-mode" onChange={() => setRecordMode('comment')} type="radio" />评论已有想法</label></fieldset>{recordMode === 'comment' && <label>选择想法<select aria-label="选择想法" value={extendTargetId} onChange={(event) => setExtendTargetId(event.target.value)}><option value="">请选择想法</option>{threadEntries.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>}<label>记录内容<textarea ref={continueRecordRef} aria-label="记录内容" value={continueContent} onChange={(event) => setContinueContent(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void saveContinueEntry(); } }} placeholder={recordMode === 'comment' ? '写下你的评论...' : '写下新的想法...'} /></label><button className="primary-button" disabled={!continueContent.trim() || (recordMode === 'comment' && !extendTargetId)} onClick={saveContinueEntry} type="button">保存到当前工作线</button>{continueMessage && <p className="toast-message">{continueMessage}</p>}</section></aside>
      </div>
    </section>
  );
}
function ThreadHeader({ selectedThread }: { selectedThread: WorkThread; activeTab: ThreadTab; onTabChange: (tab: ThreadTab) => void }) {
  return <section className="thread-header"><span>工作线 / {selectedThread.name}</span><div><h1>{selectedThread.name}</h1><Badge>{selectedThread.status}</Badge></div></section>;
}

function ExplorePage({ exploreItems, threads, selectedExplore, onAddExploreNote, onAddExploreToThread, onSelectExplore, onUpdateExploreStatus }: { exploreItems: ExploreItem[]; threads: WorkThread[]; selectedExplore: ExploreItem; onAddExploreNote: (id: string, content: string) => Promise<boolean>; onAddExploreToThread: (id: string, threadId: string) => Promise<boolean>; onSelectExplore: (id: string) => void; onUpdateExploreStatus: (id: string, status: ExploreItem['status']) => Promise<boolean> }) {
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

  async function joinSelectedThread() {
    const targetThreadId = joinThreadId || threads.find((thread) => !selectedVisibleExplore.linkedThreadIds.includes(thread.id))?.id || threads[0]?.id;
    if (!targetThreadId) return;
    const targetThread = threads.find((thread) => thread.id === targetThreadId);
    if (!await onAddExploreToThread(selectedVisibleExplore.id, targetThreadId)) return;
    setMessage(`已加入 ${targetThread?.name ?? '工作线'}。`);
  }

  function clearExploreFilters() {
    setStatusFilter(null);
    setThreadFilter(null);
    setSourceFilter(null);
  }

  async function setExploreStatus(status: ExploreItem['status']) {
    if (!await onUpdateExploreStatus(selectedVisibleExplore.id, status)) return;
    setMessage(`状态已更新为${status}。`);
  }

  async function startExploring() {
    await setExploreStatus('探索中');
  }

  async function saveExploreNote() {
    if (!draftNote.trim()) return;
    if (!await onAddExploreNote(selectedVisibleExplore.id, draftNote)) return;
    setDraftNote('');
    setMessage('已追加探索记录。');
  }

  return (
    <section className="page-stack">
      <PageHero title="待探索" subtitle="先记下来，等有时间再继续研究。把值得进一步看的内容和后续结论放在一起。" />
      <div className="page-action-row explore-summary-row">{statusTabs.map((status) => <span className="summary-chip" key={status}>{status} {exploreItems.filter((item) => item.status === status).length}</span>)}</div>
      <div className="three-column-layout explore-layout"><ExploreFilterPanel activeSourceType={sourceFilter} activeStatus={statusFilter} activeThreadId={threadFilter} exploreItems={exploreItems} threads={threads} onClear={clearExploreFilters} onSourceFilter={setSourceFilter} onStatusFilter={setStatusFilter} onThreadFilter={setThreadFilter} /><section className="panel"><PanelTitle icon="✦" title="待探索内容" /><div className="list-toolbar"><strong>共 {filteredExploreItems.length} 个待探索</strong></div><div className="explore-grid">{filteredExploreItems.map((item) => <button className={item.id === selectedVisibleExplore.id ? 'explore-card selected' : 'explore-card'} key={item.id} onClick={() => { onSelectExplore(item.id); resetExploreDraft(); }} type="button"><strong>{item.title}</strong><span>{item.sourceType} · {item.domain}</span><p>{item.reason}</p><footer>{item.savedAt}<Badge>{item.status}</Badge></footer></button>)}</div></section><ExploreDetail draftNote={draftNote} item={selectedVisibleExplore} joinThreadId={joinThreadId} message={message} threads={threads} onDraftNoteChange={setDraftNote} onJoinThread={joinSelectedThread} onJoinThreadChange={setJoinThreadId} onSaveExploreNote={saveExploreNote} onStartExploring={startExploring} onUpdateStatus={setExploreStatus} /></div>
    </section>
  );
}

function ExploreFilterPanel({ activeSourceType, activeStatus, activeThreadId, exploreItems, threads, onClear, onSourceFilter, onStatusFilter, onThreadFilter }: { activeSourceType: string | null; activeStatus: ExploreItem['status'] | null; activeThreadId: string | null; exploreItems: ExploreItem[]; threads: WorkThread[]; onClear: () => void; onSourceFilter: (sourceType: string) => void; onStatusFilter: (status: ExploreItem['status']) => void; onThreadFilter: (threadId: string) => void }) {
  const statusItems = (['待探索', '探索中', '已验证', '已采用', '放弃'] as ExploreItem['status'][]).map((status) => ({ status, count: exploreItems.filter((item) => item.status === status).length })).filter((item) => item.count > 0);
  const threadItems = threads.map((thread) => ({ id: thread.id, label: thread.name, count: exploreItems.filter((item) => item.linkedThreadIds.includes(thread.id)).length })).filter((item) => item.count > 0);
  const sourceItems = Array.from(new Set(exploreItems.map((item) => item.sourceType))).map((sourceType) => ({ sourceType, count: exploreItems.filter((item) => item.sourceType === sourceType).length })).filter((item) => item.count > 0);
  return <aside className="panel filter-panel"><div className="filter-title"><strong>筛选</strong><button onClick={onClear} type="button">清空筛选</button></div><section><h3>状态</h3>{statusItems.map((item) => <button className={activeStatus === item.status ? 'active' : ''} key={item.status} onClick={() => onStatusFilter(item.status)} type="button">{item.status} {item.count}</button>)}</section><section><h3>工作线</h3>{threadItems.map((item) => <button className={activeThreadId === item.id ? 'active' : ''} key={item.id} onClick={() => onThreadFilter(item.id)} type="button">{item.label} {item.count}</button>)}</section><section><h3>来源</h3>{sourceItems.map((item) => <button className={activeSourceType === item.sourceType ? 'active' : ''} key={item.sourceType} onClick={() => onSourceFilter(item.sourceType)} type="button">{item.sourceType} {item.count}</button>)}</section></aside>;
}

function ExploreDetail({ draftNote, item, joinThreadId, message, threads, onDraftNoteChange, onJoinThread, onJoinThreadChange, onSaveExploreNote, onStartExploring, onUpdateStatus }: { draftNote: string; item: ExploreItem; joinThreadId: string; message: string; threads: WorkThread[]; onDraftNoteChange: (value: string) => void; onJoinThread: () => void; onJoinThreadChange: (threadId: string) => void; onSaveExploreNote: () => void; onStartExploring: () => void; onUpdateStatus: (status: ExploreItem['status']) => void }) {
  const noteEntries: Entry[] = (item.explorationNotes ?? []).map((note) => ({ id: note.id, time: note.time, date: '今天', threadId: item.linkedThreadIds[0] ?? 'yinian', type: '进展', title: note.content, body: note.content, tags: [] }));
  return <aside className="panel detail-panel"><PanelTitle icon="◫" title="探索详情" /><h2>{item.title}</h2><p>{item.sourceType} · {item.domain}</p><DetailRow label="当前状态" value={item.status} /><DetailRow label="保存时间" value={item.savedAt} /><DetailRow label="保存原因" value={item.reason} />{item.tags.length > 0 && <div className="tag-row">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}<section><h3>探索记录</h3>{noteEntries.length > 0 ? <EntryTimeline entries={noteEntries} ariaLabel="探索记录" /> : <p className="muted">还没有探索记录。</p>}<label className="record-edit-form"><span>追加探索记录</span><textarea aria-label="追加探索记录" value={draftNote} onChange={(event) => onDraftNoteChange(event.target.value)} placeholder="记录这次探索的结果、问题或判断..." /></label><button className="secondary-button" onClick={onSaveExploreNote} type="button">保存探索记录</button></section>{message && <p className="toast-message">{message}</p>}<h3>关联工作线</h3>{item.linkedThreadIds.length > 0 && <div className="tag-row">{item.linkedThreadIds.map((id) => <span key={id}>{threads.find((thread) => thread.id === id)?.name}</span>)}</div>}<label className="record-edit-form"><span>选择加入工作线</span><select aria-label="选择加入工作线" value={joinThreadId} onChange={(event) => onJoinThreadChange(event.target.value)}>{threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.name}</option>)}</select></label><div className="side-actions"><button className="primary-button" onClick={onStartExploring} type="button">开始探索</button><button className="secondary-button" onClick={() => onUpdateStatus('已验证')} type="button">标记已验证</button><button className="secondary-button" onClick={() => onUpdateStatus('已采用')} type="button">标记已采用</button><button className="secondary-button" onClick={() => onUpdateStatus('放弃')} type="button">放弃探索</button><button className="secondary-button" onClick={onJoinThread} type="button">加入工作线</button></div></aside>;
}

function RecordsPage({ entries, threads, selectedEntry, onBatchMove, onContinueFrom, onDeleteEntry, onMoveEntry, onSelectEntry, onUpdateEntry }: { entries: Entry[]; threads: WorkThread[]; selectedEntry: Entry; onBatchMove: (entryIds: string[], target: { threadId: string } | { thread: Omit<WorkThread, 'id'> }) => Promise<boolean>; onContinueFrom: (entry: Entry, content: string, asComment: boolean) => Promise<boolean>; onDeleteEntry: (entryId: string) => void; onMoveEntry: (entryId: string, threadId: string) => Promise<boolean>; onSelectEntry: (id: string) => void; onUpdateEntry: (entryId: string, content: string) => Promise<boolean> }) {
  const [threadFilter, setThreadFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<EntryType | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [createNewThread, setCreateNewThread] = useState(false);
  const [targetThreadId, setTargetThreadId] = useState('');
  const [newThreadName, setNewThreadName] = useState('');
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const filteredEntries = entries.filter((entry) => (!threadFilter || entry.threadId === threadFilter) && (!typeFilter || entry.type === typeFilter));
  const sortedEntries = [...filteredEntries].sort((first, second) => {
    if (sortOrder === 'oldest') return entrySortValue(first) - entrySortValue(second);
    return entrySortValue(second) - entrySortValue(first);
  });
  const selectedVisibleEntry = sortedEntries.find((entry) => entry.id === selectedEntry.id) ?? sortedEntries[0] ?? selectedEntry;

  function clearFilters() { setThreadFilter(null); setTypeFilter(null); }
  function toggleEntry(id: string) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  async function moveSelected() {
    const name = newThreadName.trim();
    const target = createNewThread ? name ? { thread: { name, description: '', status: '进行中' as const, stage: '', blocker: '', nextStep: '', updatedAt: formatEntryTime(new Date()), recordCount: 0, issueCount: 0, sourceCount: 0, icon: name.slice(0, 1), stages: [] } } : null : targetThreadId ? { threadId: targetThreadId } : null;
    if (!target || !await onBatchMove(selectedIds, target)) return;
    setSelectedIds([]); setIsBatchMoveOpen(false); setCreateNewThread(false); setTargetThreadId(''); setNewThreadName('');
  }

  const detailEntry = entries.find((entry) => entry.id === detailEntryId);
  return <section className="page-stack"><PageHero title="全部记录" subtitle="按时间查看所有记录，并通过工作线和类型筛选。" /><div className="records-layout"><RecordsFilterPanel entries={entries} threads={threads} activeThreadId={threadFilter} activeType={typeFilter} onClear={clearFilters} onThreadFilter={setThreadFilter} onTypeFilter={setTypeFilter} /><section className="panel"><div className="list-toolbar"><strong>共 {sortedEntries.length} 条记录</strong><div className="record-list-actions">{selectedIds.length > 0 && <button className="secondary-button" onClick={() => setIsBatchMoveOpen(true)} type="button">批量移动 {selectedIds.length} 条</button>}<RecordsSortTabs activeSort={sortOrder} onSortChange={setSortOrder} /></div></div>{isBatchMoveOpen && <section className="batch-move-panel" aria-label="批量移动记录"><strong>移动 {selectedIds.length} 条记录</strong><label><input aria-label="已有工作线" checked={!createNewThread} onChange={() => setCreateNewThread(false)} type="radio" />已有工作线</label>{!createNewThread && <select aria-label="批量移动目标工作线" value={targetThreadId} onChange={(event) => setTargetThreadId(event.target.value)}><option value="">请选择工作线</option>{threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.name}</option>)}</select>}<label><input aria-label="新建工作线" checked={createNewThread} onChange={() => setCreateNewThread(true)} type="radio" />新建工作线</label>{createNewThread && <input aria-label="新工作线名称" value={newThreadName} onChange={(event) => setNewThreadName(event.target.value)} />}<div><button className="primary-button" onClick={moveSelected} type="button">确认移动</button><button className="secondary-button" onClick={() => setIsBatchMoveOpen(false)} type="button">取消</button></div></section>}<EntryList entries={sortedEntries} threads={threads} selectedEntryId={selectedVisibleEntry.id} selectedEntryIds={selectedIds} onSelectEntry={(id) => { onSelectEntry(id); setDetailEntryId(id); }} onToggleEntry={toggleEntry} /></section></div>{detailEntry && <div className="record-detail-backdrop" onMouseDown={() => setDetailEntryId(null)}><section aria-label="记录详情" aria-modal="true" className="record-detail-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label="关闭记录详情" className="record-detail-close" onClick={() => setDetailEntryId(null)} type="button">×</button><RecordDetail entries={entries} entry={detailEntry} threads={threads} onContinueFrom={onContinueFrom} onDeleteEntry={onDeleteEntry} onMoveEntry={onMoveEntry} onUpdateEntry={onUpdateEntry} /></section></div>}</section>;
}

function entrySortValue(entry: Entry) {
  const dayOffset = entry.date === '今天' ? 1 : 0;
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(entry.time);
  const minutes = timeMatch ? Number(timeMatch[1]) * 60 + Number(timeMatch[2]) : 24 * 60 - 1;
  return dayOffset * 24 * 60 + minutes;
}

function RecordsSortTabs({ activeSort, onSortChange }: { activeSort: 'newest' | 'oldest'; onSortChange: (sort: 'newest' | 'oldest') => void }) {
  const items: Array<['newest' | 'oldest', string]> = [['newest', '最新'], ['oldest', '最早']];
  return <div className="segmented">{items.map(([sort, label]) => <button className={activeSort === sort ? 'active' : ''} key={sort} onClick={() => onSortChange(sort)} type="button">{label}</button>)}</div>;
}

function RecordsFilterPanel({ entries, threads, activeThreadId, activeType, onClear, onThreadFilter, onTypeFilter }: { entries: Entry[]; threads: WorkThread[]; activeThreadId: string | null; activeType: EntryType | null; onClear: () => void; onThreadFilter: (threadId: string) => void; onTypeFilter: (type: EntryType) => void }) {
  const threadItems = threads.map((thread) => ({ id: thread.id, label: thread.name, count: entries.filter((entry) => entry.threadId === thread.id).length })).filter((item) => item.count > 0);
  const typeItems = (['进展', '问题', '方案', '决策', '线索', '记录'] as EntryType[]).map((type) => ({ type, label: type === '记录' ? '普通记录' : type, count: entries.filter((entry) => entry.type === type).length })).filter((item) => item.count > 0);
  return <aside className="panel filter-panel"><div className="filter-title"><strong>筛选</strong>{(activeThreadId || activeType) && <button onClick={onClear} type="button">清空</button>}</div><section><h3>工作线</h3>{threadItems.map((item) => <button className={activeThreadId === item.id ? 'active' : ''} key={item.id} onClick={() => onThreadFilter(item.id)} type="button">{item.label} {item.count}</button>)}</section><section><h3>类型</h3>{typeItems.map((item) => <button className={activeType === item.type ? 'active' : ''} key={item.type} onClick={() => onTypeFilter(item.type)} type="button">{item.label} {item.count}</button>)}</section></aside>;
}

function RecordDetail({ entry, threads, onContinueFrom, onDeleteEntry, onMoveEntry, onUpdateEntry }: { entries?: Entry[]; entry: Entry; threads: WorkThread[]; onContinueFrom?: (entry: Entry, content: string, asComment: boolean) => Promise<boolean>; onDeleteEntry: (entryId: string) => void; onMoveEntry?: (entryId: string, threadId: string) => Promise<boolean>; onUpdateEntry: (entryId: string, content: string) => Promise<boolean> }) {
  const thread = threads.find((item) => item.id === entry.threadId) ?? threads[0];
  const duplicateCopy = entry.title === entry.body;
  const truncatedCopy = entry.title.endsWith('…') && entry.body.startsWith(entry.title.slice(0, -1));
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(entry.body);
  const [isMoving, setIsMoving] = useState(false);
  const [moveThreadId, setMoveThreadId] = useState('');
  const [moveMessage, setMoveMessage] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueMode, setContinueMode] = useState<'idea' | 'comment'>('idea');
  const [continueDraft, setContinueDraft] = useState('');
  const [continueMessage, setContinueMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    setIsEditing(false);
    setDraftContent(entry.body);
    setIsMoving(false); setMoveThreadId(''); setMoveMessage(''); setIsContinuing(false); setContinueMode('idea'); setContinueDraft(''); setContinueMessage(''); setCopyMessage('');
  }, [entry.id, entry.body]);

  async function saveEdit() {
    const content = draftContent.trim();
    if (!content) return;
    if (!await onUpdateEntry(entry.id, content)) return;
    setIsEditing(false);
  }

  async function saveMove() {
    if (!moveThreadId || !onMoveEntry || !await onMoveEntry(entry.id, moveThreadId)) return;
    const target = threads.find((item) => item.id === moveThreadId);
    setMoveMessage(`已移动到 ${target?.name ?? '目标工作线'}。`);
    setIsMoving(false);
  }

  async function saveContinuation() {
    const content = continueDraft.trim();
    if (!content || !onContinueFrom || !await onContinueFrom(entry, content, continueMode === 'comment')) return;
    setContinueDraft(''); setIsContinuing(false); setContinueMode('idea'); setContinueMessage(continueMode === 'comment' ? '评论已保存。' : '新想法已保存。');
  }

  async function copyEntry() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(entry.body);
      setCopyMessage('已复制记录内容。');
    } catch { setCopyMessage('复制失败，请手动选择内容。'); }
  }

  return <aside className="panel detail-panel"><PanelTitle icon="☰" title="记录详情" /><span className="muted">{entry.date} {entry.time} · {thread.name} · {entry.type}</span>{isEditing ? <section className="record-edit-form"><label htmlFor={`edit-entry-${entry.id}`}>编辑记录内容</label><textarea id={`edit-entry-${entry.id}`} value={draftContent} onChange={(event) => setDraftContent(event.target.value)} /><div className="side-actions"><button className="primary-button" onClick={saveEdit} type="button">保存编辑</button><button className="secondary-button" onClick={() => { setDraftContent(entry.body); setIsEditing(false); }} type="button">取消</button></div></section> : <>{!truncatedCopy && <h2>{entry.title}</h2>}{!duplicateCopy && <p>{entry.body}</p>}</>}<div className="tag-row">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>{entry.source && <section className="preview-card"><strong>来源：{entry.source}</strong></section>}<section><h3>快速操作</h3><div className="quick-action-grid"><button onClick={() => setIsEditing(true)} type="button">编辑</button><button onClick={copyEntry} type="button">复制</button><button onClick={() => setIsMoving(true)} type="button">移动到工作线</button><button className="danger" onClick={() => onDeleteEntry(entry.id)} type="button">删除</button></div></section>{copyMessage && <p className="toast-message" role="status">{copyMessage}</p>}{isMoving && <section className="record-edit-form" aria-label="移动记录"><label>目标工作线<select aria-label="目标工作线" value={moveThreadId} onChange={(event) => setMoveThreadId(event.target.value)}><option value="">请选择工作线</option>{threads.filter((item) => item.id !== entry.threadId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="side-actions"><button className="primary-button" onClick={saveMove} type="button">确认移动</button><button className="secondary-button" onClick={() => setIsMoving(false)} type="button">取消</button></div></section>}{moveMessage && <p className="toast-message">{moveMessage}</p>}{isContinuing && <section className="record-edit-form" aria-label="从这里继续表单"><fieldset className="record-mode-field"><legend>记录方式</legend><label><input checked={continueMode === 'idea'} name={`detail-record-mode-${entry.id}`} onChange={() => setContinueMode('idea')} type="radio" />新想法</label><label><input checked={continueMode === 'comment'} name={`detail-record-mode-${entry.id}`} onChange={() => setContinueMode('comment')} type="radio" />评论这条想法</label></fieldset>{continueMode === 'comment' && <p>评论「{entry.title}」</p>}<label>从这里继续内容<textarea aria-label="从这里继续内容" value={continueDraft} onChange={(event) => setContinueDraft(event.target.value)} /></label><button className="primary-button" disabled={!continueDraft.trim()} onClick={saveContinuation} type="button">保存记录</button></section>}{continueMessage && <p className="toast-message">{continueMessage}</p>}<div className="side-actions"><button className="secondary-button" onClick={() => setIsContinuing(true)} type="button">从这里继续</button></div></aside>;
}

function TimelineEntry({ entry, entries, onDeleteEntry, onUpdateEntry }: { entry: Entry; entries: Entry[]; onDeleteEntry?: (entryId: string) => Promise<boolean>; onUpdateEntry?: (entryId: string, content: string) => Promise<boolean> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(entry.body);
  const replies = entries.filter((candidate) => candidate.extendsId === entry.id);
  const truncatedTitle = entry.title.endsWith('…') && entry.body.startsWith(entry.title.slice(0, -1));

  async function save() {
    const content = draft.trim();
    if (!content || !onUpdateEntry || !await onUpdateEntry(entry.id, content)) return;
    setIsEditing(false);
  }

  async function remove() {
    if (!onDeleteEntry || !window.confirm(`删除“${entry.title}”？此操作无法撤销。`)) return;
    await onDeleteEntry(entry.id);
  }

  return <article aria-label={entry.title} className={entry.extendsId ? 'timeline-entry comment-entry' : 'timeline-entry'}><time>{entry.date} {entry.time}</time><Badge>{entry.type}</Badge>{isEditing ? <div className="timeline-editor"><textarea aria-label={`编辑${entry.title}`} value={draft} onChange={(event) => setDraft(event.target.value)} /><div><button aria-label={`保存${entry.title}`} onClick={save} type="button">保存</button><button onClick={() => { setDraft(entry.body); setIsEditing(false); }} type="button">取消</button></div></div> : <>{!truncatedTitle && <strong>{entry.title}</strong>}{(truncatedTitle || entry.body !== entry.title) && <p>{entry.body}</p>}{entry.source && <span className="source-pill">来源：{entry.source}</span>}{onUpdateEntry && onDeleteEntry && <div className="timeline-actions"><button aria-label={`编辑${entry.title}`} onClick={() => setIsEditing(true)} type="button">编辑</button><button aria-label={`删除${entry.title}`} onClick={remove} type="button">删除</button></div>}</>}{replies.length > 0 && <div className="timeline-replies">{replies.map((reply) => <TimelineEntry entries={entries} entry={reply} key={reply.id} onDeleteEntry={onDeleteEntry} onUpdateEntry={onUpdateEntry} />)}</div>}</article>;
}

function EntryTimeline({ entries, ariaLabel, onDeleteEntry, onUpdateEntry }: { entries: Entry[]; ariaLabel: string; onDeleteEntry?: (entryId: string) => Promise<boolean>; onUpdateEntry?: (entryId: string, content: string) => Promise<boolean> }) {
  const entryIds = new Set(entries.map((entry) => entry.id));
  return <div className="entry-timeline" aria-label={ariaLabel}>{entries.filter((entry) => !entry.extendsId || !entryIds.has(entry.extendsId)).map((entry) => <TimelineEntry entries={entries} entry={entry} key={entry.id} onDeleteEntry={onDeleteEntry} onUpdateEntry={onUpdateEntry} />)}</div>;
}

function EntryList({ entries, threads, selectedEntryId, selectedEntryIds = [], onSelectEntry, onToggleEntry, compact = false }: { entries: Entry[]; threads: WorkThread[]; selectedEntryId: string; selectedEntryIds?: string[]; onSelectEntry: (id: string) => void; onToggleEntry?: (id: string) => void; compact?: boolean }) {
  const dateGroups = Array.from(new Set(entries.map((entry) => entry.date)));
  return <div className={compact ? 'entry-list compact' : 'entry-list'}>{dateGroups.map((date) => <section key={date}><h3>{date}</h3>{entries.filter((entry) => entry.date === date).map((entry) => <div className="entry-row-wrap" key={entry.id}>{onToggleEntry && <input aria-label={`选择${entry.title}`} checked={selectedEntryIds.includes(entry.id)} onChange={() => onToggleEntry(entry.id)} type="checkbox" />}<button className={entry.id === selectedEntryId ? 'entry-row selected' : 'entry-row'} onClick={() => onSelectEntry(entry.id)} type="button"><time>{entry.time}</time><span>{threads.find((thread) => thread.id === entry.threadId)?.name} · {entry.type}</span><strong>{entry.title}</strong>{!compact && <p>{entry.tags.map((tag) => `#${tag}`).join(' ')}</p>}<b>›</b></button></div>)}</section>)}</div>;
}

function PageHero({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="page-hero"><h1>{title}</h1><p>{subtitle}</p></header>;
}

function PanelTitle({ icon, title }: { icon: string; title: string }) {
  return <div className="panel-title"><span>{icon}</span><h2>{title}</h2></div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  const text = String(children);
  const tone = text.includes('问题') || text.includes('阻塞') || text.includes('待') || text.includes('暂停') ? 'warning' : text.includes('线索') || text.includes('探索中') ? 'info' : text.includes('方案') ? 'plan' : text.includes('记录') ? 'neutral' : 'success';
  return <span className={`badge ${tone}`}>{children}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) { return <p className="detail-row"><strong>{label}</strong><span>{value}</span></p>; }

export default App;

