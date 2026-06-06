import { IPluginV2, PluginContext, ToolbarContribution, PluginManifest } from '../../core/plugin-system/types';
import { CanvasNode, Point, DEFAULT_NODE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { genId } from '../../utils/id';

const STICKY_COLORS = [
  { id: 'yellow', color: '#fef3c7', border: '#f59e0b' },
  { id: 'pink', color: '#fce7f3', border: '#ec4899' },
  { id: 'green', color: '#d1fae5', border: '#10b981' },
  { id: 'blue', color: '#dbeafe', border: '#3b82f6' },
];

export class StickyNotesPlugin implements IPluginV2 {
  id = 'sticky';
  name = 'Sticky Notes';
  version = '1.0.0';

  manifest: PluginManifest = {
    id: 'sticky',
    name: 'Sticky Notes',
    version: '1.0.0',
    description: 'Add colored sticky notes to canvas',
    author: 'CanvasMind',
    category: 'shape',
    isBuiltIn: true,
    activatable: true,
  };

  private ctx!: PluginContext;
  private currentColor = STICKY_COLORS[0];

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  ownsNodeType(type: string): boolean {
    return type === 'sticky-note';
  }

  contributeToolbar(): ToolbarContribution[] {
    return STICKY_COLORS.map((c) => ({
      id: `sticky-${c.id}`,
      label: c.id.charAt(0).toUpperCase() + c.id.slice(1),
      group: 'sticky',
      onClick: () => { this.currentColor = c; },
    }));
  }

  onCanvasDblClick(point: Point): void {
    this.createNote(point);
  }

  renderNode(ctx: CanvasRenderingContext2D, node: CanvasNode, isSelected: boolean): void {
    if (node.type !== 'sticky-note') return;
    const { position, size, style } = node;

    ctx.save();

    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    ctx.roundRect(position.x, position.y, size.width, size.height, 4);
    ctx.fillStyle = style.fill;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = isSelected ? '#3b82f6' : style.stroke;
    ctx.lineWidth = isSelected ? 2.5 : 1;
    ctx.stroke();

    const text = (node.data.text as string) || '';
    if (text) {
      ctx.fillStyle = style.fontColor;
      ctx.font = `${style.fontSize}px ${style.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = this.wrapText(text, size.width - 16);
      const lineHeight = style.fontSize + 4;
      const startY = position.y + size.height / 2 - (lines.length - 1) * lineHeight / 2;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], position.x + size.width / 2, startY + i * lineHeight, size.width - 16);
      }
    }
    ctx.restore();
  }

  private createNote(point: Point): void {
    const text = prompt('Note text:') || 'Note';
    const id = genId();
    const node: CanvasNode = {
      id,
      type: 'sticky-note',
      position: { x: point.x - 75, y: point.y - 75 },
      size: { width: 150, height: 150 },
      data: { text },
      style: {
        ...DEFAULT_NODE_STYLE,
        fill: this.currentColor.color,
        stroke: this.currentColor.border,
        fontFamily: 'sans-serif',
        fontSize: 13,
        borderRadius: 4,
      },
      locked: false,
    };

    const cmd: ICommand = {
      id: genId(),
      description: 'Create sticky note',
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

  private wrapText(text: string, maxWidth: number): string[] {
    if (text.length * 7 <= maxWidth) return [text];
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (test.length * 7 > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }
}
