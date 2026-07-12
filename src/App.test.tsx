import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { defaultEntries, defaultExploreItems, defaultThreads, type Entry, type ExploreItem, type WorkThread } from './productData';

type ApiState = { threads: WorkThread[]; entries: Entry[]; exploreItems: ExploreItem[] };
let apiState: ApiState;
let nextRequestError: string | null;
let requestLog: Array<{ method: string; path: string; body?: unknown }>;

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

function installProductApiMock() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), window.location.href).pathname.replace(/^\/api/, '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requestLog.push({ method, path, body });
    if (nextRequestError) {
      const message = nextRequestError;
      nextRequestError = null;
      return jsonResponse({ error: message }, 500);
    }
    if (path === '/migrations/local-storage') return jsonResponse({ safeToDeleteKeys: Object.keys(body ?? {}) });
    if (path === '/product/bootstrap') return jsonResponse(structuredClone(apiState));
    if (path === '/product/worklines' && method === 'POST') {
      const thread = { ...body.thread, id: `server-thread-${apiState.threads.length + 1}` } as WorkThread;
      const entry = { ...body.entry, threadId: thread.id, id: `server-entry-${apiState.entries.length + 1}` } as Entry;
      apiState.threads.unshift(thread); apiState.entries.unshift(entry);
      return jsonResponse({ thread, entry }, 201);
    }
    if (path === '/product/threads' && method === 'POST') {
      const thread = { ...body, id: `server-thread-${apiState.threads.length + 1}` } as WorkThread;
      apiState.threads.unshift(thread);
      return jsonResponse({ thread }, 201);
    }
    if (path === '/product/entries/batch-move' && method === 'POST') {
      let thread = apiState.threads.find((item) => item.id === body.threadId);
      if (body.thread) {
        thread = { ...body.thread, id: `server-thread-${apiState.threads.length + 1}` } as WorkThread;
        apiState.threads.unshift(thread);
      }
      apiState.entries = apiState.entries.map((entry) => body.entryIds.includes(entry.id) ? { ...entry, threadId: thread!.id } : entry);
      return jsonResponse({ thread, entries: apiState.entries.filter((entry) => body.entryIds.includes(entry.id)) });
    }
    const threadMatch = path.match(/^\/product\/threads\/([^/]+)$/);
    if (threadMatch && method === 'PATCH') {
      const index = apiState.threads.findIndex((item) => item.id === decodeURIComponent(threadMatch[1]));
      apiState.threads[index] = { ...apiState.threads[index], ...body };
      return jsonResponse({ thread: apiState.threads[index] });
    }
    if (threadMatch && method === 'DELETE') {
      const id = decodeURIComponent(threadMatch[1]);
      apiState.threads = apiState.threads.filter((item) => item.id !== id);
      apiState.entries = apiState.entries.filter((item) => item.threadId !== id);
      apiState.exploreItems = apiState.exploreItems.map((item) => ({ ...item, linkedThreadIds: item.linkedThreadIds.filter((threadId) => threadId !== id) }));
      return jsonResponse({ deleted: true });
    }
    if (path === '/product/entries' && method === 'POST') {
      const entry = { ...body, id: `server-entry-${apiState.entries.length + 1}` } as Entry;
      apiState.entries.unshift(entry);
      return jsonResponse({ entry }, 201);
    }
    const entryMatch = path.match(/^\/product\/entries\/([^/]+)$/);
    if (entryMatch && method === 'PATCH') {
      const index = apiState.entries.findIndex((item) => item.id === decodeURIComponent(entryMatch[1]));
      apiState.entries[index] = { ...apiState.entries[index], ...body };
      return jsonResponse({ entry: apiState.entries[index] });
    }
    if (entryMatch && method === 'DELETE') {
      apiState.entries = apiState.entries.filter((item) => item.id !== decodeURIComponent(entryMatch[1]));
      return jsonResponse({ deleted: true });
    }
    const exploreMatch = path.match(/^\/product\/explore-items\/([^/]+)\/(status|notes|thread-link)$/);
    if (exploreMatch) {
      const index = apiState.exploreItems.findIndex((item) => item.id === decodeURIComponent(exploreMatch[1]));
      const current = apiState.exploreItems[index];
      if (exploreMatch[2] === 'status') apiState.exploreItems[index] = { ...current, status: body.status };
      if (exploreMatch[2] === 'notes') apiState.exploreItems[index] = { ...current, explorationNotes: [{ ...body, id: `server-note-${(current.explorationNotes?.length ?? 0) + 1}` }, ...(current.explorationNotes ?? [])] };
      if (exploreMatch[2] === 'thread-link') apiState.exploreItems[index] = { ...current, linkedThreadIds: body.linked ? [...new Set([...current.linkedThreadIds, body.threadId])] : current.linkedThreadIds.filter((id) => id !== body.threadId) };
      return jsonResponse({ exploreItem: apiState.exploreItems[index] });
    }
    return jsonResponse({ error: `Unhandled ${method} ${path}` }, 404);
  }));
}

