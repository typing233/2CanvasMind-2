# Plugin Development Guide

## Overview

CanvasMind uses a plugin architecture where each drawing mode is a self-contained plugin. Plugins can contribute:
- **Node types**: custom shapes rendered on the canvas
- **Edge types**: custom connection lines
- **Toolbar buttons**: mode-specific actions
- **Context menu items**: right-click actions on nodes
- **Drag-drop behavior**: reparenting or reorganization on drop

## Plugin Interface

```typescript
interface IPluginV2 extends IPlugin {
  id: string;           // Unique identifier (used as type prefix)
  name: string;         // Display name
  version: string;      // Semver version
  manifest?: PluginManifest;  // Metadata for marketplace

  // Lifecycle
  register(ctx: PluginContext): void;  // Called once on registration
  activate(): void;                     // Called when plugin becomes active mode
  deactivate(): void;                   // Called when switching away
  destroy(): void;                      // Cleanup

  // Type ownership (for passive rendering)
  ownsNodeType?(type: string): boolean;
  ownsEdgeType?(type: string): boolean;

  // Rendering
  renderNode?(ctx: CanvasRenderingContext2D, node: CanvasNode, isSelected: boolean): void;
  renderEdge?(ctx: CanvasRenderingContext2D, edge: CanvasEdge, nodes: Record<string, CanvasNode>): void;

  // Hit testing
  hitTestNode?(node: CanvasNode, point: Point): boolean;

  // Input (only called when plugin is active)
  onCanvasMouseDown?(point: Point, e: MouseEvent): boolean;
  onCanvasMouseMove?(point: Point, e: MouseEvent): void;
  onCanvasMouseUp?(point: Point, e: MouseEvent): void;
  onCanvasDblClick?(point: Point, e: MouseEvent): void;
  onKeyDown?(e: KeyboardEvent): boolean;

  // UI contributions
  contributeToolbar?(): ToolbarContribution[];
  contributeContextMenu?(selectedNodes: CanvasNode[]): ContextMenuContribution[];

  // Drag-drop
  canAcceptDrop?(draggedNodes: CanvasNode[], targetNode: CanvasNode): boolean;
  onDropOnNode?(draggedIds: string[], targetId: string, position: 'before'|'after'|'child'): void;
}
```

## PluginContext

The context provided to plugins gives access to core services:

```typescript
interface PluginContext {
  store: CanvasStore;           // Read/write document state
  eventBus: EventBus;           // Publish/subscribe events
  commandHistory: CommandHistory; // Execute undoable commands
  requestRender(): void;        // Trigger canvas re-render
}
```

## Creating a Node

Always use the Command pattern for mutations:

```typescript
import { ICommand } from '../../core/commands/Command';
import { genId } from '../../utils/id';

const id = genId();
const node: CanvasNode = {
  id,
  type: 'my-plugin-shape',  // Must start with your plugin id prefix
  position: { x: 100, y: 100 },
  size: { width: 120, height: 60 },
  data: { text: 'Hello' },
  style: { ...DEFAULT_NODE_STYLE, fontFamily: 'sans-serif' },
  locked: false,
};

const cmd: ICommand = {
  id: genId(),
  description: 'Add my shape',
  execute: () => {
    this.ctx.store.addNode(node);
    this.ctx.store.setSelection([id]);
    this.ctx.requestRender();
  },
  undo: () => {
    this.ctx.store.removeNode(id);
    this.ctx.requestRender();
  },
};
this.ctx.commandHistory.execute(cmd);
```

## Rendering

The `renderNode` method receives a Canvas 2D context already transformed to canvas coordinates:

```typescript
renderNode(ctx: CanvasRenderingContext2D, node: CanvasNode, isSelected: boolean): void {
  if (node.type !== 'my-plugin-shape') return;

  ctx.save();
  ctx.beginPath();
  // Draw your shape
  ctx.roundRect(node.position.x, node.position.y, node.size.width, node.size.height, 8);
  ctx.fillStyle = node.style.fill;
  ctx.fill();
  ctx.strokeStyle = isSelected ? '#3b82f6' : node.style.stroke;
  ctx.lineWidth = isSelected ? 3 : node.style.strokeWidth;
  ctx.stroke();
  ctx.restore();
}
```

## Registration

Register your plugin in `src/App.tsx`:

```typescript
import { MyPlugin } from './plugins/my-plugin/MyPlugin';

// Inside useMemo:
const myPlugin = new MyPlugin();
pluginManager.register(myPlugin);
```

## Passive vs Active Rendering

- **Active plugin**: receives all input events (mouse, keyboard)
- **All plugins**: render their owned node types regardless of which is active

This means sticky notes, images, and geometry shapes are always visible even when the user is in "Mind Map" mode.

## Plugin Manifest

Required for marketplace display:

```typescript
manifest: PluginManifest = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Short description',
  author: 'Your Name',
  category: 'shape',    // 'shape' | 'tool' | 'export' | 'utility'
  isBuiltIn: false,
  activatable: true,    // Can be the active mode?
};
```

## Events

Common events emitted via EventBus:

| Event | When |
|-------|------|
| `render:request` | Canvas needs redraw |
| `sync:canvas-updated` | Mind map was rebuilt from markdown |
| `node:selected` | Node selection changed |

## Best Practices

1. Always wrap mutations in Commands for undo/redo
2. Call `requestRender()` after state changes
3. Keep plugin state minimal — use the store for persistent data
4. Prefix all node types with your plugin ID
5. Clean up event listeners in `destroy()`
