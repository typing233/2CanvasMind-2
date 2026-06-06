import { useState, useEffect, useCallback } from 'react';
import { useCanvasStore } from '../core/data-model/store';
import { NodeStyle, NodeId } from '../core/data-model/types';
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
  const nodes = useCanvasStore((s) => s.document.nodes);
  const [style, setStyle] = useState<Partial<NodeStyle>>({});

  useEffect(() => {
    const ids = Array.from(selectedNodeIds);
    if (ids.length === 0) {
      setStyle({});
      return;
    }
    const node = nodes[ids[0]];
    if (node) setStyle({ ...node.style });
  }, [selectedNodeIds, nodes]);

  const applyStyle = useCallback((patch: Partial<NodeStyle>) => {
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
      description: 'Update style',
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
    setStyle((prev) => ({ ...prev, ...patch }));
  }, [selectedNodeIds, commandHistory]);

  if (selectedNodeIds.size === 0) return null;

  return (
    <div className="absolute top-14 right-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 text-xs">
      <h3 className="font-semibold text-sm mb-2 text-gray-700">{t('style.title')}</h3>

      <Section label={t('style.fill')}>
        <ColorGrid value={style.fill || '#ffffff'} onChange={(fill) => applyStyle({ fill })} />
      </Section>

      <Section label={t('style.stroke')}>
        <ColorGrid value={style.stroke || '#374151'} onChange={(stroke) => applyStyle({ stroke })} />
      </Section>

      <Section label={t('style.stroke_width')}>
        <div className="flex gap-1 flex-wrap">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              className={`w-7 h-7 border rounded text-center ${style.strokeWidth === w ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              onClick={() => applyStyle({ strokeWidth: w })}
            >
              {w}
            </button>
          ))}
        </div>
      </Section>

      <Section label={t('style.font_size')}>
        <select
          className="w-full border border-gray-200 rounded px-2 py-1"
          value={style.fontSize || 14}
          onChange={(e) => applyStyle({ fontSize: Number(e.target.value) })}
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
      </Section>

      <Section label={t('style.font_family')}>
        <select
          className="w-full border border-gray-200 rounded px-2 py-1"
          value={style.fontFamily || 'sans-serif'}
          onChange={(e) => applyStyle({ fontFamily: e.target.value })}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </Section>

      <Section label={t('style.font_color')}>
        <ColorGrid value={style.fontColor || '#1f2937'} onChange={(fontColor) => applyStyle({ fontColor })} />
      </Section>

      <Section label={t('style.opacity')}>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.1}
          className="w-full"
          value={style.opacity ?? 1}
          onChange={(e) => applyStyle({ opacity: Number(e.target.value) })}
        />
      </Section>
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
