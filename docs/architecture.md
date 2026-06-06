# CanvasMind Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React UI Layer                         │
│  ┌─────────┐ ┌────────────┐ ┌────────┐ ┌─────────────┐ │
│  │ Toolbar │ │ StylePanel │ │MarkdownPanel│ │Marketplace │ │
│  └────┬────┘ └─────┬──────┘ └────┬───┘ └─────────────┘ │
├───────┼─────────────┼─────────────┼──────────────────────┤
│       │         Core Layer        │                       │
│  ┌────▼────┐  ┌─────▼─────┐  ┌───▼──────┐              │
│  │PluginMgr│  │CanvasStore│  │SyncEngine│              │
│  └────┬────┘  └─────┬─────┘  └──────────┘              │
│       │              │                                    │
│  ┌────▼────┐  ┌─────▼─────┐  ┌──────────┐              │
│  │EventBus │  │CommandHist│  │ Spatial  │              │
│  └─────────┘  └───────────┘  │  Index   │              │
│                               └──────────┘              │
├──────────────────────────────────────────────────────────┤
│                  Canvas Engine                            │
│  ┌──────────┐ ┌───────────┐ ┌─────────┐ ┌────────────┐ │
│  │ Renderer │ │InputHandler│ │HitTester│ │DragDropMgr│ │
│  └──────────┘ └───────────┘ └─────────┘ └────────────┘ │
├──────────────────────────────────────────────────────────┤
│                   Plugin Layer                            │
│  ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────┐ ┌───────┐ │
│  │MindMap │ │Flowchart│ │Freehand│ │Sticky│ │Geo    │ │
│  └────────┘ └─────────┘ └────────┘ └──────┘ └───────┘ │
│  ┌────────┐ ┌─────────┐ ┌────────┐                     │
│  │Image   │ │Connector│ │ Export │                      │
│  └────────┘ └─────────┘ └────────┘                     │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User Input** → `InputHandler` → active plugin's event handler OR drag/select
2. **State Mutation** → `ICommand.execute()` → `CanvasStore.updateNode/addNode/...`
3. **Render Trigger** → `EventBus.emit('render:request')` → `CanvasEngine.requestRender()`
4. **Render Frame** → `SpatialIndex.query(viewport)` → iterate visible nodes → plugin.renderNode()

## Key Patterns

### Command Pattern (Undo/Redo)
All mutations go through `ICommand` objects with `execute()` and `undo()` methods.
`CommandHistory` maintains undo/redo stacks (max 100).

### Plugin System
- **IPlugin** (V1): base interface — register, activate, deactivate, renderNode, renderEdge, input events
- **IPluginV2** (V2): extends with ownsNodeType, canAcceptDrop, onDropOnNode, contributeContextMenu
- Single active plugin controls input; ALL plugins render their owned node types passively
- Plugins contribute toolbar buttons via `contributeToolbar()`

### Spatial Indexing
Grid-based spatial index (200px cells) enables O(1) viewport culling.
Only nodes within the visible viewport are rendered each frame.

### Bidirectional Sync
`SyncEngine` maintains a mapping between markdown lines and mind map nodes.
Changes in either direction are debounced (150ms) and applied via commands.

## Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `CanvasStore` (Zustand) | Single source of truth for document state |
| `PluginManager` | Plugin lifecycle, type routing, enable/disable |
| `CanvasEngine` | requestAnimationFrame loop, viewport culling |
| `InputHandler` | Mouse/keyboard → plugin delegation, drag-drop |
| `SpatialIndex` | Fast spatial queries for rendering and hit testing |
| `CommandHistory` | Undo/redo stack management |
| `EventBus` | Decoupled pub/sub communication |
| `SyncEngine` | Markdown ↔ Canvas bidirectional sync |
| `DragDropManager` | Drag state machine, drop target detection |
| `NodeConverter` | Cross-mode type conversion registry |
