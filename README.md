# CanvasMind

An open-source whiteboard tool combining mind maps, flowcharts, and freehand drawing with a plugin ecosystem.

## Features

**Core Drawing Modes**
- Mind Map: hierarchical tree with auto-layout, keyboard shortcuts (Tab/Enter/Delete)
- Flowchart: rectangle/diamond/rounded shapes with orthogonal connection routing
- Freehand Drawing: pen tool with path simplification and adjustable stroke

**V2.0 Highlights**
- Style Editing Panel: complete color, font, stroke, and opacity editing for all node types
- Drag-and-Drop Reorganization: reparent mind map nodes by dragging onto other nodes
- Cross-Mode Conversion: right-click to convert flowchart nodes to mind map nodes and vice versa
- Plugin Marketplace: enable/disable plugins through a built-in marketplace UI
- 5 Built-in Plugins: Sticky Notes, Image Insert, Connector Lines, Geometry Shapes, Export PNG/SVG
- Bidirectional Markdown Sync: real-time sync (150ms) between markdown editor and mind map; flowchart-to-markdown export
- Performance: spatial indexing with virtual rendering (only visible nodes rendered)
- i18n: Chinese and English language support

**Always Available**
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- Pan (Space+drag or middle mouse) and Zoom (scroll wheel)
- Save/Load documents as JSON
- Resizable markdown editor panel

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 6 |
| UI | React 19 |
| State | Zustand 5 |
| Rendering | HTML5 Canvas 2D (custom engine) |
| Editor | CodeMirror 6 |
| Styling | Tailwind CSS 4 |
| Build | Vite 8 |

## Architecture

```
src/
  core/         Data model, plugin system, commands, event bus, spatial index
  engine/       Canvas engine, renderer, input handler, hit testing, drag-drop
  plugins/      8 built-in plugins
  panels/       Style editor, markdown panel, marketplace panel
  sync/         Markdown <-> canvas sync engine
  ui/           Toolbar, file actions, context menu
  i18n/         Internationalization (en/zh)
```

See [docs/architecture.md](docs/architecture.md) for the full system design.

## Plugin Development

CanvasMind is extensible through the `IPluginV2` interface. See [docs/plugin-development.md](docs/plugin-development.md) for a complete guide.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