async function renderApp() {
  const result = render(<App />);
  await screen.findByRole('heading', { name: /^(夜深了|上午好|中午好|下午好|晚上好)$/ });
  return result;
}

beforeEach(() => {
  apiState = structuredClone({ threads: defaultThreads, entries: defaultEntries, exploreItems: defaultExploreItems });
  nextRequestError = null;
  requestLog = [];
  window.localStorage.clear();
  installProductApiMock();
});

describe('Yinian six-page product shell', () => {
  it('stores the actual local time instead of the placeholder now', async () => {
    const user = userEvent.setup();
    const now = new Date();
    const expectedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await renderApp();

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '检查真实记录时间');
    await user.click(screen.getByRole('button', { name: '保存' }));

    const createRequest = requestLog.find(({ method, path }) => method === 'POST' && path === '/product/worklines');
    expect(createRequest).toBeDefined();
    const createdEntry = (createRequest!.body as { entry: Entry }).entry;
    expect(createdEntry.time).toBe(expectedTime);
    expect(createdEntry.time).not.toBe('现在');
  });

  it('uses the current local hour for the greeting and record time', async () => {
    const now = new Date();
    const expectedGreeting = now.getHours() < 6 ? '夜深了' : now.getHours() < 12 ? '上午好' : now.getHours() < 14 ? '中午好' : now.getHours() < 18 ? '下午好' : '晚上好';
    const expectedTime = `记录时间 ${now.getFullYear()} / ${String(now.getMonth() + 1).padStart(2, '0')} / ${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    render(<App />);

    expect(await screen.findByRole('heading', { name: expectedGreeting })).toBeInTheDocument();
    expect(screen.getByText(expectedTime)).toBeInTheDocument();
  });

  it('migrates legacy browser data before loading the SQLite bootstrap', async () => {
    window.localStorage.setItem('yinian.product.entries', JSON.stringify([defaultEntries[0]]));
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('正在加载');
    expect(await screen.findByRole('heading', { name: /^(夜深了|上午好|中午好|下午好|晚上好)$/ })).toBeInTheDocument();
    expect(requestLog.slice(0, 2).map(({ path }) => path)).toEqual(['/migrations/local-storage', '/product/bootstrap']);
    expect(window.localStorage.getItem('yinian.product.entries')).toBeNull();
  });

  it('shows a retryable bootstrap error instead of default product data', async () => {
    nextRequestError = 'offline';
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('加载失败');
    expect(screen.queryByText('一念产品')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByRole('heading', { name: /^(夜深了|上午好|中午好|下午好|晚上好)$/ })).toBeInTheDocument();
  });

  it('renders an empty SQLite bootstrap without crashing', async () => {
    apiState = { threads: [], entries: [], exploreItems: [] };
    render(<App />);
    expect(await screen.findByRole('heading', { name: /^(夜深了|上午好|中午好|下午好|晚上好)$/ })).toBeInTheDocument();
    expect(screen.getByLabelText('今日记录列表')).toBeEmptyDOMElement();
  });

  it('keeps a quick-record draft and reports the error when the API write fails', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /^(夜深了|上午好|中午好|下午好|晚上好)$/ });
    await user.type(screen.getByLabelText('刚刚发生了什么？'), '不能假装保存成功');
    nextRequestError = 'write failed';
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('保存失败');
    expect(screen.getByLabelText('刚刚发生了什么？')).toHaveValue('不能假装保存成功');
    expect(apiState.entries.some((entry) => entry.title === '不能假装保存成功')).toBe(false);
  });

  it('creates a new workline and its first entry from quick capture by default', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '设计一个更自然的想法入口');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByText(/已创建工作线/)).toHaveTextContent('设计一个更自然的想法入口');
    expect(requestLog.some(({ method, path }) => method === 'POST' && path === '/product/worklines')).toBe(true);
    expect(apiState.threads[0].name).toBe('设计一个更自然的想法入口');
    expect(apiState.entries[0]).toMatchObject({ threadId: apiState.threads[0].id, body: '设计一个更自然的想法入口' });
  });

  it('derives Today summary counts from SQLite bootstrap data', async () => {
    await renderApp();

    const overview = screen.getByLabelText('今日概览统计');
    expect(within(overview).getByText('活跃工作线').parentElement).toHaveTextContent('活跃工作线4');
    expect(within(overview).getByText('今日记录').parentElement).toHaveTextContent('今日记录8');
    expect(within(overview).getByText('今日问题').parentElement).toHaveTextContent('今日问题2');
    expect(within(overview).getByText('待探索').parentElement).toHaveTextContent('待探索2');
  });

  it('shows the Today workspace with quick capture, overview, active threads, records, and exploration queue', async () => {
    await renderApp();

    expect(screen.getByRole('button', { name: '今天' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: /^(夜深了|上午好|中午好|下午好|晚上好)$/ })).toBeInTheDocument();
    expect(screen.getByLabelText('刚刚发生了什么？')).toBeInTheDocument();
    expect(screen.getByText('今日概览')).toBeInTheDocument();
    expect(screen.getByText('继续推进')).toBeInTheDocument();
    expect(screen.getAllByText('一念产品').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: '今日记录' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '待探索' })).toBeInTheDocument();
    expect(screen.getByText('browser-harness')).toBeInTheDocument();
  });

  it('navigates across the four top-level pages and keeps the global quick record action visible', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '工作线' }));
    expect(screen.getByRole('button', { name: '工作线' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: '工作线' })).toBeInTheDocument();
    expect(screen.getByText('本周概况')).toBeInTheDocument();
    expect(screen.getByText('RoArm-M3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '待探索' }));
    expect(screen.getByRole('button', { name: '待探索' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: '待探索' })).toBeInTheDocument();
    expect(screen.getByText('探索详情')).toBeInTheDocument();
    expect(screen.getByText('加入工作线')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.getByRole('button', { name: '全部记录' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: '全部记录' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '记录详情' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /后续可以基于引用添加想法链条/ }));
    expect(screen.getByRole('dialog', { name: '记录详情' })).toBeInTheDocument();
    expect(screen.queryByText('关系概览')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭记录详情' }));
    expect(screen.queryByRole('dialog', { name: '记录详情' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: '+ 快速记录' })).toBeInTheDocument();
  });

  it('uses the global quick record action to return to Today and focus the composer', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '待探索' }));
    expect(screen.getByRole('heading', { name: '待探索' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ 快速记录' }));

    expect(screen.getByRole('button', { name: '今天' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: /^(夜深了|上午好|中午好|下午好|晚上好)$/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('刚刚发生了什么？')).toHaveFocus());
  });

  it('searches globally and opens a selected record result', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.type(screen.getByLabelText('搜索记录、工作线、来源'), '相机坐标');

    const results = screen.getByLabelText('搜索结果');
    expect(within(results).getByText('相机坐标无法直接映射到机械臂基座坐标')).toBeInTheDocument();
    await user.click(within(results).getByRole('button', { name: /相机坐标无法直接映射/ }));

    expect(screen.getByRole('button', { name: '全部记录' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: '全部记录' })).toBeInTheDocument();
    expect(screen.queryByLabelText('搜索结果')).not.toBeInTheDocument();
    expect(screen.getAllByText('相机坐标无法直接映射到机械臂基座坐标').length).toBeGreaterThan(0);
  });

  it('opens a workline progress detail without chain controls', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));

    expect(screen.getByText('工作线 / 一念产品')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '进展流' })).toBeInTheDocument();
    const datedEntry = screen.getByRole('article', { name: '一念还是要推出一个公网版' });
    expect(within(datedEntry).getByText('昨天 14:51')).toBeInTheDocument();
    expect(screen.queryByText('重新定义产品模型')).not.toBeInTheDocument();
    expect(screen.queryByText('完成产品信息架构并设计关键页面')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '当前状态' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '关键决定' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ 继续记录' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看链条' })).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: '链条' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '链条画布' })).not.toBeInTheDocument();
  });

  it('hides unsupported record actions instead of exposing inert buttons', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.queryByRole('button', { name: '加入线索' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /后续可以基于引用添加想法链条/ }));
    expect(screen.queryByRole('button', { name: '引用这个记录' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '加入链条' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制' })).toBeInTheDocument();
  });

  it('does not expose the removed chain canvas controls', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));
    expect(screen.queryByRole('button', { name: '链条' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('链条画布内容')).not.toBeInTheDocument();
  });

  it('derives workline summary and status tabs from SQLite bootstrap data', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: '工作线' }));

    const summary = screen.getByLabelText('工作线概况统计');
    expect(within(summary).getByText('活跃工作线').parentElement).toHaveTextContent('活跃工作线4');
    expect(within(summary).getByText('全部记录').parentElement).toHaveTextContent('全部记录12');
    expect(within(summary).getByText('未解决问题').parentElement).toHaveTextContent('未解决问题2');
    expect(within(summary).getByText('待推进下一步').parentElement).toHaveTextContent('待推进下一步6');
    expect(screen.getByText('6 条工作线')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '进行中 4' })).not.toBeInTheDocument();
  });

  it('derives each workline card counts from SQLite entries instead of seed counters', async () => {
    const user = userEvent.setup();
    apiState.entries = [
      { ...defaultEntries[0], id: 'live-1', threadId: 'yinian', type: '问题', source: '现场记录' },
      { ...defaultEntries[1], id: 'live-2', threadId: 'yinian', type: '进展', source: undefined },
      { ...defaultEntries[2], id: 'live-3', threadId: 'roarm', type: '问题', source: '标定文档' },
    ];
    await renderApp();
    await user.click(screen.getByRole('button', { name: '工作线' }));

    const yinianCard = screen.getByRole('article', { name: '一念产品统计' });
    expect(within(yinianCard).getByLabelText('工作线记录数')).toHaveTextContent('记录数 2');
    expect(within(yinianCard).getByLabelText('工作线问题数')).toHaveTextContent('问题数 1');
    expect(within(yinianCard).getByLabelText('工作线来源数')).toHaveTextContent('来源数 1');
  });

  it('creates and edits a workline through the SQLite API', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderApp();

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '+ 新建工作线' }));
    expect(screen.getByRole('dialog', { name: '新建工作线' })).toBeInTheDocument();
    expect(screen.getByLabelText('工作线名称')).toBeInTheDocument();
    expect(screen.queryByLabelText('当前阶段')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('下一步')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('描述')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('当前阻塞')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('工作线名称'), '真实持久化工作线');
    await user.click(screen.getByRole('button', { name: '保存工作线' }));

    expect(screen.getByText('真实持久化工作线')).toBeInTheDocument();
    const created = apiState.threads.find((thread) => thread.name === '真实持久化工作线')!;
    expect(created.stage).toBe('');
    expect(created.nextStep).toBe('');

    await user.click(screen.getByRole('button', { name: '编辑真实持久化工作线' }));
    await user.clear(screen.getByLabelText('工作线名称'));
    await user.type(screen.getByLabelText('工作线名称'), '重命名后的工作线');
    await user.click(screen.getByRole('button', { name: '保存工作线' }));
    unmount();

    await renderApp();
    await user.click(screen.getByRole('button', { name: '工作线' }));

    expect(screen.getByText('重命名后的工作线')).toBeInTheDocument();
    const renamed = apiState.threads.find((thread) => thread.name === '重命名后的工作线')!;
    expect(renamed.stage).toBe('');
    expect(renamed.nextStep).toBe('');
  });

  it('deletes a workline and its records through the SQLite API', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderApp();

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '删除一念产品' }));

    await waitFor(() => expect(screen.queryByRole('article', { name: '一念产品统计' })).not.toBeInTheDocument());
    expect(apiState.threads.some((thread) => thread.id === 'yinian')).toBe(false);
    expect(apiState.entries.some((entry) => entry.threadId === 'yinian')).toBe(false);
  });

  it('shows identical record title and body only once in the detail dialog', async () => {
    const user = userEvent.setup();
    apiState.entries = [{ ...defaultEntries[0], id: 'same-copy', title: 'heptabase笔记', body: 'heptabase笔记' }];
    await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: /heptabase笔记/ }));

    const dialog = screen.getByRole('dialog', { name: '记录详情' });
    expect(within(dialog).getAllByText('heptabase笔记')).toHaveLength(1);
  });

  it('shows an auto-truncated timeline title only once as full content', async () => {
    const user = userEvent.setup();
    apiState.threads = [defaultThreads[0]];
    apiState.entries = [{ ...defaultEntries[0], id: 'truncated', title: '目前视频流读取是单线程，读一帧，识别一帧…', body: '目前视频流读取是单线程，读一帧，识别一帧，串行，还没有用到多线程。' }];
    await renderApp();
    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));

    const record = screen.getByRole('article', { name: '目前视频流读取是单线程，读一帧，识别一帧…' });
    expect(within(record).queryByText('目前视频流读取是单线程，读一帧，识别一帧…')).not.toBeInTheDocument();
    expect(within(record).getByText('目前视频流读取是单线程，读一帧，识别一帧，串行，还没有用到多线程。')).toBeInTheDocument();
  });

  it('edits and deletes records directly in the workline progress stream', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderApp();
    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));

    await user.click(screen.getByRole('button', { name: '编辑后续可以基于引用添加想法链条' }));
    const editor = screen.getByLabelText('编辑后续可以基于引用添加想法链条');
    await user.clear(editor);
    await user.type(editor, '进展流里直接完成编辑');
    await user.click(screen.getByRole('button', { name: '保存后续可以基于引用添加想法链条' }));
    expect(screen.getByLabelText('进展流记录')).toHaveTextContent('进展流里直接完成编辑');
    expect(apiState.entries.find((entry) => entry.id === 'e15')?.title).toBe('进展流里直接完成编辑');

    await user.click(screen.getByRole('button', { name: '删除已部署到公网，且添加数据库' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: '已部署到公网，且添加数据库' })).not.toBeInTheDocument());
    expect(apiState.entries.some((entry) => entry.id === 'e14')).toBe(false);
  });

  it('keeps the workline continuation composer always visible and saves with Ctrl+Enter', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));

    expect(screen.getByLabelText('继续记录表单')).toBeInTheDocument();
    await user.type(screen.getByLabelText('记录内容'), '常驻输入框让持续追加更自然。{Control>}{Enter}{/Control}');

    expect(await screen.findByText('已保存到一念产品进展流。')).toBeInTheDocument();
    expect(screen.getByLabelText('进展流记录')).toHaveTextContent('常驻输入框让持续追加更自然。');
  });

  it('continues recording inside the current workline and stores the new entry through the API', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderApp();

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));
    await user.type(screen.getByLabelText('记录内容'), '继续记录：数据层拆分后先补筛选排序。');
    await user.click(screen.getByRole('button', { name: '保存到当前工作线' }));

    expect(screen.getByText('已保存到一念产品进展流。')).toBeInTheDocument();
    const progress = screen.getByLabelText('进展流记录');
    expect(progress).toHaveTextContent('继续记录：数据层拆分后先补筛选排序。');
    const parentEntry = within(progress).getByRole('article', { name: '已部署到公网，且添加数据库' });
    expect(within(parentEntry).getByRole('article', { name: '后续可以基于引用添加想法链条' })).toBeInTheDocument();
    expect(apiState.entries.some((entry) => entry.title.includes('继续记录：数据层拆分'))).toBe(true);
    unmount();

    await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));

    expect(screen.getByRole('button', { name: /一念产品 · 记录.*继续记录：数据层拆分后先补筛选排序/ })).toBeInTheDocument();
  });

  it('saves a comment on an existing workline idea', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));
    await user.click(screen.getByRole('radio', { name: '评论已有想法' }));
    await user.selectOptions(screen.getByLabelText('选择想法'), 'e15');
    await user.type(screen.getByLabelText('记录内容'), '这是对已有想法的评论。');
    await user.click(screen.getByRole('button', { name: '保存到当前工作线' }));
    expect(screen.getAllByText('这是对已有想法的评论。').length).toBeGreaterThan(0);
    expect(apiState.entries.some((entry) => entry.extendsId === 'e15')).toBe(true);
  });

  it('saves a new top-level idea without a parent', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));
    expect(screen.getByRole('radio', { name: '新想法' })).toBeChecked();
    expect(screen.queryByLabelText('选择想法')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('记录内容'), '一条独立的新想法。');
    await user.click(screen.getByRole('button', { name: '保存到当前工作线' }));
    expect(screen.getAllByText('一条独立的新想法。').length).toBeGreaterThan(0);
    expect(apiState.entries.find((entry) => entry.body === '一条独立的新想法。')?.extendsId).toBeUndefined();
  });

  it('filters all records by workline and type, clears filters, and shows the real result count', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.getByText('共 12 条记录')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'RoArm-M3 1' }));
    expect(screen.getByText('共 1 条记录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RoArm-M3 · 问题.*相机坐标无法直接映射/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /一念产品 · 进展.*后续可以基于引用添加想法链条/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '问题 2' }));
    expect(screen.getByText('共 1 条记录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RoArm-M3 · 问题.*相机坐标无法直接映射/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '清空' }));
    expect(screen.getByText('共 12 条记录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /一念产品 · 进展.*后续可以基于引用添加想法链条/ })).toBeInTheDocument();
  });

  it('selects records and batch moves them into a newly created workline', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));

    await user.click(screen.getByRole('checkbox', { name: '选择后续可以基于引用添加想法链条' }));
    await user.click(screen.getByRole('checkbox', { name: '选择已部署到公网，且添加数据库' }));
    await user.click(screen.getByRole('button', { name: '批量移动 2 条' }));
    await user.click(screen.getByRole('radio', { name: '新建工作线' }));
    await user.type(screen.getByLabelText('新工作线名称'), '产品演化');
    await user.click(screen.getByRole('button', { name: '确认移动' }));

    expect(apiState.threads.some((thread) => thread.name === '产品演化')).toBe(true);
    const target = apiState.threads.find((thread) => thread.name === '产品演化')!;
    expect(apiState.entries.filter((entry) => ['e14', 'e15'].includes(entry.id)).every((entry) => entry.threadId === target.id)).toBe(true);
    unmount();

    await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.getByRole('button', { name: '产品演化 2' })).toBeInTheDocument();
  });

  it('sorts all records by newest and oldest order', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: '最新' }));
    const newestRows = screen.getAllByRole('button', { name: / · .*›/ });
    expect(newestRows[0]).toHaveTextContent('在链条中标识当前节点和已验证节点');

    await user.click(screen.getByRole('button', { name: '最早' }));
    const oldestRows = screen.getAllByRole('button', { name: / · .*›/ });
    expect(oldestRows[0]).toHaveTextContent('一念还是要推出一个公网版');
    expect(oldestRows[oldestRows.length - 1]).toHaveTextContent('在链条中标识当前节点和已验证节点');
  });

  it('starts exploring an item, appends an exploration record, and stores the flow through the API', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderApp();

    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));
    await user.click(screen.getByRole('button', { name: '开始探索' }));

    expect(screen.getByText('状态已更新为探索中。')).toBeInTheDocument();
    expect(apiState.exploreItems.find((item) => item.id === 'browser-harness')?.status).toBe('探索中');

    await user.type(screen.getByLabelText('追加探索记录'), '试跑 demo，发现可以接入当前浏览器验证流程。');
    await user.click(screen.getByRole('button', { name: '保存探索记录' }));

    expect(screen.getByText('已追加探索记录。')).toBeInTheDocument();
    expect(screen.getByLabelText('探索记录')).toHaveTextContent('试跑 demo，发现可以接入当前浏览器验证流程。');
    expect(apiState.exploreItems.find((item) => item.id === 'browser-harness')?.explorationNotes?.[0].content).toContain('试跑 demo');
    unmount();

    await renderApp();
    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));

    expect(screen.getAllByText('探索中').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('探索记录')).toHaveTextContent('试跑 demo，发现可以接入当前浏览器验证流程。');
  });

  it('marks exploration items as verified, adopted, or dropped and stores the status through the API', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderApp();

    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));
    await user.click(screen.getByRole('button', { name: '标记已验证' }));

    expect(screen.getByText('状态已更新为已验证。')).toBeInTheDocument();
    expect(apiState.exploreItems.find((item) => item.id === 'browser-harness')?.status).toBe('已验证');

    await user.click(screen.getByRole('button', { name: '标记已采用' }));
    expect(screen.getByText('状态已更新为已采用。')).toBeInTheDocument();
    expect(apiState.exploreItems.find((item) => item.id === 'browser-harness')?.status).toBe('已采用');

    await user.click(screen.getByRole('button', { name: '放弃探索' }));
    expect(screen.getByText('状态已更新为放弃。')).toBeInTheDocument();
    expect(apiState.exploreItems.find((item) => item.id === 'browser-harness')?.status).toBe('放弃');
    unmount();

    await renderApp();
    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));

    expect(screen.getAllByText('放弃').length).toBeGreaterThan(0);
  });

  it('adds an exploration item to a selected workline and stores the link through the API', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderApp();

    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));
    await user.selectOptions(screen.getByLabelText('选择加入工作线'), 'roarm');
    await user.click(screen.getByRole('button', { name: '加入工作线' }));

    expect(screen.getByText('已加入 RoArm-M3。')).toBeInTheDocument();
    expect(screen.getAllByText('RoArm-M3').length).toBeGreaterThan(0);
    expect(apiState.exploreItems.find((item) => item.id === 'browser-harness')?.linkedThreadIds).toContain('roarm');
    unmount();

    await renderApp();
    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));

    expect(screen.getAllByText('RoArm-M3').length).toBeGreaterThan(0);
  });

  it('filters exploration items by status, workline, and source type with real counts', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '待探索' }));
    expect(screen.getByText('共 6 个待探索')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '待探索 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GitHub 项目 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF 翻译 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '待探索 2' }));
    expect(screen.getByText('共 2 个待探索')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browser-harness/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /GSAP Skills/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'PDF 翻译 2' }));
    expect(screen.getByText('共 2 个待探索')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF Layout Parser/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browser-harness/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'GitHub 项目 2' }));
    expect(screen.getByText('共 2 个待探索')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eye-to-Hand Calibration/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '清空筛选' }));
    expect(screen.getByText('共 6 个待探索')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GSAP Skills/ })).toBeInTheDocument();
  });

  it('renders the workline picker as a large easy-to-click control', async () => {
    await renderApp();

    const picker = screen.getByRole('button', { name: '选择工作线' });
    expect(picker).toHaveClass('workline-picker-trigger');
    expect(picker).toHaveStyle({ minHeight: '56px', fontSize: '15px' });
  });

  it('opens a styled workline menu and selects an option', async () => {
    const user = userEvent.setup();
    await renderApp();

    const trigger = screen.getByRole('button', { name: '选择工作线' });
    expect(trigger).toHaveClass('workline-picker-trigger');
    await user.click(trigger);
    const menu = screen.getByRole('listbox', { name: '工作线选项' });
    expect(menu).toHaveClass('workline-picker-menu');
    await user.click(within(menu).getByRole('option', { name: /RoArm-M3/ }));
    expect(trigger).toHaveTextContent('RoArm-M3');
    expect(screen.queryByRole('listbox', { name: '工作线选项' })).not.toBeInTheDocument();
  });

  it('uses one save action: new idea by default and append after selecting a workline', async () => {
    const user = userEvent.setup();
    await renderApp();

    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存为新想法' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '追加到已有工作线' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择工作线' })).toHaveTextContent('新想法');

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '默认创建一条新工作线');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(requestLog.some(({ method, path }) => method === 'POST' && path === '/product/worklines')).toBe(true);

    await user.click(screen.getByRole('button', { name: '选择工作线' }));
    await user.click(screen.getByRole('option', { name: /RoArm-M3/ }));
    await user.type(screen.getByLabelText('刚刚发生了什么？'), '选择后追加到机械臂工作线');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(requestLog.some(({ method, path, body }) => method === 'POST' && path === '/product/entries' && (body as Entry).threadId === 'roarm')).toBe(true);
  });

  it('keeps capture frictionless without asking users to classify record types', async () => {
    const user = userEvent.setup();
    await renderApp();

    expect(screen.queryByLabelText('选择类型')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));
    expect(screen.queryByLabelText('继续记录类型')).not.toBeInTheDocument();
  });

  it('shows a single save action instead of separate new and append buttons', async () => {
    await renderApp();

    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存为新想法' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '追加到已有工作线' })).not.toBeInTheDocument();
  });

  it('adds a quick record to Today and All Records without requiring classification', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '新想法：先把六个页面跑通。');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText(/已创建工作线/)).toBeInTheDocument();
    const todayRecords = screen.getByLabelText('今日记录列表');
    expect(within(todayRecords).getByText('新想法：先把六个页面跑通。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.getAllByText('新想法：先把六个页面跑通。').length).toBeGreaterThan(0);
  });

  it('saves quick records with Ctrl+Enter from the composer', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '用快捷键保存当前记录。{Control>}{Enter}{/Control}');

    expect(screen.getByText('已创建工作线「用快捷键保存当前记录。」。')).toBeInTheDocument();
    const todayRecords = screen.getByLabelText('今日记录列表');
    expect(within(todayRecords).getByText('用快捷键保存当前记录。')).toBeInTheDocument();
  });

  it('appends quick records to a selected workline without classification', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.selectOptions(screen.getByLabelText('选择工作线原生值'), 'roarm');
    await user.type(screen.getByLabelText('刚刚发生了什么？'), '标定板需要重新打印，当前角点识别不稳定。');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.getByRole('button', { name: /RoArm-M3 · 记录.*标定板需要重新打印/ })).toBeInTheDocument();
  });

  it('loads API-saved quick records across remounts', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderApp();

    await user.selectOptions(screen.getByLabelText('选择工作线原生值'), 'pdf');
    await user.type(screen.getByLabelText('刚刚发生了什么？'), 'PDF 翻译先保留 Worker 队列，再补人工校对入口。');
    await user.click(screen.getByRole('button', { name: '保存' }));
    unmount();

    await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));

    expect(screen.getByRole('button', { name: /PDF 翻译 · 记录.*PDF 翻译先保留 Worker 队列/ })).toBeInTheDocument();
  });

  it('shows optional source fields by default without an expand action', async () => {
    await renderApp();

    expect(screen.getByLabelText('选择来源类型')).toBeInTheDocument();
    expect(screen.getByLabelText('来源内容')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ 来源' })).not.toBeInTheDocument();
  });

  it('saves an optional source with a quick record', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.selectOptions(screen.getByLabelText('选择来源类型'), '链接');
    await user.type(screen.getByLabelText('来源内容'), 'https://example.com/calibration-notes');
    await user.type(screen.getByLabelText('刚刚发生了什么？'), '标定资料需要归档到机械臂工作线。');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('checkbox', { name: '选择标定资料需要归档到机械臂工作线。' }).parentElement!.querySelector('button')!);

    expect(screen.getByText('来源：链接 · https://example.com/calibration-notes')).toBeInTheDocument();
  });

  it('deletes an API-saved quick record from all records and SQLite', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '这条记录稍后要删除。');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await user.click(screen.getByRole('button', { name: '全部记录' }));

    expect(screen.getAllByText('这条记录稍后要删除。').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('checkbox', { name: '选择这条记录稍后要删除。' }).parentElement!.querySelector('button')!);
    await user.click(screen.getByRole('button', { name: '删除' }));

    expect(screen.queryByText('这条记录稍后要删除。')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('yinian.product.savedEntries') ?? '').not.toContain('这条记录稍后要删除。');
  });

  it('moves a record to another workline through the SQLite API', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderApp();

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: /一念产品 · 进展.*后续可以基于引用添加想法链条/ }));
    await user.click(screen.getByRole('button', { name: '移动到工作线' }));
    await user.selectOptions(screen.getByLabelText('目标工作线'), 'roarm');
    await user.click(screen.getByRole('button', { name: '确认移动' }));

    expect(await screen.findByText('已移动到 RoArm-M3。')).toBeInTheDocument();
    expect(apiState.entries.find((entry) => entry.id === 'e15')?.threadId).toBe('roarm');
    unmount();

    await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.getByRole('button', { name: /RoArm-M3 · 进展.*后续可以基于引用添加想法链条/ })).toBeInTheDocument();
  });

  it('edits an API-saved quick record and stores the change', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '这条记录需要编辑。');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await user.click(screen.getByRole('button', { name: '全部记录' }));

    await user.click(screen.getByRole('checkbox', { name: '选择这条记录需要编辑。' }).parentElement!.querySelector('button')!);
    await user.click(screen.getByRole('button', { name: '编辑' }));
    await user.clear(screen.getByLabelText('编辑记录内容'));
    await user.type(screen.getByLabelText('编辑记录内容'), '这条记录已经编辑完成。');
    await user.click(screen.getByRole('button', { name: '保存编辑' }));

    expect(screen.queryByText('这条记录需要编辑。')).not.toBeInTheDocument();
    expect(screen.getAllByText('这条记录已经编辑完成。').length).toBeGreaterThan(0);
    expect(apiState.entries.some((entry) => entry.title === '这条记录已经编辑完成。')).toBe(true);
  });

  it('copies the selected record body to the clipboard with feedback', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: /单一链条无法表达多条工作同时推进/ }));
    await user.click(screen.getByRole('button', { name: '复制' }));

    expect(writeText).toHaveBeenCalledWith('发现单一链条无法表达多条工作同时推进，需要 Thread 作为一级实体。');
    expect(await screen.findByText('已复制记录内容。')).toBeInTheDocument();
  });

  it('omits internal relation counters from record details', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: /单一链条无法表达多条工作同时推进/ }));

    expect(screen.queryByText('关系概览')).not.toBeInTheDocument();
    expect(screen.queryByText('上游')).not.toBeInTheDocument();
    expect(screen.queryByText('直接延伸')).not.toBeInTheDocument();
    expect(screen.queryByText('相关记录')).not.toBeInTheDocument();
  });

  it('creates a comment directly from a concrete record', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: /一念产品 · 进展.*后续可以基于引用添加想法链条/ }));
    await user.click(screen.getByRole('button', { name: '从这里继续' }));
    await user.click(screen.getByRole('radio', { name: '评论这条想法' }));
    expect(screen.getByText(/评论「后续可以基于引用添加想法链条」/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('从这里继续内容'), '明确从这条记录发展出的新判断。');
    await user.click(screen.getByRole('button', { name: '保存记录' }));

    expect(await screen.findByText('评论已保存。')).toBeInTheDocument();
    expect(apiState.entries[0]).toMatchObject({ threadId: 'yinian', extendsId: 'e15', body: '明确从这条记录发展出的新判断。' });
  });

  it('creates a top-level idea from a concrete record without extendsId', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: /后续可以基于引用添加想法链条/ }));
    await user.click(screen.getByRole('button', { name: '从这里继续' }));
    expect(screen.getByRole('radio', { name: '新想法' })).toBeChecked();
    await user.type(screen.getByLabelText('从这里继续内容'), '从详情创建的独立想法。');
    await user.click(screen.getByRole('button', { name: '保存记录' }));
    expect(apiState.entries[0]).toMatchObject({ threadId: 'yinian', body: '从详情创建的独立想法。' });
    expect(apiState.entries[0].extendsId).toBeUndefined();
  });

  it('does not show a chain action in the selected all-record detail', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: /相机坐标无法直接映射/ }));
    expect(screen.queryByRole('button', { name: '查看链条' })).not.toBeInTheDocument();
  });
});
