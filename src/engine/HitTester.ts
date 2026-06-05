import { CanvasNode, CanvasEdge, Point } from '../core/data-model/types';

export class HitTester {
  hitTestNode(node: CanvasNode, point: Point): boolean {
    if (node.type === 'flowchart-diamond') {
      return this.hitDiamond(node, point);
    }
    if (node.type === 'freehand-path') {
      return this.hitPath(node, point);
    }
    return this.hitRect(node, point);
  }

  hitTestEdge(edge: CanvasEdge, point: Point, nodes: Record<string, CanvasNode>): boolean {
    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];
    if (!source || !target) return false;

    const points = edge.waypoints && edge.waypoints.length > 0
      ? edge.waypoints
      : this.getDefaultEdgePoints(source, target);

    return this.isPointNearPolyline(point, points, 6);
  }

  private hitRect(node: CanvasNode, point: Point): boolean {
    const { position, size } = node;
    return (
      point.x >= position.x &&
      point.x <= position.x + size.width &&
      point.y >= position.y &&
      point.y <= position.y + size.height
    );
  }

  private hitDiamond(node: CanvasNode, point: Point): boolean {
    const { position, size } = node;
    const cx = position.x + size.width / 2;
    const cy = position.y + size.height / 2;
    const dx = Math.abs(point.x - cx) / (size.width / 2);
    const dy = Math.abs(point.y - cy) / (size.height / 2);
    return dx + dy <= 1;
  }

  private hitPath(node: CanvasNode, point: Point): boolean {
    const points = node.data.points as Point[] | undefined;
    if (!points || points.length < 2) return false;
    return this.isPointNearPolyline(point, points, Math.max(node.style.strokeWidth * 2, 8));
  }

  private isPointNearPolyline(point: Point, polyline: Point[], threshold: number): boolean {
    for (let i = 0; i < polyline.length - 1; i++) {
      const dist = this.pointToSegmentDist(point, polyline[i], polyline[i + 1]);
      if (dist <= threshold) return true;
    }
    return false;
  }

  private pointToSegmentDist(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: a.x + t * dx, y: a.y + t * dy };
    return Math.hypot(p.x - proj.x, p.y - proj.y);
  }

  private getDefaultEdgePoints(source: CanvasNode, target: CanvasNode): Point[] {
    return [
      { x: source.position.x + source.size.width / 2, y: source.position.y + source.size.height },
      { x: target.position.x + target.size.width / 2, y: target.position.y },
    ];
  }
}
