import { IPluginV2, PluginContext, ToolbarContribution, PluginManifest } from '../../core/plugin-system/types';
import { CanvasNode, CanvasEdge } from '../../core/data-model/types';
import { useCanvasStore } from '../../core/data-model/store';

export class ExportPlugin implements IPluginV2 {
  id = 'export';
  name = 'Export';
  version = '1.0.0';

  manifest: PluginManifest = {
    id: 'export',
    name: 'Export',
    version: '1.0.0',
    description: 'Export canvas as PNG or SVG',
    author: 'CanvasMind',
    category: 'export',
    isBuiltIn: true,
    activatable: false,
  };

  private ctx!: PluginContext;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  contributeToolbar(): ToolbarContribution[] {
    return [
      { id: 'export-png', label: 'Export PNG', group: 'export', onClick: () => this.exportPNG() },
      { id: 'export-svg', label: 'Export SVG', group: 'export', onClick: () => this.exportSVG() },
    ];
  }

  private exportPNG(): void {
    const { nodes, edges } = useCanvasStore.getState().document;
    const bounds = this.computeBounds(Object.values(nodes));
    if (!bounds) return;

    const padding = 40;
    const width = bounds.maxX - bounds.minX + padding * 2;
    const height = bounds.maxY - bounds.minY + padding * 2;
    const scale = 2;

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.translate(-bounds.minX + padding, -bounds.minY + padding);

    this.drawToContext(ctx, nodes, edges);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'canvasmind-export.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  private exportSVG(): void {
    const { nodes, edges } = useCanvasStore.getState().document;
    const bounds = this.computeBounds(Object.values(nodes));
    if (!bounds) return;

    const padding = 40;
    const width = bounds.maxX - bounds.minX + padding * 2;
    const height = bounds.maxY - bounds.minY + padding * 2;
    const offsetX = -bounds.minX + padding;
    const offsetY = -bounds.minY + padding;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
    svg += `<rect width="${width}" height="${height}" fill="white"/>\n`;
    svg += `<g transform="translate(${offsetX},${offsetY})">\n`;

    for (const edge of Object.values(edges)) {
      svg += this.edgeToSVG(edge, nodes);
    }

    for (const node of Object.values(nodes)) {
      svg += this.nodeToSVG(node);
    }

    svg += '</g>\n</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvasmind-export.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  private nodeToSVG(node: CanvasNode): string {
    const { position, size, style } = node;
    let shape = '';

    if (node.type === 'geo-circle') {
      shape = `<ellipse cx="${position.x + size.width / 2}" cy="${position.y + size.height / 2}" rx="${size.width / 2}" ry="${size.height / 2}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"/>`;
    } else if (node.type === 'flowchart-diamond') {
      const cx = position.x + size.width / 2;
      const cy = position.y + size.height / 2;
      shape = `<polygon points="${cx},${position.y} ${position.x + size.width},${cy} ${cx},${position.y + size.height} ${position.x},${cy}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"/>`;
    } else if (node.type === 'freehand-path') {
      const points = (node.data.points as Array<{ x: number; y: number }>) || [];
      if (points.length > 0) {
        const d = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
        shape = `<path d="${d}" fill="none" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    } else {
      const rx = style.borderRadius || 0;
      shape = `<rect x="${position.x}" y="${position.y}" width="${size.width}" height="${size.height}" rx="${rx}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"/>`;
    }

    const text = (node.data.text as string) || '';
    let textEl = '';
    if (text) {
      textEl = `<text x="${position.x + size.width / 2}" y="${position.y + size.height / 2}" text-anchor="middle" dominant-baseline="central" font-size="${style.fontSize}" font-family="${style.fontFamily}" fill="${style.fontColor}">${this.escapeXml(text)}</text>`;
    }

    return `${shape}\n${textEl}\n`;
  }

  private edgeToSVG(edge: CanvasEdge, nodes: Record<string, CanvasNode>): string {
    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];
    if (!source || !target) return '';

    const sx = source.position.x + source.size.width / 2;
    const sy = source.position.y + source.size.height / 2;
    const tx = target.position.x + target.size.width / 2;
    const ty = target.position.y + target.size.height / 2;

    const dashAttr = edge.style.dash ? ` stroke-dasharray="${edge.style.dash.join(',')}"` : '';
    return `<line x1="${sx}" y1="${sy}" x2="${tx}" y2="${ty}" stroke="${edge.style.stroke}" stroke-width="${edge.style.strokeWidth}"${dashAttr}/>\n`;
  }

  private drawToContext(ctx: CanvasRenderingContext2D, nodes: Record<string, CanvasNode>, edges: Record<string, CanvasEdge>): void {
    for (const edge of Object.values(edges)) {
      const source = nodes[edge.sourceId];
      const target = nodes[edge.targetId];
      if (!source || !target) continue;

      const sx = source.position.x + source.size.width / 2;
      const sy = source.position.y + source.size.height / 2;
      const tx = target.position.x + target.size.width / 2;
      const ty = target.position.y + target.size.height / 2;

      ctx.save();
      ctx.strokeStyle = edge.style.stroke;
      ctx.lineWidth = edge.style.strokeWidth;
      if (edge.style.dash) ctx.setLineDash(edge.style.dash);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();
    }

    for (const node of Object.values(nodes)) {
      const { position, size, style } = node;
      ctx.save();

      if (node.type === 'geo-circle') {
        ctx.beginPath();
        ctx.ellipse(position.x + size.width / 2, position.y + size.height / 2, size.width / 2, size.height / 2, 0, 0, Math.PI * 2);
      } else if (node.type === 'flowchart-diamond') {
        const cx = position.x + size.width / 2;
        const cy = position.y + size.height / 2;
        ctx.beginPath();
        ctx.moveTo(cx, position.y);
        ctx.lineTo(position.x + size.width, cy);
        ctx.lineTo(cx, position.y + size.height);
        ctx.lineTo(position.x, cy);
        ctx.closePath();
      } else if (node.type === 'freehand-path') {
        const points = (node.data.points as Array<{ x: number; y: number }>) || [];
        if (points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
          ctx.strokeStyle = style.stroke;
          ctx.lineWidth = style.strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.restore();
          continue;
        }
      } else {
        ctx.beginPath();
        ctx.roundRect(position.x, position.y, size.width, size.height, style.borderRadius || 0);
      }

      ctx.fillStyle = style.fill;
      ctx.fill();
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.strokeWidth;
      ctx.stroke();

      const text = (node.data.text as string) || '';
      if (text) {
        ctx.fillStyle = style.fontColor;
        ctx.font = `${style.fontSize}px ${style.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, position.x + size.width / 2, position.y + size.height / 2, size.width - 16);
      }
      ctx.restore();
    }
  }

  private computeBounds(nodes: CanvasNode[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (nodes.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + node.size.width);
      maxY = Math.max(maxY, node.position.y + node.size.height);
    }
    return { minX, minY, maxX, maxY };
  }

  private escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
