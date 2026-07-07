import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import './App.css';
import './design-system.css';
import { buildIdeaExtensionTree, countIdeaExtensionDescendants, createIdea, formatIdeaTime, groupIdeasByDay, lifecycleLabel, updateIdeaLifecycle, urlHost } from './ideas';
import { downloadIdeasExport } from './exportIdeas';
import { createServerIdea, deleteServerIdea, fetchServerIdeas, updateServerIdeaLifecycle, uploadImageToServer } from './api';
import { addIdea, deleteIdea, loadIdeas, updateIdea } from './ideaStorage';
import { getImage, saveImage } from './imageStore';
import type { Idea, IdeaExtensionNode, IdeaLifecycleStatus, IdeaSource, SourceType } from './types';

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
  const [activeView, setActiveView] = useState<'capture' | 'list' | 'chains'>('capture');
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

  function handleUpdateIdeaLifecycle(ideaId: string, status: IdeaLifecycleStatus, practiceText?: string) {
    setIdeas((currentIdeas) => {
      const targetIdea = currentIdeas.find((idea) => idea.id === ideaId);
      if (!targetIdea) return currentIdeas;
      const nextIdea = updateIdeaLifecycle(targetIdea, { status, practiceText });
      updateIdea(nextIdea);
      updateServerIdeaLifecycle(ideaId, nextIdea.lifecycle).catch(() => {
        // LocalStorage fallback keeps lifecycle edits available in static/offline mode.
      });
      return currentIdeas.map((idea) => (idea.id === ideaId ? nextIdea : idea));
    });
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
          <button aria-current={activeView === 'chains' ? 'page' : undefined} onClick={() => setActiveView('chains')} type="button">
            想法链条
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
      ) : activeView === 'list' ? (
        <TimelineView ideas={ideas} groups={groups} onDeleteIdea={(ideaId) => void handleDeleteIdea(ideaId)} onUpdateLifecycle={handleUpdateIdeaLifecycle} />
      ) : (
        <ChainsView ideas={ideas} onCreateIdea={() => setActiveView('capture')} />
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
  onUpdateLifecycle,
}: {
  ideas: Idea[];
  groups: ReturnType<typeof groupIdeasByDay>;
  onDeleteIdea: (ideaId: string) => void;
  onUpdateLifecycle: (ideaId: string, status: IdeaLifecycleStatus, practiceText?: string) => void;
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
              <IdeaCard ideas={ideas} idea={idea} key={idea.id} onDelete={() => onDeleteIdea(idea.id)} onUpdateLifecycle={onUpdateLifecycle} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}

