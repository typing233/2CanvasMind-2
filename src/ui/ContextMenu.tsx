import { useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '../core/data-model/store';
import { CanvasNode, NodeId } from '../core/data-model/types';
import { CommandHistory } from '../core/commands/CommandHistory';
import { ICommand } from '../core/commands/Command';
import { genId } from '../utils/id';
import { getAvailableConversions, getConverter } from '../engine/NodeConverter';
import { t } from '../i18n';

interface ContextMenuProps {
  commandHistory: CommandHistory;
}

interface MenuState {
  x: number;
  y: number;
  nodeId: NodeId;
}

export function ContextMenu({ commandHistory }: ContextMenuProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const nodes = useCanvasStore((s) => s.document.nodes);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      const ids = Array.from(useCanvasStore.getState().selectedNodeIds);
      if (ids.length === 1) {
        setMenu({ x: e.clientX, y: e.clientY, nodeId: ids[0] });
      }
    };
    const canvas = document.querySelector('canvas');
    canvas?.addEventListener('contextmenu', handler);
    return () => canvas?.removeEventListener('contextmenu', handler);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  const handleDelete = useCallback(() => {
    if (!menu) return;
    const nodeId = menu.nodeId;
    const store = useCanvasStore.getState();
    const node = store.getNode(nodeId);
    if (!node) return;

    const edges = Object.values(store.document.edges)
      .filter((e) => e.sourceId === nodeId || e.targetId === nodeId);

    const cmd: ICommand = {
      id: genId(),
      description: 'Delete node',
      execute: () => {
        const s = useCanvasStore.getState();
        for (const e of edges) s.removeEdge(e.id);
        s.removeNode(nodeId);
        s.setSelection([]);
      },
      undo: () => {
        const s = useCanvasStore.getState();
        s.addNode(node);
        for (const e of edges) s.addEdge(e);
      },
    };
    commandHistory.execute(cmd);
    setMenu(null);
  }, [menu, commandHistory]);

  const handleConvert = useCallback((toPrefix: string) => {
    if (!menu) return;
    const store = useCanvasStore.getState();
    const node = store.getNode(menu.nodeId);
    if (!node) return;

    const fromPrefix = node.type.split('-')[0];
    const converter = getConverter(fromPrefix, toPrefix);
    if (!converter) return;

    const result = converter(node);
    const oldEdges = Object.values(store.document.edges)
      .filter((e) => e.sourceId === node.id || e.targetId === node.id);

    const cmd: ICommand = {
      id: genId(),
      description: `Convert to ${toPrefix}`,
      execute: () => {
        const s = useCanvasStore.getState();
        for (const e of oldEdges) s.removeEdge(e.id);
        s.removeNode(node.id);
        s.addNode(result.node);
        for (const e of result.edges) s.addEdge(e);
        s.setSelection([result.node.id]);
      },
      undo: () => {
        const s = useCanvasStore.getState();
        for (const e of result.edges) s.removeEdge(e.id);
        s.removeNode(result.node.id);
        s.addNode(node);
        for (const e of oldEdges) s.addEdge(e);
        s.setSelection([node.id]);
      },
    };
    commandHistory.execute(cmd);
    setMenu(null);
  }, [menu, commandHistory]);

  const handleLock = useCallback(() => {
    if (!menu) return;
    const store = useCanvasStore.getState();
    const node = store.getNode(menu.nodeId);
    if (!node) return;

    const newLocked = !node.locked;
    const cmd: ICommand = {
      id: genId(),
      description: newLocked ? 'Lock node' : 'Unlock node',
      execute: () => useCanvasStore.getState().updateNode(node.id, { locked: newLocked }),
      undo: () => useCanvasStore.getState().updateNode(node.id, { locked: !newLocked }),
    };
    commandHistory.execute(cmd);
    setMenu(null);
  }, [menu, commandHistory]);

  if (!menu) return null;

  const node = nodes[menu.nodeId];
  if (!node) return null;

  const conversions = getAvailableConversions(node.type);
  const conversionLabels: Record<string, string> = {
    mindmap: t('context.convert_mindmap'),
    flowchart: t('context.convert_flowchart'),
  };

  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[100] text-sm min-w-[160px]"
      style={{ left: menu.x, top: menu.y }}
    >
      <MenuItem label={t('context.delete')} onClick={handleDelete} />
      <div className="border-t border-gray-100 my-1" />
      <MenuItem
        label={node.locked ? t('context.unlock') : t('context.lock')}
        onClick={handleLock}
      />
      {conversions.length > 0 && (
        <>
          <div className="border-t border-gray-100 my-1" />
          <div className="px-3 py-1 text-gray-400 text-xs">{t('context.convert_to')}</div>
          {conversions.map((to) => (
            <MenuItem
              key={to}
              label={conversionLabels[to] || to}
              onClick={() => handleConvert(to)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function MenuItem({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 ${disabled ? 'text-gray-300' : 'text-gray-700'}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
