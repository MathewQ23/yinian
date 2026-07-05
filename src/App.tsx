import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { createIdea, formatIdeaTime, groupIdeasByDay, urlHost } from './ideas';
import { downloadIdeasExport } from './exportIdeas';
import { addIdea, loadIdeas } from './ideaStorage';
import { getImage, saveImage } from './imageStore';
import type { Idea, IdeaSource, SourceType } from './types';

function App() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [content, setContent] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('url');
  const [sourceContent, setSourceContent] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageName, setImageName] = useState('');
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [activeView, setActiveView] = useState<'capture' | 'list'>('capture');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setIdeas(loadIdeas());
  }, []);

  const groups = useMemo(() => groupIdeasByDay(ideas), [ideas]);
  const canSave = content.trim().length > 0 && sourceContent.trim().length > 0 && !isSavingImage;

  async function handleImageChange(file: File | undefined) {
    if (!file) return;
    setIsSavingImage(true);
    try {
      const imageId = await saveImage(file);
      setSourceContent(imageId);
      setImageName(file.name);
      setImagePreview(URL.createObjectURL(file));
      setSourceType('image');
    } finally {
      setIsSavingImage(false);
    }
  }

  function handleSave() {
    if (!canSave) return;

    const source: IdeaSource =
      sourceType === 'url'
        ? { type: 'url', content: sourceContent }
        : sourceType === 'text'
          ? { type: 'text', content: sourceContent }
          : { type: 'image', content: sourceContent, fileName: imageName || '截图' };

    const idea = createIdea({ content, source });
    setIdeas(addIdea(idea));
    setContent('');
    setSourceContent('');
    setImagePreview('');
    setImageName('');
    setSourceType('url');
    setStatusMessage('保存成功，已放到想法列表。');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">一念</p>
        <h1>记录想法，也记录它从哪里来</h1>
        <p className="subtitle">一个输入框，一个来源区域。先验证灵感闭环，不做收藏夹。</p>
        <nav className="app-nav" aria-label="主导航">
          <button aria-current={activeView === 'capture' ? 'page' : undefined} onClick={() => setActiveView('capture')} type="button">
            记录想法
          </button>
          <button aria-current={activeView === 'list' ? 'page' : undefined} onClick={() => setActiveView('list')} type="button">
            想法列表
          </button>
        </nav>
      </section>

      {activeView === 'capture' ? (
        <CaptureView
          content={content}
          sourceType={sourceType}
          sourceContent={sourceContent}
          imageName={imageName}
          imagePreview={imagePreview}
          canSave={canSave}
          statusMessage={statusMessage}
          onContentChange={setContent}
          onSourceTypeChange={setSourceType}
          onSourceContentChange={setSourceContent}
          onImageChange={handleImageChange}
          onKeyDown={handleKeyDown}
          onSave={handleSave}
        />
      ) : (
        <TimelineView ideas={ideas} groups={groups} />
      )}
    </main>
  );
}

interface CaptureViewProps {
  content: string;
  sourceType: SourceType;
  sourceContent: string;
  imageName: string;
  imagePreview: string;
  canSave: boolean;
  statusMessage: string;
  onContentChange: (value: string) => void;
  onSourceTypeChange: (type: SourceType) => void;
  onSourceContentChange: (value: string) => void;
  onImageChange: (file: File | undefined) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSave: () => void;
}

