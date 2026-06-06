import { useState, useEffect, useCallback } from 'react';
import { useCanvasStore } from '../core/data-model/store';
import { NodeStyle, EdgeStyle, NodeId, EdgeId } from '../core/data-model/types';
import { CommandHistory } from '../core/commands/CommandHistory';
import { ICommand } from '../core/commands/Command';
import { genId } from '../utils/id';
import { t } from '../i18n';

const PRESET_COLORS = [
  '#ffffff', '#f3f4f6', '#fef3c7', '#d1fae5',
  '#dbeafe', '#fce7f3', '#e0e7ff', '#fed7aa',
  '#374151', '#ef4444', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ec4899', '#000000',
];

const FONT_FAMILIES = ['sans-serif', 'serif', 'monospace', 'Georgia', 'Arial', 'Courier New'];
const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32];

interface StylePanelProps {
  commandHistory: CommandHistory;
}

export function StylePanel({ commandHistory }: StylePanelProps) {
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useCanvasStore((s) => s.selectedEdgeIds);
  const nodes = useCanvasStore((s) => s.document.nodes);
  const edges = useCanvasStore((s) => s.document.edges);
  const [nodeStyle, setNodeStyle] = useState<Partial<NodeStyle>>({});
  const [edgeStyle, setEdgeStyle] = useState<Partial<EdgeStyle>>({});

  const hasNodeSelection = selectedNodeIds.size > 0;
  const hasEdgeSelection = selectedEdgeIds.size > 0;

  useEffect(() => {
    const nodeIds = Array.from(selectedNodeIds);
    if (nodeIds.length > 0) {
      const node = nodes[nodeIds[0]];
      if (node) setNodeStyle({ ...node.style });
    } else {
      setNodeStyle({});
    }
  }, [selectedNodeIds, nodes]);

  useEffect(() => {
    const edgeIds = Array.from(selectedEdgeIds);
    if (edgeIds.length > 0) {
      const edge = edges[edgeIds[0]];
      if (edge) setEdgeStyle({ ...edge.style });
    } else {
      setEdgeStyle({});
    }
  }, [selectedEdgeIds, edges]);

  const applyNodeStyle = useCallback((patch: Partial<NodeStyle>) => {
    const ids = Array.from(selectedNodeIds);
    if (ids.length === 0) return;

    const store = useCanvasStore.getState();
    const oldStyles = new Map<NodeId, NodeStyle>();
    for (const id of ids) {
      const n = store.getNode(id);
      if (n) oldStyles.set(id, { ...n.style });
    }

    const cmd: ICommand = {
      id: genId(),
      description: 'Update node style',
      execute: () => {
        const s = useCanvasStore.getState();
        for (const id of ids) {
          const n = s.getNode(id);
          if (n) s.updateNode(id, { style: { ...n.style, ...patch } });
        }
      },
      undo: () => {
        const s = useCanvasStore.getState();
        for (const [id, old] of oldStyles) {
          s.updateNode(id, { style: old });
        }
      },
    };
    commandHistory.execute(cmd);
    setNodeStyle((prev) => ({ ...prev, ...patch }));
  }, [selectedNodeIds, commandHistory]);

  const applyEdgeStyle = useCallback((patch: Partial<EdgeStyle>) => {
    const ids = Array.from(selectedEdgeIds);
    if (ids.length === 0) return;

    const store = useCanvasStore.getState();
    const oldStyles = new Map<EdgeId, EdgeStyle>();
    for (const id of ids) {
      const e = store.document.edges[id];
      if (e) oldStyles.set(id, { ...e.style });
    }

    const cmd: ICommand = {
      id: genId(),
      description: 'Update edge style',
      execute: () => {
        const s = useCanvasStore.getState();
        for (const id of ids) {
          const e = s.document.edges[id];
          if (e) s.updateEdge(id, { style: { ...e.style, ...patch } });
        }
      },
      undo: () => {
        const s = useCanvasStore.getState();
        for (const [id, old] of oldStyles) {
          s.updateEdge(id, { style: old });
        }
      },
    };
    commandHistory.execute(cmd);
    setEdgeStyle((prev) => ({ ...prev, ...patch }));
  }, [selectedEdgeIds, commandHistory]);

  if (!hasNodeSelection && !hasEdgeSelection) return null;

  return (
    <div className="absolute top-14 right-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 text-xs max-h-[calc(100vh-80px)] overflow-y-auto">
      <h3 className="font-semibold text-sm mb-2 text-gray-700">{t('style.title')}</h3>

      {hasNodeSelection && (
        <>
          <Section label={t('style.fill')}>
            <ColorGrid value={nodeStyle.fill || '#ffffff'} onChange={(fill) => applyNodeStyle({ fill })} />
          </Section>

          <Section label={t('style.stroke')}>
            <ColorGrid value={nodeStyle.stroke || '#374151'} onChange={(stroke) => applyNodeStyle({ stroke })} />
          </Section>

          <Section label={t('style.stroke_width')}>
            <div className="flex gap-1 flex-wrap">
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  className={`w-7 h-7 border rounded text-center ${nodeStyle.strokeWidth === w ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                  onClick={() => applyNodeStyle({ strokeWidth: w })}
                >
                  {w}
                </button>
              ))}
            </div>
          </Section>

          <Section label={t('style.font_size')}>
            <select
              className="w-full border border-gray-200 rounded px-2 py-1"
              value={nodeStyle.fontSize || 14}
              onChange={(e) => applyNodeStyle({ fontSize: Number(e.target.value) })}
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </Section>

          <Section label={t('style.font_family')}>
            <select
              className="w-full border border-gray-200 rounded px-2 py-1"
              value={nodeStyle.fontFamily || 'sans-serif'}
              onChange={(e) => applyNodeStyle({ fontFamily: e.target.value })}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Section>

          <Section label={t('style.font_color')}>
            <ColorGrid value={nodeStyle.fontColor || '#1f2937'} onChange={(fontColor) => applyNodeStyle({ fontColor })} />
          </Section>

          <Section label={t('style.opacity')}>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              className="w-full"
              value={nodeStyle.opacity ?? 1}
              onChange={(e) => applyNodeStyle({ opacity: Number(e.target.value) })}
            />
          </Section>
        </>
      )}

      {hasEdgeSelection && (
        <>
          <div className="border-t border-gray-100 my-2 pt-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Edge</span>
          </div>

          <Section label={t('style.stroke')}>
            <ColorGrid value={edgeStyle.stroke || '#6b7280'} onChange={(stroke) => applyEdgeStyle({ stroke })} />
          </Section>

          <Section label={t('style.stroke_width')}>
            <div className="flex gap-1 flex-wrap">
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  className={`w-7 h-7 border rounded text-center ${edgeStyle.strokeWidth === w ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                  onClick={() => applyEdgeStyle({ strokeWidth: w })}
                >
                  {w}
                </button>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <label className="block text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ColorGrid({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [custom, setCustom] = useState('');

  return (
    <div>
      <div className="grid grid-cols-8 gap-0.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            className={`w-5 h-5 rounded border ${value === c ? 'ring-2 ring-blue-400' : 'border-gray-200'}`}
            style={{ backgroundColor: c }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
      <div className="flex mt-1 gap-1">
        <input
          type="text"
          placeholder="#hex"
          className="flex-1 border border-gray-200 rounded px-1 py-0.5 text-xs"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && /^#[0-9a-fA-F]{3,8}$/.test(custom)) {
              onChange(custom);
            }
          }}
        />
        <div className="w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}
