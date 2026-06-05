import { useEffect, useMemo, useState } from 'react';
import { useCanvasStore } from './core/data-model/store';
import { EventBus } from './core/event-bus/EventBus';
import { CommandHistory } from './core/commands/CommandHistory';
import { ViewportManager } from './core/viewport/ViewportManager';
import { PluginManager } from './core/plugin-system/PluginManager';
import { MindMapPlugin } from './plugins/mind-map/MindMapPlugin';
import { FlowchartPlugin } from './plugins/flowchart/FlowchartPlugin';
import { FreehandPlugin } from './plugins/freehand/FreehandPlugin';
import { SyncEngine } from './sync/SyncEngine';
import { CanvasContainer } from './ui/CanvasContainer';
import { Toolbar } from './ui/Toolbar';
import { FileActions } from './ui/FileActions';
import { MarkdownPanel } from './panels/MarkdownPanel';

export default function App() {
  const store = useCanvasStore.getState();
  const [, forceRender] = useState(0);

  const { commandHistory, viewport, pluginManager, syncEngine } =
    useMemo(() => {
      const eventBus = new EventBus();
      const commandHistory = new CommandHistory(() => forceRender((c) => c + 1));
      const viewport = new ViewportManager();

      const requestRender = () => eventBus.emit('render:request');

      const ctx = { store, eventBus, commandHistory, requestRender };
      const pluginManager = new PluginManager(ctx);

      const mindmapPlugin = new MindMapPlugin();
      const flowchartPlugin = new FlowchartPlugin();
      const freehandPlugin = new FreehandPlugin();

      pluginManager.register(mindmapPlugin);
      pluginManager.register(flowchartPlugin);
      pluginManager.register(freehandPlugin);
      pluginManager.activate('mindmap');

      const syncEngine = new SyncEngine(store, commandHistory, eventBus, mindmapPlugin);

      return { eventBus, commandHistory, viewport, pluginManager, syncEngine };
    }, []);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          commandHistory.redo();
        } else {
          commandHistory.undo();
        }
        forceRender((c) => c + 1);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        commandHistory.redo();
        forceRender((c) => c + 1);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [commandHistory]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <div className="flex items-center">
        <div className="flex-1">
          <Toolbar plugins={pluginManager} commandHistory={commandHistory} />
        </div>
        <div className="px-3 border-b border-gray-200 h-12 flex items-center">
          <FileActions />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <CanvasContainer viewport={viewport} plugins={pluginManager} />
        <MarkdownPanel syncEngine={syncEngine} />
      </div>
    </div>
  );
}
