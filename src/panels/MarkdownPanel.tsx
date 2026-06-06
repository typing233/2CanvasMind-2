import { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { SyncEngine } from '../sync/SyncEngine';
import { useCanvasStore } from '../core/data-model/store';

interface Props {
  syncEngine: SyncEngine | null;
}

export function MarkdownPanel({ syncEngine }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(320);
  const isUpdatingRef = useRef(false);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isUpdatingRef.current && syncEngine) {
        const md = update.state.doc.toString();
        syncEngine.onMarkdownChanged(md);
      }
      if (update.selectionSet && !update.docChanged && !isUpdatingRef.current && syncEngine) {
        const pos = update.state.selection.main.head;
        const lineNum = update.state.doc.lineAt(pos).number - 1;
        const nodeId = syncEngine.getNodeIdForLine(lineNum);
        if (nodeId) {
          const current = useCanvasStore.getState().getSelectedNodeIds();
          if (!current.has(nodeId)) {
            isUpdatingRef.current = true;
            useCanvasStore.getState().setSelection([nodeId]);
            isUpdatingRef.current = false;
          }
        }
      }
    });

    const state = EditorState.create({
      doc: '# Central Topic\n\n## Subtopic 1\n\n## Subtopic 2\n\n### Detail\n',
      extensions: [basicSetup, markdown(), updateListener, EditorView.lineWrapping],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [syncEngine]);

  useEffect(() => {
    if (!syncEngine || !viewRef.current || isUpdatingRef.current) return;
    if (selectedNodeIds.size === 0) return;

    const nodeId = Array.from(selectedNodeIds)[0];
    const line = syncEngine.getLineForNodeId(nodeId);
    if (line !== null) {
      const view = viewRef.current;
      const lineCount = view.state.doc.lines;
      if (line < lineCount) {
        isUpdatingRef.current = true;
        const docLine = view.state.doc.line(line + 1);
        view.dispatch({
          selection: { anchor: docLine.from },
          scrollIntoView: true,
        });
        isUpdatingRef.current = false;
      }
    }
  }, [selectedNodeIds, syncEngine]);

  const handleSyncToMap = () => {
    if (!syncEngine || !viewRef.current) return;
    const md = viewRef.current.state.doc.toString();
    syncEngine.applyMarkdownToCanvas(md);
  };

  const handleSyncFromMap = () => {
    if (!syncEngine || !viewRef.current) return;
    isUpdatingRef.current = true;

    const allNodes = useCanvasStore.getState().getDocument().nodes;
    const mindmapRoot = Object.values(allNodes).find((n) => n.type === 'mindmap' && !n.parentId);
    if (!mindmapRoot) {
      isUpdatingRef.current = false;
      return;
    }

    const md = serializeCanvasToMd(mindmapRoot.id, allNodes);
    const view = viewRef.current;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: md },
    });

    syncEngine.rebuildSyncMap(md);
    isUpdatingRef.current = false;
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      setWidth(Math.max(200, Math.min(600, startWidth + delta)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute right-2 top-14 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 z-10"
      >
        MD
      </button>
    );
  }

  return (
    <div className="flex shrink-0" style={{ width }}>
      <div
        onMouseDown={handleResizeStart}
        className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-colors"
      />
      <div className="flex flex-col flex-1 bg-white border-l border-gray-200">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-700">Markdown</span>
          <div className="flex gap-1">
            <button
              onClick={handleSyncToMap}
              className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              → Map
            </button>
            <button
              onClick={handleSyncFromMap}
              className="px-2 py-0.5 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100"
            >
              ← Map
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-1 py-0.5 text-xs text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
        <div ref={editorRef} className="flex-1 overflow-auto text-sm" />
      </div>
    </div>
  );
}

function serializeCanvasToMd(rootId: string, nodes: Record<string, any>): string {
  const lines: string[] = [];
  function walk(id: string, depth: number): void {
    const node = nodes[id];
    if (!node) return;
    const text = (node.data?.text as string) || '';
    if (depth <= 6) {
      lines.push(`${'#'.repeat(depth)} ${text}`);
    } else {
      const indent = '  '.repeat(depth - 7);
      lines.push(`${indent}- ${text}`);
    }
    if (node.children) {
      for (const childId of node.children) {
        walk(childId, depth + 1);
      }
    }
  }
  walk(rootId, 1);
  return lines.join('\n');
}
