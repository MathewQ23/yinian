import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

function expectIdeaContent(text: string) {
  expect(screen.getByText(text, { selector: '.idea-content' })).toBeInTheDocument();
}

describe('Yinian MVP app', () => {
  it('saves a url-sourced idea and shows it in today timeline', async () => {
    vi.setSystemTime(new Date('2026-07-05T22:36:00+08:00'));
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), '机械臂控制页面应该以模型为中心，而不是参数表格');
    await user.click(screen.getByRole('button', { name: '+ 链接' }));
    await user.type(screen.getByLabelText('粘贴链接'), 'https://youtube.com/watch?v=abc');
    await user.click(screen.getByRole('button', { name: '保存想法' }));

    expect(screen.getByText('保存成功，已放到想法列表。')).toBeInTheDocument();
    expect(screen.queryByText('今天')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '想法列表' }));

    expect(screen.getByText('今天')).toBeInTheDocument();
    expect(screen.getByText('22:36')).toBeInTheDocument();
    expectIdeaContent('机械臂控制页面应该以模型为中心，而不是参数表格');
    expect(screen.getByText((text) => text === '🔗 youtube.com')).toBeInTheDocument();
    expect(screen.getByText('https://youtube.com/watch?v=abc')).toBeInTheDocument();
  });

  it('supports a text source without forcing tags or folders', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), '可以研究动态 UI。');
    await user.click(screen.getByRole('button', { name: '+ 文字' }));
    await user.type(screen.getByLabelText('粘贴一段来源文字'), 'Interfaces should adapt to context.');
    await user.click(screen.getByRole('button', { name: '保存想法' }));
    await user.click(screen.getByRole('button', { name: '想法列表' }));

    expectIdeaContent('可以研究动态 UI。');
    expect(screen.getByText('“Interfaces should adapt to context.”')).toBeInTheDocument();
    expect(screen.queryByText('标签')).not.toBeInTheDocument();
    expect(screen.queryByText('文件夹')).not.toBeInTheDocument();
  });

  it('can link a new idea to an existing idea and shows the reference chain', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), '第一个想法：先记录问题。');
    await user.click(screen.getByRole('button', { name: '保存想法' }));

    await user.clear(screen.getByLabelText('此刻你在想什么？'));
    await user.type(screen.getByLabelText('此刻你在想什么？'), '第二个想法：补充解决路径。');
    await user.click(screen.getByRole('button', { name: '+ 引用' }));
    expect(screen.getByRole('dialog', { name: '选择引用想法' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '引用想法：第一个想法：先记录问题。' }));
    await user.click(screen.getByRole('button', { name: '确定引用' }));
    await user.click(screen.getByRole('button', { name: '保存想法' }));
    await user.click(screen.getByRole('button', { name: '想法列表' }));

    expectIdeaContent('第二个想法：补充解决路径。');
    expect(screen.getByText('引用')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '第一个想法：先记录问题。' }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows idea extension as a visual tree from the selected source idea', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), '源头：已部署到公网');
    await user.click(screen.getByRole('button', { name: '保存想法' }));

    await user.clear(screen.getByLabelText('此刻你在想什么？'));
    await user.type(screen.getByLabelText('此刻你在想什么？'), '延伸：添加想法链条');
    await user.click(screen.getByRole('button', { name: '+ 引用' }));
    await user.click(screen.getByRole('checkbox', { name: '引用想法：源头：已部署到公网' }));
    await user.click(screen.getByRole('button', { name: '确定引用' }));
    await user.click(screen.getByRole('button', { name: '保存想法' }));

    await user.clear(screen.getByLabelText('此刻你在想什么？'));
    await user.type(screen.getByLabelText('此刻你在想什么？'), '实践：修复空白页');
    await user.click(screen.getByRole('button', { name: '+ 引用' }));
    await user.click(screen.getByRole('checkbox', { name: '引用想法：延伸：添加想法链条' }));
    await user.click(screen.getByRole('button', { name: '确定引用' }));
    await user.click(screen.getByRole('button', { name: '保存想法' }));
    await user.click(screen.getByRole('button', { name: '想法列表' }));

    const rootGraph = screen.getByLabelText('延伸可视化：源头：已部署到公网');
    expect(within(rootGraph).getByText('源头：已部署到公网')).toBeInTheDocument();
    expect(within(rootGraph).getByText('延伸：添加想法链条')).toBeInTheDocument();
    expect(within(rootGraph).getByText('实践：修复空白页')).toBeInTheDocument();
    expect(within(rootGraph).getByText('延伸 2 个想法')).toBeInTheDocument();
  });

  it('shows a centralized chains page with every root idea extension tree', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), '源头：部署公网');
    await user.click(screen.getByRole('button', { name: '保存想法' }));

    await user.clear(screen.getByLabelText('此刻你在想什么？'));
    await user.type(screen.getByLabelText('此刻你在想什么？'), '延伸：接入数据库');
    await user.click(screen.getByRole('button', { name: '+ 引用' }));
    await user.click(screen.getByRole('checkbox', { name: '引用想法：源头：部署公网' }));
    await user.click(screen.getByRole('button', { name: '确定引用' }));
    await user.click(screen.getByRole('button', { name: '保存想法' }));

    await user.clear(screen.getByLabelText('此刻你在想什么？'));
    await user.type(screen.getByLabelText('此刻你在想什么？'), '独立想法：没有延伸');
    await user.click(screen.getByRole('button', { name: '保存想法' }));

    await user.click(screen.getByRole('button', { name: '想法链条' }));

    expect(screen.queryByLabelText('此刻你在想什么？')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '想法链条' })).toBeInTheDocument();
    expect(screen.getByText('集中查看每条想法如何继续长出后续分支。')).toBeInTheDocument();
    expect(screen.getByText('2 条根想法')).toBeInTheDocument();

    const sourceTree = screen.getByLabelText('集中链条：源头：部署公网');
    expect(within(sourceTree).getByText('源头：部署公网')).toBeInTheDocument();
    expect(within(sourceTree).getByText('延伸：接入数据库')).toBeInTheDocument();
    expect(within(sourceTree).getByText('延伸 1 个想法')).toBeInTheDocument();

    const standaloneTree = screen.getByLabelText('集中链条：独立想法：没有延伸');
    expect(within(standaloneTree).getByText('暂无延伸')).toBeInTheDocument();
  });

  it('shows each referenced idea as a chain and lets practice extend its lifecycle', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), '看见一句关于长期主义的话。');
    await user.click(screen.getByRole('button', { name: '保存想法' }));

    await user.clear(screen.getByLabelText('此刻你在想什么？'));
    await user.type(screen.getByLabelText('此刻你在想什么？'), '把它实践成每周复盘。');
    await user.click(screen.getByRole('button', { name: '+ 引用' }));
    await user.click(screen.getByRole('checkbox', { name: '引用想法：看见一句关于长期主义的话。' }));
    await user.click(screen.getByRole('button', { name: '确定引用' }));
    await user.click(screen.getByRole('button', { name: '保存想法' }));
    await user.click(screen.getByRole('button', { name: '想法列表' }));

    expect(screen.queryByLabelText('想法链条：把它实践成每周复盘。')).not.toBeInTheDocument();
    expect(screen.getByLabelText('生命周期：把它实践成每周复盘。')).toBeInTheDocument();
    expect(screen.getAllByText('萌芽', { selector: '.lifecycle-panel-header strong' })).toHaveLength(2);

    await user.selectOptions(screen.getByLabelText('更新生命周期：把它实践成每周复盘。'), 'practicing');
    await user.type(screen.getByLabelText('实践记录：把它实践成每周复盘。'), '本周先写一次复盘模板');
    await user.click(screen.getByRole('button', { name: '添加实践记录：把它实践成每周复盘。' }));

    expect(screen.getByText('实践中', { selector: '.lifecycle-panel-header strong' })).toBeInTheDocument();
    expect(screen.getByText('本周先写一次复盘模板')).toBeInTheDocument();
  });

  it('exports current ideas as a JSON backup download', async () => {
    vi.setSystemTime(new Date('2026-07-05T23:20:00+08:00'));
    const user = userEvent.setup();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', { value: click });
      }
      return element;
    });

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), '可以先做导出，降低本地存储风险。');
    await user.click(screen.getByRole('button', { name: '保存想法' }));
    await user.click(screen.getByRole('button', { name: '想法列表' }));
    await user.click(screen.getByRole('button', { name: '导出 JSON' }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  });

  it('saves a plain idea without any source', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), '这只是一个突然冒出来的念头。');
    await user.click(screen.getByRole('button', { name: '保存想法' }));
    await user.click(screen.getByRole('button', { name: '想法列表' }));

    expectIdeaContent('这只是一个突然冒出来的念头。');
    expect(screen.queryByText('🔗')).not.toBeInTheDocument();
    expect(screen.queryByText('📝')).not.toBeInTheDocument();
  });

  it('collapses long ideas in the list and can expand them', async () => {
    const user = userEvent.setup();
    const longIdea = '这是一个很长的想法，默认不应该把整条内容全部撑开。'.repeat(8);

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), longIdea);
    await user.click(screen.getByRole('button', { name: '保存想法' }));
    await user.click(screen.getByRole('button', { name: '想法列表' }));

    const content = screen.getByText(longIdea, { selector: '.idea-content' });
    expect(content).toHaveClass('idea-content-collapsed');
    expect(screen.getByRole('button', { name: '展开全文' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '展开全文' }));
    expect(content).not.toHaveClass('idea-content-collapsed');
    expect(screen.getByRole('button', { name: '收起' })).toBeInTheDocument();
  });

  it('asks for confirmation before deleting an idea from the list', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText('此刻你在想什么？'), '这条想法之后要删掉。');
    await user.click(screen.getByRole('button', { name: '保存想法' }));
    await user.click(screen.getByRole('button', { name: '想法列表' }));
    await user.click(screen.getByRole('button', { name: '删除想法：这条想法之后要删掉。' }));

    expectIdeaContent('这条想法之后要删掉。');
    expect(screen.getByRole('button', { name: '确认删除想法：这条想法之后要删掉。' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('button', { name: '确认删除想法：这条想法之后要删掉。' })).not.toBeInTheDocument();
    expectIdeaContent('这条想法之后要删掉。');

    await user.click(screen.getByRole('button', { name: '删除想法：这条想法之后要删掉。' }));
    await user.click(screen.getByRole('button', { name: '确认删除想法：这条想法之后要删掉。' }));

    expect(screen.queryByText('这条想法之后要删掉。')).not.toBeInTheDocument();
    expect(screen.getByText('还没有想法。回到记录页，写一句话就开始。')).toBeInTheDocument();
  });

  it('keeps the saved list on a separate view with navigation back to capture', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole('button', { name: '记录想法' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: '想法列表' }));
    expect(screen.getByRole('button', { name: '想法列表' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByLabelText('此刻你在想什么？')).not.toBeInTheDocument();
    expect(screen.getByText('还没有想法。回到记录页，写一句话就开始。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '记录想法' }));
    expect(screen.getByLabelText('此刻你在想什么？')).toBeInTheDocument();
  });
});
