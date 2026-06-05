import { IPlugin, PluginContext, ToolbarContribution } from '../../core/plugin-system/types';
import { CanvasNode, Point, DEFAULT_NODE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { genId } from '../../utils/id';

export class FreehandPlugin implements IPlugin {
  id = 'freehand';
  name = 'Free Draw';
  version = '1.0.0';

  private ctx!: PluginContext;
  private isDrawing = false;
  private currentPoints: Point[] = [];
  private strokeColor = '#1f2937';
  private strokeWidth = 3;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {
    this.isDrawing = false;
    this.currentPoints = [];
  }
  destroy(): void {}

  contributeToolbar(): ToolbarContribution[] {
    return [
      { id: 'fd-thin', label: 'Thin', group: 'freehand', onClick: () => { this.strokeWidth = 2; } },
      { id: 'fd-medium', label: 'Medium', group: 'freehand', onClick: () => { this.strokeWidth = 4; } },
      { id: 'fd-thick', label: 'Thick', group: 'freehand', onClick: () => { this.strokeWidth = 8; } },
      { id: 'fd-black', label: 'Black', group: 'freehand', onClick: () => { this.strokeColor = '#1f2937'; } },
      { id: 'fd-red', label: 'Red', group: 'freehand', onClick: () => { this.strokeColor = '#dc2626'; } },
      { id: 'fd-blue', label: 'Blue', group: 'freehand', onClick: () => { this.strokeColor = '#2563eb'; } },
    ];
  }

  onCanvasMouseDown(point: Point): boolean {
    this.isDrawing = true;
    this.currentPoints = [point];
    return true;
  }

  onCanvasMouseMove(point: Point): void {
    if (!this.isDrawing) return;
    this.currentPoints.push(point);
    this.ctx.requestRender();
  }

  onCanvasMouseUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentPoints.length < 3) {
      this.currentPoints = [];
      return;
    }

    const simplified = this.simplifyPath(this.currentPoints, 2);
    const bounds = this.getBounds(simplified);
    const id = genId();

    const node: CanvasNode = {
      id,
      type: 'freehand-path',
      position: bounds.position,
      size: bounds.size,
      data: { points: simplified },
      style: {
        ...DEFAULT_NODE_STYLE,
        stroke: this.strokeColor,
        strokeWidth: this.strokeWidth,
        fill: 'transparent',
      },
      locked: false,
    };

    const cmd: ICommand = {
      id: genId(),
      description: 'Draw freehand path',
      execute: () => {
        this.ctx.store.addNode(node);
        this.ctx.requestRender();
      },
      undo: () => {
        this.ctx.store.removeNode(id);
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
    this.currentPoints = [];
  }

  renderNode(ctx: CanvasRenderingContext2D, node: CanvasNode, isSelected: boolean): void {
    if (node.type !== 'freehand-path') return;
    const points = node.data.points as Point[];
    if (!points || points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = isSelected ? '#3b82f6' : node.style.stroke;
    ctx.lineWidth = node.style.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        node.position.x - 4, node.position.y - 4,
        node.size.width + 8, node.size.height + 8,
      );
    }
    ctx.restore();
  }

  getLiveStroke(): { points: Point[]; color: string; width: number } | null {
    if (!this.isDrawing || this.currentPoints.length < 2) return null;
    return { points: this.currentPoints, color: this.strokeColor, width: this.strokeWidth };
  }

  private simplifyPath(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;
    return this.rdp(points, 0, points.length - 1, tolerance);
  }

  private rdp(points: Point[], start: number, end: number, tolerance: number): Point[] {
    let maxDist = 0;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      const dist = this.perpendicularDist(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > tolerance) {
      const left = this.rdp(points, start, maxIdx, tolerance);
      const right = this.rdp(points, maxIdx, end, tolerance);
      return [...left.slice(0, -1), ...right];
    }

    return [points[start], points[end]];
  }

  private perpendicularDist(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  private getBounds(points: Point[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return {
      position: { x: minX, y: minY },
      size: { width: maxX - minX || 1, height: maxY - minY || 1 },
    };
  }
}
