import type { Idea } from './types';

interface ExportPayload {
  app: 'yinian-mvp';
  version: 1;
  exportedAt: string;
  ideas: Idea[];
}

export function buildExportPayload(ideas: Idea[], exportedAt = new Date()): string {
  const payload: ExportPayload = {
    app: 'yinian-mvp',
    version: 1,
    exportedAt: exportedAt.toISOString(),
    ideas,
  };

  return JSON.stringify(payload, null, 2);
}

export function buildExportFileName(exportedAt = new Date()): string {
  const year = exportedAt.getFullYear();
  const month = `${exportedAt.getMonth() + 1}`.padStart(2, '0');
  const day = `${exportedAt.getDate()}`.padStart(2, '0');
  return `yinian-ideas-${year}-${month}-${day}.json`;
}

export function downloadIdeasExport(ideas: Idea[], exportedAt = new Date()): void {
  const blob = new Blob([buildExportPayload(ideas, exportedAt)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buildExportFileName(exportedAt);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
