import { IPlugin, IPluginV2, PluginContext, PluginManifest } from './types';

export class PluginManager {
  private plugins = new Map<string, IPlugin>();
  private activePluginId: string | null = null;
  private enabledPluginIds = new Set<string>();
  private ctx: PluginContext;

  constructor(ctx: PluginContext) {
    this.ctx = ctx;
  }

  register(plugin: IPlugin): void {
    plugin.register(this.ctx);
    this.plugins.set(plugin.id, plugin);
    this.enabledPluginIds.add(plugin.id);
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

  getAllEnabled(): IPlugin[] {
    return Array.from(this.plugins.values()).filter(p => this.enabledPluginIds.has(p.id));
  }

  get(id: string): IPlugin | undefined {
    return this.plugins.get(id);
  }

  getPluginForNodeType(type: string): IPlugin | undefined {
    const prefix = type.split('-')[0];
    const byId = this.plugins.get(prefix);
    if (byId) return byId;

    for (const plugin of this.plugins.values()) {
      if ((plugin as IPluginV2).ownsNodeType?.(type)) return plugin;
    }
    return undefined;
  }

  getPluginForEdgeType(type: string): IPlugin | undefined {
    const prefix = type.split('-')[0];
    const byId = this.plugins.get(prefix);
    if (byId) return byId;

    for (const plugin of this.plugins.values()) {
      if ((plugin as IPluginV2).ownsEdgeType?.(type)) return plugin;
    }
    return undefined;
  }

  isEnabled(pluginId: string): boolean {
    return this.enabledPluginIds.has(pluginId);
  }

  setEnabled(pluginId: string, enabled: boolean): void {
    if (enabled) {
      this.enabledPluginIds.add(pluginId);
    } else {
      this.enabledPluginIds.delete(pluginId);
      if (this.activePluginId === pluginId) {
        this.activePluginId = null;
        this.ctx.store.setActivePlugin(null);
      }
    }
    this.ctx.requestRender();
  }

  getManifests(): PluginManifest[] {
    return Array.from(this.plugins.values())
      .map(p => (p as IPluginV2).manifest)
      .filter((m): m is PluginManifest => !!m);
  }

  destroy(): void {
    for (const plugin of this.plugins.values()) {
      plugin.destroy();
    }
    this.plugins.clear();
  }
}
