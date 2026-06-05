import { PluginManager } from '../core/plugin-system/PluginManager';
import { CommandHistory } from '../core/commands/CommandHistory';
import { ToolbarContribution } from '../core/plugin-system/types';
import { useCanvasStore } from '../core/data-model/store';

interface Props {
  plugins: PluginManager;
  commandHistory: CommandHistory;
}

const MODES = [
  { id: 'mindmap', label: 'Mind Map' },
  { id: 'flowchart', label: 'Flowchart' },
  { id: 'freehand', label: 'Free Draw' },
];

export function Toolbar({ plugins, commandHistory }: Props) {
  const activePluginId = useCanvasStore((s) => s.activePluginId);

  const activePlugin = plugins.getActive();
  const contributions: ToolbarContribution[] = activePlugin?.contributeToolbar?.() || [];

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
      <div className="flex gap-1 mr-4">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => plugins.activate(mode.id)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activePluginId === mode.id
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200" />

      <div className="flex gap-1 ml-2">
        {contributions.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex gap-1">
        <button
          onClick={() => commandHistory.undo()}
          disabled={!commandHistory.canUndo()}
          className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 text-gray-700"
        >
          Undo
        </button>
        <button
          onClick={() => commandHistory.redo()}
          disabled={!commandHistory.canRedo()}
          className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 text-gray-700"
        >
          Redo
        </button>
      </div>
    </div>
  );
}
