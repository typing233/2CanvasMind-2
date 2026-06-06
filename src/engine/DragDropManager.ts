import { NodeId, Point, CanvasNode } from '../core/data-model/types';
import { CanvasStore } from '../core/data-model/store';

export type DropPosition = 'before' | 'after' | 'child';

export interface DropTarget {
  nodeId: NodeId;
  position: DropPosition;
}

export class DragDropManager {
  private store: CanvasStore;
  private draggingIds: Set<NodeId> = new Set();
  private dropTarget: DropTarget | null = null;
  private active = false;

  constructor(store: CanvasStore) {
    this.store = store;
  }

  startDrag(nodeIds: Set<NodeId>): void {
    this.draggingIds = new Set(nodeIds);
    this.active = true;
    this.dropTarget = null;
  }

  isActive(): boolean {
    return this.active;
  }

  getDraggingIds(): Set<NodeId> {
    return this.draggingIds;
  }

  getDropTarget(): DropTarget | null {
    return this.dropTarget;
  }

  updateDropTarget(canvasPoint: Point, nodes: Record<string, CanvasNode>): DropTarget | null {
    if (!this.active) return null;

    let closest: { id: string; dist: number; position: DropPosition } | null = null;

    for (const node of Object.values(nodes)) {
      if (this.draggingIds.has(node.id)) continue;

      const cx = node.position.x + node.size.width / 2;
      const cy = node.position.y + node.size.height / 2;
      const dx = canvasPoint.x - cx;
      const dy = canvasPoint.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 80) continue;

      const withinX = canvasPoint.x >= node.position.x && canvasPoint.x <= node.position.x + node.size.width;
      const withinY = canvasPoint.y >= node.position.y && canvasPoint.y <= node.position.y + node.size.height;

      let position: DropPosition = 'child';
      if (withinX && withinY) {
        const relY = (canvasPoint.y - node.position.y) / node.size.height;
        if (relY < 0.25) position = 'before';
        else if (relY > 0.75) position = 'after';
        else position = 'child';
      }

      if (!closest || dist < closest.dist) {
        closest = { id: node.id, dist, position };
      }
    }

    this.dropTarget = closest ? { nodeId: closest.id, position: closest.position } : null;
    return this.dropTarget;
  }

  endDrag(): DropTarget | null {
    const target = this.dropTarget;
    this.reset();
    return target;
  }

  reset(): void {
    this.active = false;
    this.draggingIds.clear();
    this.dropTarget = null;
  }
}
