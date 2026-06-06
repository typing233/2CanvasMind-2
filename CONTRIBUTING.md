# Contributing to CanvasMind

Thank you for considering contributing to CanvasMind!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/canvasmind/canvasmind.git
cd canvasmind

# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Build for production
npm run build
```

## Project Structure

```
src/
  core/           - Data model, plugin system, commands, event bus, viewport, spatial index
  engine/         - Canvas rendering engine, input handler, hit testing, drag-drop
  plugins/        - Built-in plugins (mind-map, flowchart, freehand, sticky-notes, etc.)
  panels/         - React UI panels (Markdown editor, Style panel, Marketplace)
  sync/           - Markdown <-> Canvas synchronization
  ui/             - React UI components (Toolbar, FileActions, ContextMenu)
  i18n/           - Internationalization framework
```

## Creating a Plugin

See [docs/plugin-development.md](docs/plugin-development.md) for the full guide.

A minimal plugin:

```typescript
import { IPluginV2, PluginContext, PluginManifest } from './core/plugin-system/types';

export class MyPlugin implements IPluginV2 {
  id = 'my-plugin';
  name = 'My Plugin';
  version = '1.0.0';

  manifest: PluginManifest = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Does something',
    author: 'You',
    category: 'shape',
    isBuiltIn: false,
    activatable: true,
  };

  register(ctx: PluginContext): void { /* store ctx */ }
  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  ownsNodeType(type: string): boolean {
    return type.startsWith('my-plugin');
  }
}
```

## Pull Request Process

1. Fork the repo and create your branch from `main`
2. Add/update relevant tests if applicable
3. Ensure `npm run typecheck` and `npm run lint` pass
4. Update documentation if you changed APIs
5. Submit a PR with a clear description

## Code Style

- TypeScript strict mode
- No comments unless explaining non-obvious "why"
- Use existing patterns (Command pattern for mutations, Event Bus for decoupling)
- Keep plugins self-contained

## Reporting Bugs

Open a GitHub issue with:
- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS information
