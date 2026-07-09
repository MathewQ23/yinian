import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Yinian six-page product shell', () => {
  it('shows the Today workspace with quick capture, overview, active threads, records, and exploration queue', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: '今天' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: '晚上好' })).toBeInTheDocument();
    expect(screen.getByLabelText('刚刚发生了什么？')).toBeInTheDocument();
    expect(screen.getByText('今日概览')).toBeInTheDocument();
    expect(screen.getByText('继续推进')).toBeInTheDocument();
    expect(screen.getAllByText('一念产品').length).toBeGreaterThan(0);
    expect(screen.getByText('今日记录')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '待探索' })).toBeInTheDocument();
    expect(screen.getByText('browser-harness')).toBeInTheDocument();
  });

  it('navigates across the four top-level pages and keeps the global quick record action visible', async () => {
    const user = userEvent.setup();
    render(<App />);

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
    expect(screen.getByText('记录详情')).toBeInTheDocument();
    expect(screen.getByText('关系概览')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '+ 快速记录' })).toBeInTheDocument();
  });

  it('uses the global quick record action to return to Today and focus the composer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '待探索' }));
    expect(screen.getByRole('heading', { name: '待探索' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ 快速记录' }));

    expect(screen.getByRole('button', { name: '今天' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: '晚上好' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('刚刚发生了什么？')).toHaveFocus());
  });

  it('searches globally and opens a selected record result', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('搜索记录、工作线、来源'), '相机坐标');

    const results = screen.getByLabelText('搜索结果');
    expect(within(results).getByText('相机坐标无法直接映射到机械臂基座坐标')).toBeInTheDocument();
    await user.click(within(results).getByRole('button', { name: /相机坐标无法直接映射/ }));

    expect(screen.getByRole('button', { name: '全部记录' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: '全部记录' })).toBeInTheDocument();
    expect(screen.queryByLabelText('搜索结果')).not.toBeInTheDocument();
    expect(screen.getAllByText('相机坐标无法直接映射到机械臂基座坐标').length).toBeGreaterThan(0);
  });

  it('opens a workline progress detail and switches to the chain canvas tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));

    expect(screen.getByText('工作线 / 一念产品')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '进展流' })).toBeInTheDocument();
    expect(screen.getByText('关键决定')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '链条' }));
    expect(screen.getByRole('heading', { name: '链条画布' })).toBeInTheDocument();
    expect(screen.getByText('记录详情')).toBeInTheDocument();
    expect(screen.getByText('引用这个记录')).toBeInTheDocument();
    expect(screen.getByText('延伸')).toBeInTheDocument();
  });

  it('creates and edits a workline with local persistence', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '+ 新建工作线' }));
    await user.type(screen.getByLabelText('工作线名称'), '真实持久化工作线');
    await user.type(screen.getByLabelText('当前阶段'), '搭建数据层');
    await user.type(screen.getByLabelText('下一步'), '接入编辑表单');
    await user.click(screen.getByRole('button', { name: '保存工作线' }));

    expect(screen.getByText('真实持久化工作线')).toBeInTheDocument();
    expect(screen.getByText(/搭建数据层/)).toBeInTheDocument();
    expect(window.localStorage.getItem('yinian.product.threads') ?? '').toContain('真实持久化工作线');

    await user.click(screen.getByRole('button', { name: '编辑真实持久化工作线' }));
    await user.clear(screen.getByLabelText('下一步'));
    await user.type(screen.getByLabelText('下一步'), '验证刷新后仍然存在');
    await user.click(screen.getByRole('button', { name: '保存工作线' }));
    unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: '工作线' }));

    expect(screen.getByText('真实持久化工作线')).toBeInTheDocument();
    expect(screen.getByText('验证刷新后仍然存在')).toBeInTheDocument();
  });

  it('continues recording inside the current workline and persists the new entry', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));
    await user.click(screen.getByRole('button', { name: '+ 继续记录' }));
    await user.selectOptions(screen.getByLabelText('继续记录类型'), '决策');
    await user.type(screen.getByLabelText('继续记录内容'), '继续记录：数据层拆分后先补筛选排序。');
    await user.click(screen.getByRole('button', { name: '保存到当前工作线' }));

    expect(screen.getByText('已保存到一念产品进展流。')).toBeInTheDocument();
    expect(screen.getByLabelText('进展流记录')).toHaveTextContent('继续记录：数据层拆分后先补筛选排序。');
    expect(window.localStorage.getItem('yinian.product.entries') ?? '').toContain('继续记录：数据层拆分后先补筛选排序。');
    unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: '全部记录' }));

    expect(screen.getByRole('button', { name: /一念产品 · 决策.*继续记录：数据层拆分后先补筛选排序/ })).toBeInTheDocument();
  });

  it('extends the current record when continuing a workline and shows the new node on the chain canvas', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));
    await user.click(screen.getByRole('button', { name: '+ 继续记录' }));
    await user.click(screen.getByLabelText('延伸当前记录'));
    await user.type(screen.getByLabelText('继续记录内容'), '从当前节点延伸出的链条记录。');
    await user.click(screen.getByRole('button', { name: '保存到当前工作线' }));
    await user.click(screen.getByRole('button', { name: '查看链条' }));

    expect(screen.getByRole('heading', { name: '链条画布' })).toBeInTheDocument();
    expect(screen.getAllByText('从当前节点延伸出的链条记录。').length).toBeGreaterThan(0);
    expect(screen.getAllByText('延伸自 #15').length).toBeGreaterThan(0);
    expect(window.localStorage.getItem('yinian.product.entries') ?? '').toContain('"extendsId":"e15"');
  });

  it('extends a selected workline record when continuing instead of only the current record', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '工作线' }));
    await user.click(screen.getByRole('button', { name: '查看一念产品详情' }));
    await user.click(screen.getByRole('button', { name: '+ 继续记录' }));
    await user.selectOptions(screen.getByLabelText('选择延伸对象'), 'e14');
    await user.type(screen.getByLabelText('继续记录内容'), '从指定历史记录延伸，而不是当前选中记录。');
    await user.click(screen.getByRole('button', { name: '保存到当前工作线' }));
    await user.click(screen.getByRole('button', { name: '查看链条' }));

    expect(screen.getAllByText('从指定历史记录延伸，而不是当前选中记录。').length).toBeGreaterThan(0);
    expect(screen.getAllByText('延伸自 #14').length).toBeGreaterThan(0);
    expect(window.localStorage.getItem('yinian.product.entries') ?? '').toContain('"extendsId":"e14"');
  });

  it('filters all records by workline and type, clears filters, and shows the real result count', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.getByText('共 12 条记录')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'RoArm-M3 1' }));
    expect(screen.getByText('共 1 条记录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RoArm-M3 · 问题.*相机坐标无法直接映射/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /一念产品 · 进展.*后续可以基于引用添加想法链条/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '问题 2' }));
    expect(screen.getByText('共 1 条记录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /RoArm-M3 · 问题.*相机坐标无法直接映射/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '清空筛选' }));
    expect(screen.getByText('共 12 条记录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /一念产品 · 进展.*后续可以基于引用添加想法链条/ })).toBeInTheDocument();
  });

  it('sorts all records by newest and oldest order', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: '最新' }));
    const newestRows = screen.getAllByRole('button', { name: / · .*›/ });
    expect(newestRows[0]).toHaveTextContent('在链条中标识当前节点和已验证节点');

    await user.click(screen.getByRole('button', { name: '最早' }));
    const oldestRows = screen.getAllByRole('button', { name: / · .*›/ });
    expect(oldestRows[0]).toHaveTextContent('一念还是要推出一个公网版');
    expect(oldestRows[oldestRows.length - 1]).toHaveTextContent('在链条中标识当前节点和已验证节点');
  });

  it('starts exploring an item, appends an exploration record, and persists the flow', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));
    await user.click(screen.getByRole('button', { name: '开始探索' }));

    expect(screen.getByText('状态已更新为探索中。')).toBeInTheDocument();
    expect(window.localStorage.getItem('yinian.product.exploreItems') ?? '').toContain('"status":"探索中"');

    await user.type(screen.getByLabelText('追加探索记录'), '试跑 demo，发现可以接入当前浏览器验证流程。');
    await user.click(screen.getByRole('button', { name: '保存探索记录' }));

    expect(screen.getByText('已追加探索记录。')).toBeInTheDocument();
    expect(screen.getByLabelText('探索记录')).toHaveTextContent('试跑 demo，发现可以接入当前浏览器验证流程。');
    expect(window.localStorage.getItem('yinian.product.exploreItems') ?? '').toContain('试跑 demo，发现可以接入当前浏览器验证流程。');
    unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));

    expect(screen.getAllByText('探索中').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('探索记录')).toHaveTextContent('试跑 demo，发现可以接入当前浏览器验证流程。');
  });

  it('marks exploration items as verified, adopted, or dropped and persists the status', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));
    await user.click(screen.getByRole('button', { name: '标记已验证' }));

    expect(screen.getByText('状态已更新为已验证。')).toBeInTheDocument();
    expect(window.localStorage.getItem('yinian.product.exploreItems') ?? '').toContain('"status":"已验证"');

    await user.click(screen.getByRole('button', { name: '标记已采用' }));
    expect(screen.getByText('状态已更新为已采用。')).toBeInTheDocument();
    expect(window.localStorage.getItem('yinian.product.exploreItems') ?? '').toContain('"status":"已采用"');

    await user.click(screen.getByRole('button', { name: '放弃探索' }));
    expect(screen.getByText('状态已更新为放弃。')).toBeInTheDocument();
    expect(window.localStorage.getItem('yinian.product.exploreItems') ?? '').toContain('"status":"放弃"');
    unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));

    expect(screen.getAllByText('放弃').length).toBeGreaterThan(0);
  });

  it('adds an exploration item to a selected workline and persists the link', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));
    await user.selectOptions(screen.getByLabelText('选择加入工作线'), 'roarm');
    await user.click(screen.getByRole('button', { name: '加入工作线' }));

    expect(screen.getByText('已加入 RoArm-M3。')).toBeInTheDocument();
    expect(screen.getAllByText('RoArm-M3').length).toBeGreaterThan(0);
    expect(window.localStorage.getItem('yinian.product.exploreItems') ?? '').toContain('roarm');
    unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: '待探索' }));
    await user.click(screen.getByRole('button', { name: /browser-harness/ }));

    expect(screen.getAllByText('RoArm-M3').length).toBeGreaterThan(0);
  });

  it('filters exploration items by status, workline, and source type with real counts', async () => {
    const user = userEvent.setup();
    render(<App />);

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

  it('adds a quick record to Today and All Records without requiring classification', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '新想法：先把六个页面跑通。');
    await user.click(screen.getByRole('button', { name: '保存 Ctrl+Enter' }));

    expect(screen.getByText('已保存到今日记录。')).toBeInTheDocument();
    const todayRecords = screen.getByLabelText('今日记录列表');
    expect(within(todayRecords).getByText('新想法：先把六个页面跑通。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.getAllByText('新想法：先把六个页面跑通。').length).toBeGreaterThan(0);
  });

  it('saves quick records with Ctrl+Enter from the composer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '用快捷键保存当前记录。{Control>}{Enter}{/Control}');

    expect(screen.getByText('已保存到今日记录。')).toBeInTheDocument();
    const todayRecords = screen.getByLabelText('今日记录列表');
    expect(within(todayRecords).getByText('用快捷键保存当前记录。')).toBeInTheDocument();
  });

  it('classifies quick records by workline and type before saving', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText('选择工作线'), 'roarm');
    await user.selectOptions(screen.getByLabelText('选择类型'), '问题');
    await user.type(screen.getByLabelText('刚刚发生了什么？'), '标定板需要重新打印，当前角点识别不稳定。');
    await user.click(screen.getByRole('button', { name: '保存 Ctrl+Enter' }));

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    expect(screen.getByRole('button', { name: /RoArm-M3 · 问题.*标定板需要重新打印/ })).toBeInTheDocument();
  });

  it('persists quick records in local storage across remounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.selectOptions(screen.getByLabelText('选择工作线'), 'pdf');
    await user.selectOptions(screen.getByLabelText('选择类型'), '决策');
    await user.type(screen.getByLabelText('刚刚发生了什么？'), 'PDF 翻译先保留 Worker 队列，再补人工校对入口。');
    await user.click(screen.getByRole('button', { name: '保存 Ctrl+Enter' }));
    unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: '全部记录' }));

    expect(screen.getByRole('button', { name: /PDF 翻译 · 决策.*PDF 翻译先保留 Worker 队列/ })).toBeInTheDocument();
  });

  it('saves an optional source with a quick record', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '+ 来源' }));
    await user.selectOptions(screen.getByLabelText('选择来源类型'), '链接');
    await user.type(screen.getByLabelText('来源内容'), 'https://example.com/calibration-notes');
    await user.type(screen.getByLabelText('刚刚发生了什么？'), '标定资料需要归档到机械臂工作线。');
    await user.click(screen.getByRole('button', { name: '保存 Ctrl+Enter' }));

    await user.click(screen.getByRole('button', { name: '全部记录' }));

    expect(screen.getByText('来源：链接 · https://example.com/calibration-notes')).toBeInTheDocument();
  });

  it('deletes a locally saved quick record from all records and storage', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '这条记录稍后要删除。');
    await user.click(screen.getByRole('button', { name: '保存 Ctrl+Enter' }));
    await user.click(screen.getByRole('button', { name: '全部记录' }));

    expect(screen.getAllByText('这条记录稍后要删除。').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '删除' }));

    expect(screen.queryByText('这条记录稍后要删除。')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('yinian.product.savedEntries') ?? '').not.toContain('这条记录稍后要删除。');
  });

  it('edits a locally saved quick record and persists the change', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('刚刚发生了什么？'), '这条记录需要编辑。');
    await user.click(screen.getByRole('button', { name: '保存 Ctrl+Enter' }));
    await user.click(screen.getByRole('button', { name: '全部记录' }));

    await user.click(screen.getByRole('button', { name: '编辑' }));
    await user.clear(screen.getByLabelText('编辑记录内容'));
    await user.type(screen.getByLabelText('编辑记录内容'), '这条记录已经编辑完成。');
    await user.click(screen.getByRole('button', { name: '保存编辑' }));

    expect(screen.queryByText('这条记录需要编辑。')).not.toBeInTheDocument();
    expect(screen.getAllByText('这条记录已经编辑完成。').length).toBeGreaterThan(0);
    expect(window.localStorage.getItem('yinian.product.entries') ?? '').toContain('这条记录已经编辑完成。');
  });

  it('opens the chain canvas from the selected all-record detail', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '全部记录' }));
    await user.click(screen.getByRole('button', { name: /相机坐标无法直接映射/ }));
    await user.click(screen.getByRole('button', { name: '查看链条' }));

    expect(screen.getByText('工作线 / RoArm-M3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '链条' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: '链条画布' })).toBeInTheDocument();
    expect(screen.getAllByText('相机坐标无法直接映射到机械臂基座坐标').length).toBeGreaterThan(0);
  });
});
