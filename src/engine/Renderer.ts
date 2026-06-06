import { CanvasNode, CanvasEdge, Point } from '../core/data-model/types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  clear(width: number, height: number): void {
    this.ctx.clearRect(0, 0, width, height);
  }

  drawGrid(viewport: { x: number; y: number; zoom: number }, width: number, height: number): void {
    const ctx = this.ctx;
    const gridSize = 40;
    const zoom = viewport.zoom;
    const offsetX = viewport.x % (gridSize * zoom);
    const offsetY = viewport.y % (gridSize * zoom);

    ctx.save();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = offsetX; x < width; x += gridSize * zoom) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += gridSize * zoom) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();
    ctx.restore();
  }

  drawRect(node: CanvasNode, isSelected: boolean): void {
    const ctx = this.ctx;
    const { position, size, style } = node;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(position.x, position.y, size.width, size.height, style.borderRadius);
    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#3b82f6' : style.stroke;
    ctx.lineWidth = isSelected ? style.strokeWidth + 1 : style.strokeWidth;
    ctx.stroke();

    const text = (node.data.text as string) || '';
    if (text) {
      ctx.fillStyle = style.fontColor;
      ctx.font = `${style.fontSize}px ${style.fontFamily || 'sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = position.x + size.width / 2;
      const cy = position.y + size.height / 2;
      this.drawWrappedText(text, cx, cy, size.width - 16);
    }
    ctx.restore();
  }

  drawDiamond(node: CanvasNode, isSelected: boolean): void {
    const ctx = this.ctx;
    const { position, size, style } = node;
    const cx = position.x + size.width / 2;
    const cy = position.y + size.height / 2;
    const hw = size.width / 2;
    const hh = size.height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, position.y);
    ctx.lineTo(position.x + size.width, cy);
    ctx.lineTo(cx, position.y + size.height);
    ctx.lineTo(position.x, cy);
    ctx.closePath();
    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#3b82f6' : style.stroke;
    ctx.lineWidth = isSelected ? style.strokeWidth + 1 : style.strokeWidth;
    ctx.stroke();

    const text = (node.data.text as string) || '';
    if (text) {
      ctx.fillStyle = style.fontColor;
      ctx.font = `${style.fontSize}px ${style.fontFamily || 'sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.drawWrappedText(text, cx, cy, hw * 1.2);
    }
    ctx.restore();
  }

  drawEdge(edge: CanvasEdge, nodes: Record<string, CanvasNode>, isSelected = false): void {
    const ctx = this.ctx;
    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];
    if (!source || !target) return;

    const points = edge.waypoints && edge.waypoints.length > 0
      ? edge.waypoints
      : this.computeSimpleEdge(source, target);

    ctx.save();
    ctx.strokeStyle = isSelected ? '#3b82f6' : edge.style.stroke;
    ctx.lineWidth = isSelected ? edge.style.strokeWidth + 2 : edge.style.strokeWidth;
    if (edge.style.dash) {
      ctx.setLineDash(edge.style.dash);
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    if (edge.style.arrowEnd && points.length >= 2) {
      this.drawArrowHead(points[points.length - 2], points[points.length - 1]);
    }

    ctx.restore();
  }

  drawFreehandPath(node: CanvasNode, isSelected: boolean): void {
    const ctx = this.ctx;
    const points = node.data.points as Point[] | undefined;
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
    ctx.restore();
  }

  drawSelectionBox(start: Point, end: Point): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  private drawArrowHead(from: Point, to: Point): void {
    const ctx = this.ctx;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 10;

    ctx.save();
    ctx.translate(to.x, to.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
  }

  private computeSimpleEdge(source: CanvasNode, target: CanvasNode): Point[] {
    const sx = source.position.x + source.size.width / 2;
    const sy = source.position.y + source.size.height;
    const tx = target.position.x + target.size.width / 2;
    const ty = target.position.y;
    return [{ x: sx, y: sy }, { x: tx, y: ty }];
  }

  private drawWrappedText(text: string, cx: number, cy: number, maxWidth: number): void {
    const ctx = this.ctx;
    const lines = text.split('\n');
    const lineHeight = parseInt(ctx.font) * 1.3;
    const startY = cy - ((lines.length - 1) * lineHeight) / 2;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (ctx.measureText(line).width > maxWidth) {
        line = line.substring(0, Math.floor(line.length * maxWidth / ctx.measureText(line).width)) + '…';
      }
      ctx.fillText(line, cx, startY + i * lineHeight);
    }
  }
}
