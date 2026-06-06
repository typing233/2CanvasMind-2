import { IPluginV2, PluginContext, ToolbarContribution, PluginManifest } from '../../core/plugin-system/types';
import { CanvasNode, CanvasEdge, Point, DEFAULT_EDGE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { genId } from '../../utils/id';

type RouteType = 'straight' | 'bezier' | 'elbow';

export class ConnectorLinesPlugin implements IPluginV2 {
  id = 'connector';
  name = 'Connector Lines';
  version = '1.0.0';

  manifest: PluginManifest = {
    id: 'connector',
    name: 'Connector Lines',
    version: '1.0.0',
    description: 'Connect any nodes with customizable lines',
    author: 'CanvasMind',
    category: 'tool',
    isBuiltIn: true,
    activatable: true,
  };

  private ctx!: PluginContext;
  private routeType: RouteType = 'bezier';
  private isConnecting = false;
  private connectSourceId: string | null = null;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {
    this.isConnecting = false;
    this.connectSourceId = null;
  }
  destroy(): void {}

  ownsEdgeType(type: string): boolean {
    return type === 'connector';
  }

  contributeToolbar(): ToolbarContribution[] {
    return [
      { id: 'conn-straight', label: 'Straight', group: 'connector', onClick: () => { this.routeType = 'straight'; this.startConnecting(); } },
      { id: 'conn-bezier', label: 'Bezier', group: 'connector', onClick: () => { this.routeType = 'bezier'; this.startConnecting(); } },
      { id: 'conn-elbow', label: 'Elbow', group: 'connector', onClick: () => { this.routeType = 'elbow'; this.startConnecting(); } },
    ];
  }

  onCanvasMouseDown(point: Point): boolean {
    if (!this.isConnecting) return false;

    const nodes = Object.values(this.ctx.store.getDocument().nodes);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (this.hitTest(node, point)) {
        if (!this.connectSourceId) {
          this.connectSourceId = node.id;
          this.ctx.store.setSelection([node.id]);
          this.ctx.requestRender();
        } else if (this.connectSourceId !== node.id) {
          this.createConnection(this.connectSourceId, node.id);
          this.connectSourceId = null;
        }
        return true;
      }
    }
    return false;
  }

  onKeyDown(e: KeyboardEvent): boolean {
    if (e.key === 'Escape') {
      this.isConnecting = false;
      this.connectSourceId = null;
      return true;
    }
    return false;
  }

  renderEdge(ctx: CanvasRenderingContext2D, edge: CanvasEdge, nodes: Record<string, CanvasNode>, isSelected?: boolean): void {
    if (edge.type !== 'connector') return;
    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];
    if (!source || !target) return;

    const route = edge.style.routeType || 'bezier';
    const sx = source.position.x + source.size.width / 2;
    const sy = source.position.y + source.size.height / 2;
    const tx = target.position.x + target.size.width / 2;
    const ty = target.position.y + target.size.height / 2;

    ctx.save();
    ctx.strokeStyle = isSelected ? '#3b82f6' : edge.style.stroke;
    ctx.lineWidth = isSelected ? edge.style.strokeWidth + 2 : edge.style.strokeWidth;
    if (edge.style.dash) ctx.setLineDash(edge.style.dash);

    ctx.beginPath();
    if (route === 'straight') {
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
    } else if (route === 'bezier') {
      ctx.moveTo(sx, sy);
      const cpx1 = (sx + tx) / 2;
      const cpy1 = sy;
      const cpx2 = (sx + tx) / 2;
      const cpy2 = ty;
      ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, tx, ty);
    } else {
      const midX = (sx + tx) / 2;
      ctx.moveTo(sx, sy);
      ctx.lineTo(midX, sy);
      ctx.lineTo(midX, ty);
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();

    if (edge.style.arrowEnd) {
      this.drawArrow(ctx, sx, sy, tx, ty, route, edge.style.stroke);
    }

    ctx.restore();
  }

  private drawArrow(ctx: CanvasRenderingContext2D, _sx: number, _sy: number, tx: number, ty: number, route: string, color: string): void {
    let angle: number;
    if (route === 'elbow') {
      angle = tx > _sx ? 0 : Math.PI;
    } else {
      angle = Math.atan2(ty - _sy, tx - _sx);
    }
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -5);
    ctx.lineTo(-10, 5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  private startConnecting(): void {
    this.isConnecting = true;
    this.connectSourceId = null;
  }

  private createConnection(sourceId: string, targetId: string): void {
    const edgeId = genId();
    const edge: CanvasEdge = {
      id: edgeId,
      type: 'connector',
      sourceId,
      targetId,
      style: { ...DEFAULT_EDGE_STYLE, routeType: this.routeType },
    };

    const cmd: ICommand = {
      id: genId(),
      description: 'Create connector',
      execute: () => {
        this.ctx.store.addEdge(edge);
        this.ctx.store.setSelection([]);
        this.ctx.requestRender();
      },
      undo: () => {
        this.ctx.store.removeEdge(edgeId);
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
  }

  private hitTest(node: CanvasNode, point: Point): boolean {
    return (
      point.x >= node.position.x &&
      point.x <= node.position.x + node.size.width &&
      point.y >= node.position.y &&
      point.y <= node.position.y + node.size.height
    );
  }
}
