import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

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
    expect(screen.getByText('机械臂控制页面应该以模型为中心，而不是参数表格')).toBeInTheDocument();
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

    expect(screen.getByText('可以研究动态 UI。')).toBeInTheDocument();
    expect(screen.getByText('“Interfaces should adapt to context.”')).toBeInTheDocument();
    expect(screen.queryByText('标签')).not.toBeInTheDocument();
    expect(screen.queryByText('文件夹')).not.toBeInTheDocument();
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
    await user.type(screen.getByLabelText('粘贴链接'), 'https://example.com/export');
    await user.click(screen.getByRole('button', { name: '保存想法' }));
    await user.click(screen.getByRole('button', { name: '想法列表' }));
    await user.click(screen.getByRole('button', { name: '导出 JSON' }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  });

  it('keeps the saved list on a separate view with navigation back to capture', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole('button', { name: '记录想法' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: '想法列表' }));
    expect(screen.getByRole('button', { name: '想法列表' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByLabelText('此刻你在想什么？')).not.toBeInTheDocument();
    expect(screen.getByText('还没有想法。回到记录页，粘贴一个来源，写一句话就开始。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '记录想法' }));
    expect(screen.getByLabelText('此刻你在想什么？')).toBeInTheDocument();
  });
});