function ChainsView({ ideas, onCreateIdea }: { ideas: Idea[]; onCreateIdea: () => void }) {
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>('');
  const sortedIdeas = useMemo(() => [...ideas].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [ideas]);
  const ideaNumberMap = useMemo(() => buildIdeaNumberMap(ideas), [ideas]);
  const linkedIds = new Set(ideas.flatMap((idea) => idea.linkedIdeaIds ?? []));
  const rootIdeas = ideas
    .filter((idea) => !(idea.linkedIdeaIds ?? []).some((linkedId) => ideas.some((candidate) => candidate.id === linkedId)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rootCount = rootIdeas.length;
  const selectedIdea = sortedIdeas.find((idea) => idea.id === selectedIdeaId) ?? sortedIdeas.find((idea) => (idea.linkedIdeaIds ?? []).length > 0) ?? sortedIdeas[0];
  const selectedRoot = selectedIdea ? findChainRoot(ideas, selectedIdea) : undefined;
  const selectedTree = selectedRoot ? buildIdeaExtensionTree(ideas, selectedRoot) : undefined;
  const sourceIdeas = selectedIdea ? getLinkedIdeas(ideas, selectedIdea) : [];
  const extensionIdeas = selectedIdea ? getReferencingIdeas(ideas, selectedIdea) : [];

  useEffect(() => {
    if (!selectedIdeaId && sortedIdeas[0]) {
      setSelectedIdeaId(sortedIdeas.find((idea) => (idea.linkedIdeaIds ?? []).length > 0)?.id ?? sortedIdeas[0].id);
    }
    if (selectedIdeaId && !sortedIdeas.some((idea) => idea.id === selectedIdeaId)) {
      setSelectedIdeaId(sortedIdeas[0]?.id ?? '');
    }
  }, [selectedIdeaId, sortedIdeas]);

  return (
    <section className="chain-workspace" aria-label="集中想法链条">
      <div className="timeline-toolbar chain-page-toolbar">
        <div>
          <h2>想法链条</h2>
          <p>集中查看每条想法如何继续长出后续分支。</p>
        </div>
        <div className="chain-actions">
          <label className="chain-search">
            <span aria-hidden="true">⌕</span>
            <input placeholder="搜索想法、关键词…" aria-label="搜索想法、关键词" />
          </label>
          <button className="save-button" onClick={onCreateIdea} type="button">
            新建想法 ＋
          </button>
        </div>
      </div>

      {ideas.length === 0 ? (
        <div className="empty-state">还没有想法。先记录一个源头，再从引用里长出分支。</div>
      ) : (
        <div className="chain-three-column">
          <aside className="chain-panel chain-list-panel" aria-label="想法时间线列表">
            <div className="chain-panel-title">
              <h2>想法列表</h2>
              <button className="icon-button" type="button" aria-label="筛选或排序想法">☷</button>
            </div>
            <div className="chain-timeline-list">
              {sortedIdeas.map((idea) => (
                <button
                  className={idea.id === selectedIdea?.id ? 'chain-list-item selected' : 'chain-list-item'}
                  key={idea.id}
                  onClick={() => setSelectedIdeaId(idea.id)}
                  type="button"
                >
                  <span className="timeline-dot" aria-hidden="true" />
                  <time>{formatIdeaTime(idea.createdAt)}</time>
                  <strong>{formatIdeaNumber(idea, ideaNumberMap)} {ideaTitle(idea)}</strong>
                  <span>{ideaSummary(idea)}</span>
                </button>
              ))}
            </div>
            <div className="chain-list-footer">共 {ideas.length} 个想法</div>
          </aside>

          <section className="chain-panel chain-map-panel" aria-label="想法链条可视化">
            <div className="chain-panel-title chain-map-toolbar">
              <h3>链条画布</h3>
              <div className="map-controls" aria-label="链条视图控制">
                <button type="button">居中</button>
                <button type="button" aria-label="缩小">−</button>
                <span>100%</span>
                <button type="button" aria-label="放大">＋</button>
                <button type="button" aria-label="适配视图">⛶</button>
              </div>
            </div>
            <strong className="chain-count">{rootCount} 条根想法</strong>
            <div className="chain-canvas">
              {rootIdeas.map((idea) => {
                const tree = buildIdeaExtensionTree(ideas, idea);
                const extensionCount = countIdeaExtensionDescendants(tree);
                return (
                  <section className="chain-overview-card chain-visually-present" aria-label={`集中链条：${idea.content}`} key={idea.id}>
                    <div className="chain-overview-header">
                      <span>{linkedIds.has(idea.id) ? '中间节点' : '根想法'}</span>
                      <strong>{extensionCount ? `延伸 ${extensionCount} 个想法` : '暂无延伸'}</strong>
                    </div>
                    <IdeaExtensionNodeView node={tree} depth={0} />
                  </section>
                );
              })}
              {selectedTree && (
                <VisualChainNode
                  node={selectedTree}
                  selectedIdeaId={selectedIdea?.id ?? ''}
                  ideaNumberMap={ideaNumberMap}
                  depth={0}
                  relation="起点"
                  onSelect={setSelectedIdeaId}
                />
              )}
            </div>
            <div className="chain-legend" aria-label="链条图例">
              <span><i className="legend-dot" />起点</span>
              <span><i className="legend-line solid" />引用关系</span>
              <span><i className="legend-line warm" />延伸关系</span>
              <span><i className="legend-line dashed" />并行参考</span>
              <span><i className="legend-badge" />被引用</span>
            </div>
          </section>

          <aside className="chain-panel chain-detail-panel" aria-label="想法详情">
            <div className="chain-panel-title">
              <h2>想法详情</h2>
              <div className="detail-icons">
                <button className="icon-button" type="button" aria-label="固定当前详情">⌖</button>
                <button className="icon-button" type="button" aria-label="更多操作">⋯</button>
              </div>
            </div>
            {selectedIdea && (
              <div className="detail-body">
                <span className="detail-kicker">{formatIdeaNumber(selectedIdea, ideaNumberMap)} {formatIdeaTime(selectedIdea.createdAt)}</span>
                <h3>{ideaTitle(selectedIdea)}</h3>
                <p className="detail-content">{selectedIdea.content}</p>
                <section className="detail-section">
                  <h4>创建时间</h4>
                  <p>{formatFullDate(selectedIdea.createdAt)}</p>
                </section>
                <section className="detail-section">
                  <h4>来源预览</h4>
                  {sourceIdeas[0] ? (
                    <button className="source-mini-card" onClick={() => setSelectedIdeaId(sourceIdeas[0].id)} type="button">
                      <strong>{formatIdeaNumber(sourceIdeas[0], ideaNumberMap)} {ideaTitle(sourceIdeas[0])}</strong>
                      <span>{ideaSummary(sourceIdeas[0])}</span>
                      <time>{formatIdeaTime(sourceIdeas[0].createdAt)}</time>
                    </button>
                  ) : selectedIdea.source ? (
                    <SourcePreview source={selectedIdea.source} />
                  ) : (
                    <p className="muted-text">暂无来源，这条想法可以作为链条起点。</p>
                  )}
                </section>
                <section className="detail-section relation-section">
                  <h4>引用关系</h4>
                  <span className="relation-label">来源</span>
                  {sourceIdeas.length ? sourceIdeas.map((idea) => (
                    <RelationRow idea={idea} ideaNumberMap={ideaNumberMap} key={idea.id} onSelect={setSelectedIdeaId} />
                  )) : <p className="muted-text">无上游来源</p>}
                  <span className="relation-label">延伸</span>
                  {extensionIdeas.length ? extensionIdeas.map((idea) => (
                    <RelationRow idea={idea} ideaNumberMap={ideaNumberMap} key={idea.id} onSelect={setSelectedIdeaId} />
                  )) : <p className="muted-text">还没有想法引用它</p>}
                </section>
                <div className="detail-action-stack">
                  <button className="primary-detail-action" onClick={onCreateIdea} type="button">🔗 引用这个想法</button>
                  <button className="secondary-detail-action" type="button">＋ 加入链条</button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function VisualChainNode({
  node,
  selectedIdeaId,
  ideaNumberMap,
  depth,
  relation,
  onSelect,
}: {
  node: IdeaExtensionNode;
  selectedIdeaId: string;
  ideaNumberMap: Map<string, number>;
  depth: number;
  relation: string;
  onSelect: (ideaId: string) => void;
}) {
  const extensionCount = countIdeaExtensionDescendants(node);
  const isSelected = node.idea.id === selectedIdeaId;
  const hasBranches = node.children.length > 1;
  return (
    <div className={`visual-node-wrap depth-${Math.min(depth, 2)} ${hasBranches ? 'branching' : ''}`}>
      <button className={isSelected ? 'visual-node selected' : 'visual-node'} onClick={() => onSelect(node.idea.id)} type="button">
        <span className="node-meta">{formatIdeaNumber(node.idea, ideaNumberMap)} {formatIdeaTime(node.idea.createdAt)}</span>
        <strong>{ideaTitle(node.idea)}</strong>
        <span className="node-summary">{ideaSummary(node.idea)}</span>
        <span className="node-tags"><i>{relation}</i>{extensionCount > 0 && <i>被 {extensionCount} 个想法引用</i>}</span>
      </button>
      {node.children.length > 0 && (
        <div className={node.children.length > 1 ? 'visual-children split' : 'visual-children'}>
          {node.children.map((child, index) => (
            <VisualChainNode
              depth={depth + 1}
              ideaNumberMap={ideaNumberMap}
              key={child.idea.id}
              node={child}
              onSelect={onSelect}
              relation={index === 0 ? `延伸自 ${formatIdeaNumber(node.idea, ideaNumberMap)}` : '并行参考'}
              selectedIdeaId={selectedIdeaId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RelationRow({ idea, ideaNumberMap, onSelect }: { idea: Idea; ideaNumberMap: Map<string, number>; onSelect: (ideaId: string) => void }) {
  return (
    <button className="relation-row" onClick={() => onSelect(idea.id)} type="button">
      <span><strong>{formatIdeaNumber(idea, ideaNumberMap)} {ideaTitle(idea)}</strong><time>{formatIdeaTime(idea.createdAt)}</time></span>
      <b aria-hidden="true">›</b>
    </button>
  );
}

function buildIdeaNumberMap(ideas: Idea[]): Map<string, number> {
  return new Map([...ideas].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((idea, index) => [idea.id, index + 1]));
}

function formatIdeaNumber(idea: Idea, ideaNumberMap: Map<string, number>): string {
  return `#${String(ideaNumberMap.get(idea.id) ?? 1).padStart(2, '0')}`;
}

function ideaTitle(idea: Idea): string {
  const firstLine = idea.content.split('\n').find(Boolean) ?? idea.content;
  return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine;
}

function ideaSummary(idea: Idea): string {
  const text = idea.content.replace(/\s+/g, ' ').trim();
  if (text.length <= 48) return text;
  return `${text.slice(0, 48)}…`;
}

function formatFullDate(isoTime: string): string {
  const date = new Date(isoTime);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai'
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')} / ${value('month')} / ${value('day')} ${value('hour')}:${value('minute')}`;
}

function getLinkedIdeas(ideas: Idea[], idea: Idea): Idea[] {
  return (idea.linkedIdeaIds ?? []).map((linkedId) => ideas.find((candidate) => candidate.id === linkedId)).filter((candidate): candidate is Idea => Boolean(candidate));
}

function getReferencingIdeas(ideas: Idea[], idea: Idea): Idea[] {
  return ideas.filter((candidate) => (candidate.linkedIdeaIds ?? []).includes(idea.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function findChainRoot(ideas: Idea[], idea: Idea): Idea {
  const ideasById = new Map(ideas.map((candidate) => [candidate.id, candidate]));
  let current = idea;
  const seen = new Set<string>();
  while ((current.linkedIdeaIds ?? []).length > 0 && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = current.linkedIdeaIds?.map((id) => ideasById.get(id)).find(Boolean);
    if (!parent) break;
    current = parent;
  }
  return current;
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

function IdeaCard({
  ideas,
  idea,
  onDelete,
  onUpdateLifecycle,
}: {
  ideas: Idea[];
  idea: Idea;
  onDelete: () => void;
  onUpdateLifecycle: (ideaId: string, status: IdeaLifecycleStatus, practiceText?: string) => void;
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [practiceText, setPracticeText] = useState('');
  const isLongIdea = idea.content.length > 120 || idea.content.includes('\n');
  const linkedIdeas = (idea.linkedIdeaIds ?? [])
    .map((linkedId) => ideas.find((candidate) => candidate.id === linkedId))
    .filter((linkedIdea): linkedIdea is Idea => Boolean(linkedIdea));
  const extensionTree = buildIdeaExtensionTree(ideas, idea);
  const extensionCount = countIdeaExtensionDescendants(extensionTree);
  const lifecycle = idea.lifecycle ?? { status: 'seed' as const, practiceLog: [] };

  function handleStatusChange(status: IdeaLifecycleStatus) {
    onUpdateLifecycle(idea.id, status);
  }

  function handleAddPractice() {
    if (!practiceText.trim()) return;
    onUpdateLifecycle(idea.id, lifecycle.status, practiceText);
    setPracticeText('');
  }

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
      {extensionCount > 0 && <IdeaExtensionGraph node={extensionTree} extensionCount={extensionCount} />}
      <section className="lifecycle-panel" aria-label={`生命周期：${idea.content}`}>
        <div className="lifecycle-panel-header">
          <span>生命周期</span>
          <strong>{lifecycleLabel(lifecycle.status)}</strong>
        </div>
        <div className="lifecycle-editor">
          <label>
            状态
            <select aria-label={`更新生命周期：${idea.content}`} value={lifecycle.status} onChange={(event) => handleStatusChange(event.target.value as IdeaLifecycleStatus)}>
              <option value="seed">萌芽</option>
              <option value="practicing">实践中</option>
              <option value="validated">已验证</option>
              <option value="paused">暂停</option>
            </select>
          </label>
          <label>
            实践记录
            <textarea aria-label={`实践记录：${idea.content}`} value={practiceText} onChange={(event) => setPracticeText(event.target.value)} placeholder="实践之后补一句：发生了什么、学到了什么……" rows={2} />
          </label>
          <button onClick={handleAddPractice} type="button" aria-label={`添加实践记录：${idea.content}`}>
            添加实践记录
          </button>
        </div>
        {lifecycle.practiceLog.length > 0 && (
          <ul className="practice-log">
            {lifecycle.practiceLog.map((entry) => (
              <li key={`${entry.createdAt}-${entry.text}`}>{entry.text}</li>
            ))}
          </ul>
        )}
      </section>
      {idea.source && <SourcePreview source={idea.source} />}
    </article>
  );
}

function IdeaExtensionGraph({ node, extensionCount }: { node: IdeaExtensionNode; extensionCount: number }) {
  return (
    <section className="extension-graph" aria-label={`延伸可视化：${node.idea.content}`}>
      <div className="extension-graph-header">
        <span>延伸可视化</span>
        <strong>延伸 {extensionCount} 个想法</strong>
      </div>
      <IdeaExtensionNodeView node={node} depth={0} />
    </section>
  );
}

function IdeaExtensionNodeView({ node, depth }: { node: IdeaExtensionNode; depth: number }) {
  return (
    <div className="extension-node" style={{ '--depth': depth } as CSSProperties}>
      <a className="extension-node-card" href={`#idea-${node.idea.id}`}>
        {node.idea.content}
      </a>
      {node.children.length > 0 && (
        <div className="extension-children">
          {node.children.map((child) => (
            <IdeaExtensionNodeView depth={depth + 1} key={child.idea.id} node={child} />
          ))}
        </div>
      )}
    </div>
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
