import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { createIdea, formatIdeaTime, groupIdeasByDay, urlHost } from './ideas';
import { downloadIdeasExport } from './exportIdeas';
import { createServerIdea, deleteServerIdea, fetchServerIdeas, uploadImageToServer } from './api';
import { addIdea, deleteIdea, loadIdeas } from './ideaStorage';
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
  const [isLinkingIdeas, setIsLinkingIdeas] = useState(false);
  const [linkedIdeaIds, setLinkedIdeaIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'capture' | 'list'>('capture');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setIdeas(loadIdeas());
    fetchServerIdeas()
      .then((serverIdeas) => {
        setIdeas(serverIdeas);
      })
      .catch(() => {
        // Local fallback keeps the app usable during local static preview or network outages.
      });
  }, []);

  const groups = useMemo(() => groupIdeasByDay(ideas), [ideas]);
  const canSave = content.trim().length > 0 && !isSavingImage;

  async function handleImageChange(file: File | undefined) {
    if (!file) return;
    setIsSavingImage(true);
    try {
      try {
        const uploaded = await uploadImageToServer(file);
        setSourceContent(uploaded.url);
        setImageName(uploaded.fileName);
        setImagePreview(uploaded.url);
      } catch {
        const imageId = await saveImage(file);
        setSourceContent(imageId);
        setImageName(file.name);
        setImagePreview(URL.createObjectURL(file));
      }
      setSourceType('image');
    } finally {
      setIsSavingImage(false);
    }
  }

  async function handleSave() {
    if (!canSave) return;

    const source: IdeaSource | null = sourceContent.trim()
      ? sourceType === 'url'
        ? { type: 'url', content: sourceContent }
        : sourceType === 'text'
          ? { type: 'text', content: sourceContent }
          : { type: 'image', content: sourceContent, fileName: imageName || '截图' }
      : null;

    const localIdea = createIdea({ content, source, linkedIdeaIds });
    let savedIdeas: Idea[];
    try {
      const serverIdea = await createServerIdea({ content, source, linkedIdeaIds });
      savedIdeas = [serverIdea, ...ideas.filter((idea) => idea.id !== serverIdea.id)];
    } catch {
      savedIdeas = addIdea(localIdea);
    }
    setIdeas(savedIdeas);
    setContent('');
    setSourceContent('');
    setImagePreview('');
    setImageName('');
    setLinkedIdeaIds([]);
    setIsLinkingIdeas(false);
    setSourceType('url');
    setStatusMessage('保存成功，已放到想法列表。');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSave();
    }
  }

  const handleToggleLinkingIdeas = useCallback(() => {
    setIsLinkingIdeas((isOpen) => !isOpen);
  }, []);

  async function handleDeleteIdea(ideaId: string) {
    try {
      await deleteServerIdea(ideaId);
      setIdeas((currentIdeas) => currentIdeas.filter((idea) => idea.id !== ideaId));
    } catch {
      setIdeas(deleteIdea(ideaId));
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
          ideas={ideas}
          isLinkingIdeas={isLinkingIdeas}
          linkedIdeaIds={linkedIdeaIds}
          canSave={canSave}
          statusMessage={statusMessage}
          onContentChange={setContent}
          onSourceTypeChange={setSourceType}
          onSourceContentChange={setSourceContent}
          onToggleLinkingIdeas={handleToggleLinkingIdeas}
          onApplyLinkedIdeas={setLinkedIdeaIds}
          onImageChange={handleImageChange}
          onKeyDown={handleKeyDown}
          onSave={handleSave}
        />
      ) : (
        <TimelineView ideas={ideas} groups={groups} onDeleteIdea={(ideaId) => void handleDeleteIdea(ideaId)} />
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
  ideas: Idea[];
  isLinkingIdeas: boolean;
  linkedIdeaIds: string[];
  canSave: boolean;
  statusMessage: string;
  onContentChange: (value: string) => void;
  onSourceTypeChange: (type: SourceType) => void;
  onSourceContentChange: (value: string) => void;
  onToggleLinkingIdeas: () => void;
  onApplyLinkedIdeas: (ideaIds: string[]) => void;
  onImageChange: (file: File | undefined) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSave: () => void | Promise<void>;
}

function CaptureView({
  content,
  sourceType,
  sourceContent,
  imageName,
  imagePreview,
  ideas,
  isLinkingIdeas,
  linkedIdeaIds,
  canSave,
  statusMessage,
  onContentChange,
  onSourceTypeChange,
  onSourceContentChange,
  onToggleLinkingIdeas,
  onApplyLinkedIdeas,
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
        <span className="hint">链接、图片、文字三选一；也可添加引用</span>
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
        <section className="link-picker" aria-label="引用想法">
          <button className="link-picker-toggle" onClick={onToggleLinkingIdeas} type="button">
            + 引用{linkedIdeaIds.length ? `（${linkedIdeaIds.length}）` : ''}
          </button>
          {isLinkingIdeas && (
            <LinkPickerModal
              ideas={ideas}
              initialLinkedIdeaIds={linkedIdeaIds}
              onApply={onApplyLinkedIdeas}
              onClose={onToggleLinkingIdeas}
            />
          )}
        </section>
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
        <button className="save-button" disabled={!canSave} onClick={() => void onSave()} type="button">
          保存想法
        </button>
      </div>
      {statusMessage && <p className="status-message">{statusMessage}</p>}
    </section>
  );
}

interface LinkPickerModalProps {
  ideas: Idea[];
  initialLinkedIdeaIds: string[];
  onApply: (ideaIds: string[]) => void;
  onClose: () => void;
}

function LinkPickerModal({ ideas, initialLinkedIdeaIds, onApply, onClose }: LinkPickerModalProps) {
  const selectedIdsRef = useRef(new Set(initialLinkedIdeaIds));
  const countRef = useRef<HTMLSpanElement>(null);

  function updateCountLabel() {
    if (!countRef.current) return;
    const selectedCount = selectedIdsRef.current.size;
    countRef.current.textContent = selectedCount ? `已选择 ${selectedCount} 条` : '勾选后，这条新想法会连接到已有想法。';
  }

  function handleLocalToggle(ideaId: string, checked: boolean) {
    if (checked) {
      selectedIdsRef.current.add(ideaId);
    } else {
      selectedIdsRef.current.delete(ideaId);
    }
    updateCountLabel();
  }

  function handleDone() {
    onApply(Array.from(selectedIdsRef.current));
    onClose();
  }

  return (
    <div className="link-modal" role="dialog" aria-modal="true" aria-label="选择引用想法">
      <button className="link-modal-backdrop" aria-label="关闭引用选择" onClick={onClose} type="button" />
      <div className="link-modal-content">
        <div className="link-modal-header">
          <div>
            <h2>选择引用想法</h2>
            <p><span ref={countRef}>{initialLinkedIdeaIds.length ? `已选择 ${initialLinkedIdeaIds.length} 条` : '勾选后，这条新想法会连接到已有想法。'}</span></p>
          </div>
          <button className="link-modal-close" onClick={handleDone} type="button">
            确定引用
          </button>
        </div>
        <div className="link-picker-list">
          {ideas.length === 0 ? (
            <span className="hint">暂无可引用的想法</span>
          ) : (
            ideas.map((idea) => (
              <label className="link-picker-item" key={idea.id}>
                <input
                  aria-label={`引用想法：${idea.content}`}
                  defaultChecked={selectedIdsRef.current.has(idea.id)}
                  onChange={(event) => handleLocalToggle(idea.id, event.target.checked)}
                  type="checkbox"
                />
                <span>{idea.content}</span>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineView({
  ideas,
  groups,
  onDeleteIdea,
}: {
  ideas: Idea[];
  groups: ReturnType<typeof groupIdeasByDay>;
  onDeleteIdea: (ideaId: string) => void;
}) {
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
        <div className="empty-state">还没有想法。回到记录页，写一句话就开始。</div>
      ) : (
        groups.map((group) => (
          <div className="day-group" key={group.label}>
            <h2>{group.label}</h2>
            {group.ideas.map((idea) => (
              <IdeaCard ideas={ideas} idea={idea} key={idea.id} onDelete={() => onDeleteIdea(idea.id)} />
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

function IdeaCard({ ideas, idea, onDelete }: { ideas: Idea[]; idea: Idea; onDelete: () => void }) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongIdea = idea.content.length > 120 || idea.content.includes('\n');
  const linkedIdeas = (idea.linkedIdeaIds ?? [])
    .map((linkedId) => ideas.find((candidate) => candidate.id === linkedId))
    .filter((linkedIdea): linkedIdea is Idea => Boolean(linkedIdea));

  return (
    <article className="idea-card" id={`idea-${idea.id}`}>
      <div className="idea-card-header">
        <time>{formatIdeaTime(idea.createdAt)}</time>
        {isConfirmingDelete ? (
          <span className="delete-confirm-actions" aria-label="确认删除">
            <button className="delete-confirm-button" onClick={onDelete} type="button" aria-label={`确认删除想法：${idea.content}`}>
              确认删除
            </button>
            <button className="delete-cancel-button" onClick={() => setIsConfirmingDelete(false)} type="button">
              取消
            </button>
          </span>
        ) : (
          <button className="delete-button" onClick={() => setIsConfirmingDelete(true)} type="button" aria-label={`删除想法：${idea.content}`}>
            删除
          </button>
        )}
      </div>
      <p className={`idea-content ${isLongIdea && !isExpanded ? 'idea-content-collapsed' : ''}`}>{idea.content}</p>
      {isLongIdea && (
        <button className="expand-idea-button" onClick={() => setIsExpanded((expanded) => !expanded)} type="button">
          {isExpanded ? '收起' : '展开全文'}
        </button>
      )}
      {linkedIdeas.length > 0 && (
        <div className="linked-ideas" aria-label="引用链">
          <span>引用</span>
          {linkedIdeas.map((linkedIdea) => (
            <a href={`#idea-${linkedIdea.id}`} key={linkedIdea.id}>
              {linkedIdea.content}
            </a>
          ))}
        </div>
      )}
      {idea.source && <SourcePreview source={idea.source} />}
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
  const [previewUrl, setPreviewUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (source.content.startsWith('/')) {
      setPreviewUrl(source.content);
      return undefined;
    }

    let objectUrl = '';
    getImage(source.content).then((file) => {
      if (!file) return;
      objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, source.content]);

  return (
    <div className="source-preview image-source">
      <button className="image-open-button" onClick={() => setIsOpen(true)} type="button">
        🖼 查看图片
      </button>
      <small>{source.fileName || source.content}</small>
      {isOpen && (
        <div className="image-modal" role="dialog" aria-modal="true" aria-label={source.fileName || '截图预览'}>
          <button className="image-modal-backdrop" onClick={() => setIsOpen(false)} type="button" aria-label="关闭图片预览" />
          <div className="image-modal-content">
            <button className="image-modal-close" onClick={() => setIsOpen(false)} type="button">
              关闭
            </button>
            {previewUrl ? <img src={previewUrl} alt={source.fileName || '截图'} /> : <span>正在加载图片...</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
