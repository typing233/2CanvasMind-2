import { useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '../core/data-model/store';
import { NodeId } from '../core/data-model/types';
import { CommandHistory } from '../core/commands/CommandHistory';
import { ICommand } from '../core/commands/Command';
import { genId } from '../utils/id';
import { getAvailableConversions, getConverter } from '../engine/NodeConverter';
import { t } from '../i18n';

interface ContextMenuProps {
  commandHistory: CommandHistory;
  onConversionDone?: () => void;
}

interface MenuState {
  x: number;
  y: number;
  nodeId?: NodeId;
  edgeId?: string;
}

export function ContextMenu({ commandHistory, onConversionDone }: ContextMenuProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const nodes = useCanvasStore((s) => s.document.nodes);
  const edges = useCanvasStore((s) => s.document.edges);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      const state = useCanvasStore.getState();
      const nodeIds = Array.from(state.selectedNodeIds);
      const edgeIds = Array.from(state.selectedEdgeIds);
      if (nodeIds.length >= 1) {
        setMenu({ x: e.clientX, y: e.clientY, nodeId: nodeIds[0] });
      } else if (edgeIds.length >= 1) {
        setMenu({ x: e.clientX, y: e.clientY, edgeId: edgeIds[0] });
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

    if (menu.edgeId) {
      const store = useCanvasStore.getState();
      const edge = store.document.edges[menu.edgeId];
      if (!edge) return;

      const cmd: ICommand = {
        id: genId(),
        description: 'Delete edge',
        execute: () => useCanvasStore.getState().removeEdge(edge.id),
        undo: () => useCanvasStore.getState().addEdge(edge),
      };
      commandHistory.execute(cmd);
      setMenu(null);
      return;
    }

    if (!menu.nodeId) return;
    const nodeId = menu.nodeId;
    const store = useCanvasStore.getState();
    const node = store.getNode(nodeId);
    if (!node) return;

    const relEdges = Object.values(store.document.edges)
      .filter((e) => e.sourceId === nodeId || e.targetId === nodeId);

    const cmd: ICommand = {
      id: genId(),
      description: 'Delete node',
      execute: () => {
        const s = useCanvasStore.getState();
        for (const e of relEdges) s.removeEdge(e.id);
        s.removeNode(nodeId);
        s.setSelection([]);
      },
      undo: () => {
        const s = useCanvasStore.getState();
        s.addNode(node);
        for (const e of relEdges) s.addEdge(e);
      },
    };
    commandHistory.execute(cmd);
    setMenu(null);
  }, [menu, commandHistory]);

  const handleConvert = useCallback((toPrefix: string) => {
    if (!menu || !menu.nodeId) return;
    const store = useCanvasStore.getState();
    const selectedIds = Array.from(store.selectedNodeIds);
    if (selectedIds.length === 0) return;

    const firstNode = store.getNode(selectedIds[0]);
    if (!firstNode) return;
    const fromPrefix = firstNode.type.split('-')[0];

    const allSameType = Object.values(store.document.nodes)
      .filter(n => n.type.startsWith(fromPrefix));
    if (allSameType.length === 0) return;

    const allTypeIds = allSameType.map(n => n.id);
    const relatedEdges = Object.values(store.document.edges)
      .filter(e => allTypeIds.includes(e.sourceId) || allTypeIds.includes(e.targetId));

    const converter = getConverter(fromPrefix, toPrefix);
    if (!converter) return;

    const result = converter(allSameType, relatedEdges, store.document.nodes, store.document.edges);

    const savedNodes = result.removedNodeIds.map(id => ({ ...store.document.nodes[id] })).filter(Boolean);
    const savedEdges = result.removedEdgeIds.map(id => ({ ...store.document.edges[id] })).filter(Boolean);

    const cmd: ICommand = {
      id: genId(),
      description: `Convert to ${toPrefix}`,
      execute: () => {
        const s = useCanvasStore.getState();
        for (const eid of result.removedEdgeIds) s.removeEdge(eid);
        for (const nid of result.removedNodeIds) s.removeNode(nid);
        for (const n of result.nodes) s.addNode(n);
        for (const e of result.edges) s.addEdge(e);
        if (result.nodes.length > 0) {
          s.setSelection([result.nodes[0].id]);
        }
      },
      undo: () => {
        const s = useCanvasStore.getState();
        for (const e of result.edges) s.removeEdge(e.id);
        for (const n of result.nodes) s.removeNode(n.id);
        for (const n of savedNodes) s.addNode(n as any);
        for (const e of savedEdges) s.addEdge(e as any);
        if (selectedIds.length > 0) s.setSelection(selectedIds);
      },
    };
    commandHistory.execute(cmd);
    setMenu(null);
    onConversionDone?.();
  }, [menu, commandHistory, onConversionDone]);

  const handleLock = useCallback(() => {
    if (!menu || !menu.nodeId) return;
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

  if (menu.edgeId) {
    const edge = edges[menu.edgeId];
    if (!edge) return null;
    return (
      <div
        className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[100] text-sm min-w-[160px]"
        style={{ left: menu.x, top: menu.y }}
      >
        <MenuItem label={t('context.delete')} onClick={handleDelete} />
      </div>
    );
  }

  if (!menu.nodeId) return null;
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