function CaptureView({
  content,
  sourceType,
  sourceContent,
  imageName,
  imagePreview,
  canSave,
  statusMessage,
  onContentChange,
  onSourceTypeChange,
  onSourceContentChange,
  onImageChange,
  onKeyDown,
  onSave,
}: CaptureViewProps) {
  return (
    <section className="composer" aria-label="记录想法">
      <label className="field-label" htmlFor="idea-content">
        此刻你在想什么？
      </label>
      <textarea
        id="idea-content"
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="写下一个突然出现的想法……"
        rows={5}
      />

      <div className="source-header">
        <span>来源</span>
        <span className="hint">链接、图片或一段文字，三选一即可</span>
      </div>

      <div className="source-tabs" role="group" aria-label="选择来源类型">
        <button className={sourceType === 'url' ? 'active' : ''} onClick={() => onSourceTypeChange('url')} type="button">
          + 链接
        </button>
        <label className={sourceType === 'image' ? 'upload active' : 'upload'}>
          + 图片
          <input type="file" accept="image/*" onChange={(event) => onImageChange(event.target.files?.[0])} />
        </label>
        <button className={sourceType === 'text' ? 'active' : ''} onClick={() => onSourceTypeChange('text')} type="button">
          + 文字
        </button>
      </div>

      <SourceInput
        sourceType={sourceType}
        sourceContent={sourceContent}
        imageName={imageName}
        imagePreview={imagePreview}
        onChange={onSourceContentChange}
      />

      <div className="composer-footer">
        <span>Ctrl + Enter 保存</span>
        <button className="save-button" disabled={!canSave} onClick={onSave} type="button">
          保存想法
        </button>
      </div>
      {statusMessage && <p className="status-message">{statusMessage}</p>}
    </section>
  );
}

function TimelineView({ ideas, groups }: { ideas: Idea[]; groups: ReturnType<typeof groupIdeasByDay> }) {
  return (
    <section className="timeline" aria-label="想法时间线">
      <div className="timeline-toolbar">
        <div>
          <h2>想法列表</h2>
          <p>本地保存，随时导出备份。</p>
        </div>
        <button className="export-button" disabled={ideas.length === 0} onClick={() => downloadIdeasExport(ideas)} type="button">
          导出 JSON
        </button>
      </div>
      {groups.length === 0 ? (
        <div className="empty-state">还没有想法。回到记录页，粘贴一个来源，写一句话就开始。</div>
      ) : (
        groups.map((group) => (
          <div className="day-group" key={group.label}>
            <h2>{group.label}</h2>
            {group.ideas.map((idea) => (
              <IdeaCard idea={idea} key={idea.id} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}

interface SourceInputProps {
  sourceType: SourceType;
  sourceContent: string;
  imageName: string;
  imagePreview: string;
  onChange: (value: string) => void;
}

function SourceInput({ sourceType, sourceContent, imageName, imagePreview, onChange }: SourceInputProps) {
  if (sourceType === 'url') {
    return (
      <label className="source-input">
        粘贴链接
        <input value={sourceContent} onChange={(event) => onChange(event.target.value)} placeholder="https://example.com/..." />
      </label>
    );
  }

  if (sourceType === 'text') {
    return (
      <label className="source-input">
        粘贴一段来源文字
        <textarea value={sourceContent} onChange={(event) => onChange(event.target.value)} placeholder="看到的一句话……" rows={3} />
      </label>
    );
  }

  return (
    <div className="image-preview-box">
      {imagePreview ? <img src={imagePreview} alt={imageName || '截图预览'} /> : <span>点击 + 图片 上传截图</span>}
      {imageName && <strong>{imageName}</strong>}
    </div>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <article className="idea-card">
      <time>{formatIdeaTime(idea.createdAt)}</time>
      <p className="idea-content">{idea.content}</p>
      <SourcePreview source={idea.source} />
    </article>
  );
}

function SourcePreview({ source }: { source: IdeaSource }) {
  if (source.type === 'url') {
    return (
      <div className="source-preview">
        <span>🔗 {urlHost(source.content)}</span>
        <small>{source.content}</small>
      </div>
    );
  }

  if (source.type === 'image') {
    return <ImageSourcePreview source={source} />;
  }

  return (
    <div className="source-preview quote-source">
      <span>📝</span>
      <blockquote>“{source.content}”</blockquote>
    </div>
  );
}

function ImageSourcePreview({ source }: { source: Extract<IdeaSource, { type: 'image' }> }) {
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    let objectUrl = '';
    getImage(source.content).then((file) => {
      if (!file) return;
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source.content]);

  return (
    <div className="source-preview image-source">
      {previewUrl ? <img src={previewUrl} alt={source.fileName || '截图'} /> : <span>🖼 [截图]</span>}
      <small>{source.fileName || source.content}</small>
    </div>
  );
}

export default App;
