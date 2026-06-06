import { PluginManager } from '../core/plugin-system/PluginManager';
import { CommandHistory } from '../core/commands/CommandHistory';
import { ToolbarContribution } from '../core/plugin-system/types';
import { useCanvasStore } from '../core/data-model/store';
import { t, getLocale, setLocale } from '../i18n';

interface Props {
  plugins: PluginManager;
  commandHistory: CommandHistory;
  onMarketplaceOpen: () => void;
}

const MODES = [
  { id: 'mindmap', key: 'toolbar.mindmap' },
  { id: 'flowchart', key: 'toolbar.flowchart' },
  { id: 'freehand', key: 'toolbar.freehand' },
  { id: 'sticky', key: 'plugin.sticky_notes' },
  { id: 'geo', key: 'plugin.geometry_shapes' },
  { id: 'connector', key: 'plugin.connector_lines' },
  { id: 'image', key: 'plugin.image_insert' },
];

export function Toolbar({ plugins, commandHistory, onMarketplaceOpen }: Props) {
  const activePluginId = useCanvasStore((s) => s.activePluginId);

  const activePlugin = plugins.getActive();
  const contributions: ToolbarContribution[] = activePlugin?.contributeToolbar?.() || [];

  const exportPlugin = plugins.get('export');
  const exportContributions: ToolbarContribution[] = exportPlugin?.contributeToolbar?.() || [];

  const enabledModes = MODES.filter(m => plugins.isEnabled(m.id));

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
      <div className="flex gap-1 mr-2 overflow-x-auto">
        {enabledModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => plugins.activate(mode.id)}
            className={`px-2.5 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
              activePluginId === mode.id
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t(mode.key)}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex gap-1 ml-1 overflow-x-auto">
        {contributions.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex gap-1 items-center">
        {exportContributions.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap"
          >
            {item.label}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          onClick={() => commandHistory.undo()}
          disabled={!commandHistory.canUndo()}
          className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 text-gray-700"
        >
          {t('toolbar.undo')}
        </button>
        <button
          onClick={() => commandHistory.redo()}
          disabled={!commandHistory.canRedo()}
          className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 text-gray-700"
        >
          {t('toolbar.redo')}
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          onClick={onMarketplaceOpen}
          className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 text-gray-700"
        >
          {t('toolbar.marketplace')}
        </button>

        <select
          className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600"
          value={getLocale()}
          onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
        >
          <option value="en">EN</option>
          <option value="zh">中文</option>
        </select>
      </div>
    </div>
  );
}
