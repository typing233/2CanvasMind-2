import { IPluginV2, PluginContext, ToolbarContribution, PluginManifest } from '../../core/plugin-system/types';
import { CanvasNode, Point, DEFAULT_NODE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { genId } from '../../utils/id';

export class ImageInsertPlugin implements IPluginV2 {
  id = 'image';
  name = 'Image Insert';
  version = '1.0.0';

  manifest: PluginManifest = {
    id: 'image',
    name: 'Image Insert',
    version: '1.0.0',
    description: 'Insert images onto the canvas',
    author: 'CanvasMind',
    category: 'tool',
    isBuiltIn: true,
    activatable: true,
  };

  private ctx!: PluginContext;
  private imageCache = new Map<string, HTMLImageElement>();

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {
    this.imageCache.clear();
  }

  ownsNodeType(type: string): boolean {
    return type === 'image-node';
  }

  contributeToolbar(): ToolbarContribution[] {
    return [
      {
        id: 'img-insert',
        label: 'Insert Image',
        group: 'image',
        onClick: () => this.openFilePicker(),
      },
    ];
  }

  renderNode(ctx: CanvasRenderingContext2D, node: CanvasNode, isSelected: boolean): void {
    if (node.type !== 'image-node') return;
    const { position, size } = node;
    const src = node.data.src as string;

    ctx.save();

    let img = this.imageCache.get(src);
    if (!img) {
      img = new Image();
      img.src = src;
      this.imageCache.set(src, img);
      img.onload = () => this.ctx.requestRender();
    }

    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, position.x, position.y, size.width, size.height);
    } else {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(position.x, position.y, size.width, size.height);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', position.x + size.width / 2, position.y + size.height / 2);
    }

    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(position.x, position.y, size.width, size.height);
    }

    ctx.restore();
  }

  private openFilePicker(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        this.insertImage(dataUrl);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  private insertImage(src: string): void {
    const id = genId();
    const node: CanvasNode = {
      id,
      type: 'image-node',
      position: { x: 200, y: 200 },
      size: { width: 200, height: 150 },
      data: { src },
      style: { ...DEFAULT_NODE_STYLE, fill: 'transparent', stroke: 'transparent', fontFamily: 'sans-serif' },
      locked: false,
    };

    const cmd: ICommand = {
      id: genId(),
      description: 'Insert image',
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
  }
}
