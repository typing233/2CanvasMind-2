import { NodeId, Point } from '../data-model/types';

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class SpatialIndex {
  private cellSize: number;
  private grid = new Map<string, Set<NodeId>>();
  private nodeCells = new Map<NodeId, Set<string>>();
  private nodeBounds = new Map<NodeId, AABB>();

  constructor(cellSize = 200) {
    this.cellSize = cellSize;
  }

  insert(id: NodeId, bounds: AABB): void {
    const cells = this.getCells(bounds);
    this.nodeCells.set(id, cells);
    this.nodeBounds.set(id, bounds);
    for (const cell of cells) {
      let set = this.grid.get(cell);
      if (!set) {
        set = new Set();
        this.grid.set(cell, set);
      }
      set.add(id);
    }
  }

  remove(id: NodeId): void {
    const cells = this.nodeCells.get(id);
    if (!cells) return;
    for (const cell of cells) {
      const set = this.grid.get(cell);
      if (set) {
        set.delete(id);
        if (set.size === 0) this.grid.delete(cell);
      }
    }
    this.nodeCells.delete(id);
    this.nodeBounds.delete(id);
  }

  update(id: NodeId, bounds: AABB): void {
    this.remove(id);
    this.insert(id, bounds);
  }

  query(viewport: AABB): Set<NodeId> {
    const result = new Set<NodeId>();
    const minCX = Math.floor(viewport.minX / this.cellSize);
    const minCY = Math.floor(viewport.minY / this.cellSize);
    const maxCX = Math.floor(viewport.maxX / this.cellSize);
    const maxCY = Math.floor(viewport.maxY / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const set = this.grid.get(`${cx}:${cy}`);
        if (set) {
          for (const id of set) result.add(id);
        }
      }
    }
    return result;
  }

  queryPoint(point: Point): NodeId[] {
    const cx = Math.floor(point.x / this.cellSize);
    const cy = Math.floor(point.y / this.cellSize);
    const set = this.grid.get(`${cx}:${cy}`);
    if (!set) return [];
    const results: NodeId[] = [];
    for (const id of set) {
      const b = this.nodeBounds.get(id);
      if (b && point.x >= b.minX && point.x <= b.maxX && point.y >= b.minY && point.y <= b.maxY) {
        results.push(id);
      }
    }
    return results;
  }

  clear(): void {
    this.grid.clear();
    this.nodeCells.clear();
    this.nodeBounds.clear();
  }

  getBounds(id: NodeId): AABB | undefined {
    return this.nodeBounds.get(id);
  }

  private getCells(bounds: AABB): Set<string> {
    const cells = new Set<string>();
    const minCX = Math.floor(bounds.minX / this.cellSize);
    const minCY = Math.floor(bounds.minY / this.cellSize);
    const maxCX = Math.floor(bounds.maxX / this.cellSize);
    const maxCY = Math.floor(bounds.maxY / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        cells.add(`${cx}:${cy}`);
      }
    }
    return cells;
  }
}
