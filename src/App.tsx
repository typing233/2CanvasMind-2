import { useEffect, useMemo, useState, useCallback } from 'react';
import { useCanvasStore } from './core/data-model/store';
import { EventBus } from './core/event-bus/EventBus';
import { CommandHistory } from './core/commands/CommandHistory';
import { ViewportManager } from './core/viewport/ViewportManager';
import { PluginManager } from './core/plugin-system/PluginManager';
import { MindMapPlugin } from './plugins/mind-map/MindMapPlugin';
import { FlowchartPlugin } from './plugins/flowchart/FlowchartPlugin';
import { FreehandPlugin } from './plugins/freehand/FreehandPlugin';
import { StickyNotesPlugin } from './plugins/sticky-notes/StickyNotesPlugin';
import { ImageInsertPlugin } from './plugins/image-insert/ImageInsertPlugin';
import { ConnectorLinesPlugin } from './plugins/connector-lines/ConnectorLinesPlugin';
import { GeometryShapesPlugin } from './plugins/geometry-shapes/GeometryShapesPlugin';
import { ExportPlugin } from './plugins/export/ExportPlugin';
import { SyncEngine } from './sync/SyncEngine';
import { CanvasContainer } from './ui/CanvasContainer';
import { Toolbar } from './ui/Toolbar';
import { FileActions } from './ui/FileActions';
import { ContextMenu } from './ui/ContextMenu';
import { MarkdownPanel } from './panels/MarkdownPanel';
import { StylePanel } from './panels/StylePanel';
import { MarketplacePanel } from './panels/MarketplacePanel';
import { onLocaleChange } from './i18n';

export default function App() {
  const store = useCanvasStore.getState();
  const [, forceRender] = useState(0);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);

  const { commandHistory, viewport, pluginManager, syncEngine } =
    useMemo(() => {
      const eventBus = new EventBus();
      const commandHistory = new CommandHistory(() => {
        forceRender((c) => c + 1);
        eventBus.emit('sync:canvas-updated');
      });
      const viewport = new ViewportManager();

      const requestRender = () => eventBus.emit('render:request');

      const ctx = { store, eventBus, commandHistory, requestRender };
      const pluginManager = new PluginManager(ctx);

      const mindmapPlugin = new MindMapPlugin();
      const flowchartPlugin = new FlowchartPlugin();
      const freehandPlugin = new FreehandPlugin();
      const stickyPlugin = new StickyNotesPlugin();
      const imagePlugin = new ImageInsertPlugin();
      const connectorPlugin = new ConnectorLinesPlugin();
      const geoPlugin = new GeometryShapesPlugin();
      const exportPlugin = new ExportPlugin();

      pluginManager.register(mindmapPlugin);
      pluginManager.register(flowchartPlugin);
      pluginManager.register(freehandPlugin);
      pluginManager.register(stickyPlugin);
      pluginManager.register(imagePlugin);
      pluginManager.register(connectorPlugin);
      pluginManager.register(geoPlugin);
      pluginManager.register(exportPlugin);
      pluginManager.activate('mindmap');

      const syncEngine = new SyncEngine(store, commandHistory, eventBus, mindmapPlugin);

      return { eventBus, commandHistory, viewport, pluginManager, syncEngine };
    }, []);

  useEffect(() => {
    const unsubLocale = onLocaleChange(() => forceRender((c) => c + 1));
    return unsubLocale;
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

  const handleMarketplaceOpen = useCallback(() => setMarketplaceOpen(true), []);
  const handleMarketplaceClose = useCallback(() => setMarketplaceOpen(false), []);
  const handleConversionDone = useCallback(() => {
    const mindmap = pluginManager.getAll().find(p => p.id === 'mindmap') as MindMapPlugin | undefined;
    mindmap?.relayout();
  }, [pluginManager]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <div className="flex items-center">
        <div className="flex-1">
          <Toolbar plugins={pluginManager} commandHistory={commandHistory} onMarketplaceOpen={handleMarketplaceOpen} />
        </div>
        <div className="px-3 border-b border-gray-200 h-12 flex items-center">
          <FileActions />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden relative">
        <CanvasContainer viewport={viewport} plugins={pluginManager} commandHistory={commandHistory} />
        <StylePanel commandHistory={commandHistory} />
        <ContextMenu commandHistory={commandHistory} onConversionDone={handleConversionDone} />
        <MarkdownPanel syncEngine={syncEngine} />
      </div>
      {marketplaceOpen && (
        <MarketplacePanel plugins={pluginManager} onClose={handleMarketplaceClose} />
      )}
    </div>
  );
}
