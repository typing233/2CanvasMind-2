import { IPlugin, PluginContext } from './types';

export class PluginManager {
  private plugins = new Map<string, IPlugin>();
  private activePluginId: string | null = null;
  private ctx: PluginContext;

  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }

  register(plugin: IPlugin): void {
    plugin.register(this.ctx);
    this.plugins.set(plugin.id, plugin);
  }

  activate(pluginId: string): void {
    if (this.activePluginId === pluginId) return;
    if (this.activePluginId) {
      this.plugins.get(this.activePluginId)?.deactivate();
    }
    this.activePluginId = pluginId;
    this.plugins.get(pluginId)?.activate();
    this.ctx.store.setActivePlugin(pluginId);
    this.ctx.requestRender();
  }

  getActive(): IPlugin | undefined {
    return this.activePluginId ? this.plugins.get(this.activePluginId) : undefined;
  }

  getActiveId(): string | null {
    return this.activePluginId;
  }

  getAll(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  get(id: string): IPlugin | undefined {
    return this.plugins.get(id);
  }

  destroy(): void {
    for (const plugin of this.plugins.values()) {
      plugin.destroy();
    }
    this.plugins.clear();
  }
}
