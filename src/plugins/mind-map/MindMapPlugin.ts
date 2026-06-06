import { IPluginV2, PluginContext, ToolbarContribution, PluginManifest } from '../../core/plugin-system/types';
import { CanvasNode, CanvasEdge, Point, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { genId } from '../../utils/id';
import { layoutTree } from './tree-layout';

export class MindMapPlugin implements IPluginV2 {
  id = 'mindmap';
  name = 'Mind Map';
  version = '2.0.0';

  manifest: PluginManifest = {
    id: 'mindmap',
    name: 'Mind Map',
    version: '2.0.0',
    description: 'Create hierarchical mind maps with auto-layout',
    author: 'CanvasMind',
    category: 'shape',
    isBuiltIn: true,
    activatable: true,
  };

  private ctx!: PluginContext;
  private rootId: string | null = null;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  contributeToolbar(): ToolbarContribution[] {
    return [
      { id: 'mm-add-child', label: 'Add Child', group: 'mindmap', onClick: () => this.addChildToSelected() },
      { id: 'mm-add-sibling', label: 'Add Sibling', group: 'mindmap', onClick: () => this.addSibling() },
      { id: 'mm-delete', label: 'Delete', group: 'mindmap', onClick: () => this.deleteSelected() },
    ];
  }

  onCanvasDblClick(point: Point): void {
    const nodes = this.ctx.store.getDocument().nodes;
    const hasRoot = Object.values(nodes).some((n) => n.type === 'mindmap' && !n.parentId);
    if (!hasRoot) {
      this.createRoot(point);
    }
  }

  onKeyDown(e: KeyboardEvent): boolean {
    if (e.key === 'Tab') {
      e.preventDefault();
      this.addChildToSelected();
      return true;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      this.addSibling();
      return true;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.ctx.store.getSelectedNodeIds().size > 0) {
        this.deleteSelected();
        return true;
      }
    }
    return false;
  }

  renderNode(ctx: CanvasRenderingContext2D, node: CanvasNode, isSelected: boolean): void {
    if (node.type !== 'mindmap') return;
    const { position, size, style } = node;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(position.x, position.y, size.width, size.height, 12);
    ctx.fillStyle = node.parentId ? style.fill : '#dbeafe';
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#3b82f6' : style.stroke;
    ctx.lineWidth = isSelected ? 3 : style.strokeWidth;
    ctx.stroke();

    const text = (node.data.text as string) || '';
    if (text) {
      ctx.fillStyle = style.fontColor;
      ctx.font = `${node.parentId ? style.fontSize : style.fontSize + 2}px ${style.fontFamily || 'sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, position.x + size.width / 2, position.y + size.height / 2, size.width - 16);
    }
    ctx.restore();
  }

  renderEdge(ctx: CanvasRenderingContext2D, edge: CanvasEdge, nodes: Record<string, CanvasNode>, isSelected?: boolean): void {
    if (edge.type !== 'mindmap') return;
    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];
    if (!source || !target) return;

    const sx = source.position.x + source.size.width;
    const sy = source.position.y + source.size.height / 2;
    const tx = target.position.x;
    const ty = target.position.y + target.size.height / 2;

    ctx.save();
    ctx.strokeStyle = isSelected ? '#3b82f6' : edge.style.stroke;
    ctx.lineWidth = isSelected ? edge.style.strokeWidth + 2 : edge.style.strokeWidth;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const cpx = (sx + tx) / 2;
    ctx.bezierCurveTo(cpx, sy, cpx, ty, tx, ty);
    ctx.stroke();
    ctx.restore();
  }

  private createRoot(point: Point): void {
    const id = genId();
    const node: CanvasNode = {
      id,
      type: 'mindmap',
      position: { x: point.x - 60, y: point.y - 20 },
      size: { width: 120, height: 40 },
      data: { text: 'Central Topic' },
      children: [],
      style: { ...DEFAULT_NODE_STYLE, fill: '#dbeafe', borderRadius: 12 },
      locked: false,
    };

    const cmd: ICommand = {
      id: genId(),
      description: 'Create root mind map node',
      execute: () => {
        this.ctx.store.addNode(node);
        this.rootId = id;
        this.ctx.store.setSelection([id]);
        this.ctx.requestRender();
      },
      undo: () => {
        this.ctx.store.removeNode(id);
        this.rootId = null;
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
  }

  addChildToSelected(): void {
    const selectedIds = Array.from(this.ctx.store.getSelectedNodeIds());
    if (selectedIds.length === 0) return;

    const parentId = selectedIds[0];
    const parent = this.ctx.store.getNode(parentId);
    if (!parent || parent.type !== 'mindmap') return;

    const childId = genId();
    const edgeId = genId();

    const childNode: CanvasNode = {
      id: childId,
      type: 'mindmap',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 36 },
      data: { text: 'New Node' },
      parentId,
      children: [],
      style: { ...DEFAULT_NODE_STYLE, borderRadius: 12 },
      locked: false,
    };

    const edge: CanvasEdge = {
      id: edgeId,
      type: 'mindmap',
      sourceId: parentId,
      targetId: childId,
      style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
    };

    const cmd: ICommand = {
      id: genId(),
      description: 'Add mind map child',
      execute: () => {
        const p = this.ctx.store.getNode(parentId)!;
        this.ctx.store.updateNode(parentId, { children: [...(p.children || []), childId] });
        this.ctx.store.addNode(childNode);
        this.ctx.store.addEdge(edge);
        this.relayout();
        this.ctx.store.setSelection([childId]);
        this.ctx.requestRender();
      },
      undo: () => {
        this.ctx.store.removeEdge(edgeId);
        this.ctx.store.removeNode(childId);
        const p = this.ctx.store.getNode(parentId);
        if (p) {
          this.ctx.store.updateNode(parentId, {
            children: (p.children || []).filter((c) => c !== childId),
          });
        }
        this.relayout();
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
  }

  addSibling(): void {
    const selectedIds = Array.from(this.ctx.store.getSelectedNodeIds());
    if (selectedIds.length === 0) return;

    const selected = this.ctx.store.getNode(selectedIds[0]);
    if (!selected || selected.type !== 'mindmap' || !selected.parentId) return;

    const parentId = selected.parentId;
    const siblingId = genId();
    const edgeId = genId();

    const siblingNode: CanvasNode = {
      id: siblingId,
      type: 'mindmap',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 36 },
      data: { text: 'New Node' },
      parentId,
      children: [],
      style: { ...DEFAULT_NODE_STYLE, borderRadius: 12 },
      locked: false,
    };

    const edge: CanvasEdge = {
      id: edgeId,
      type: 'mindmap',
      sourceId: parentId,
      targetId: siblingId,
      style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
    };

    const cmd: ICommand = {
      id: genId(),
      description: 'Add mind map sibling',
      execute: () => {
        const p = this.ctx.store.getNode(parentId)!;
        this.ctx.store.updateNode(parentId, { children: [...(p.children || []), siblingId] });
        this.ctx.store.addNode(siblingNode);
        this.ctx.store.addEdge(edge);
        this.relayout();
        this.ctx.store.setSelection([siblingId]);
        this.ctx.requestRender();
      },
      undo: () => {
        this.ctx.store.removeEdge(edgeId);
        this.ctx.store.removeNode(siblingId);
        const p = this.ctx.store.getNode(parentId);
        if (p) {
          this.ctx.store.updateNode(parentId, {
            children: (p.children || []).filter((c) => c !== siblingId),
          });
        }
        this.relayout();
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
  }

  deleteSelected(): void {
    const selectedIds = Array.from(this.ctx.store.getSelectedNodeIds());
    if (selectedIds.length === 0) return;

    const nodeId = selectedIds[0];
    const node = this.ctx.store.getNode(nodeId);
    if (!node || node.type !== 'mindmap') return;

    const removedNodes: CanvasNode[] = [];
    const removedEdges: CanvasEdge[] = [];

    const collect = (id: string) => {
      const n = this.ctx.store.getNode(id);
      if (!n) return;
      removedNodes.push({ ...n });
      if (n.children) {
        for (const childId of n.children) collect(childId);
      }
    };
    collect(nodeId);

    const edges = this.ctx.store.getDocument().edges;
    for (const edge of Object.values(edges)) {
      if (removedNodes.some((n) => n.id === edge.sourceId || n.id === edge.targetId)) {
        removedEdges.push({ ...edge });
      }
    }

    const parentId = node.parentId;

    const cmd: ICommand = {
      id: genId(),
      description: 'Delete mind map node',
      execute: () => {
        for (const e of removedEdges) this.ctx.store.removeEdge(e.id);
        for (const n of removedNodes) this.ctx.store.removeNode(n.id);
        if (parentId) {
          const p = this.ctx.store.getNode(parentId);
          if (p) {
            this.ctx.store.updateNode(parentId, {
              children: (p.children || []).filter((c) => c !== nodeId),
            });
          }
        }
        this.ctx.store.setSelection([]);
        this.relayout();
        this.ctx.requestRender();
      },
      undo: () => {
        for (const n of removedNodes) this.ctx.store.addNode(n);
        for (const e of removedEdges) this.ctx.store.addEdge(e);
        if (parentId) {
          const p = this.ctx.store.getNode(parentId);
          if (p) {
            this.ctx.store.updateNode(parentId, {
              children: [...(p.children || []), nodeId],
            });
          }
        }
        this.relayout();
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
  }

  ownsNodeType(type: string): boolean {
    return type === 'mindmap';
  }

  ownsEdgeType(type: string): boolean {
    return type === 'mindmap';
  }

  onDropOnNode(draggedIds: string[], targetId: string, position: 'before' | 'after' | 'child'): void {
    if (draggedIds.length === 0) return;
    const draggedId = draggedIds[0];
    const dragged = this.ctx.store.getNode(draggedId);
    const target = this.ctx.store.getNode(targetId);
    if (!dragged || !target || dragged.type !== 'mindmap' || target.type !== 'mindmap') return;

    if (this.isDescendant(draggedId, targetId)) return;

    const oldParentId = dragged.parentId;
    const oldParent = oldParentId ? this.ctx.store.getNode(oldParentId) : null;
    const oldChildIndex = oldParent ? (oldParent.children || []).indexOf(draggedId) : -1;

    let newParentId: string;
    let insertIndex: number;

    if (position === 'child') {
      newParentId = targetId;
      const targetNode = this.ctx.store.getNode(targetId)!;
      insertIndex = (targetNode.children || []).length;
    } else {
      if (!target.parentId) return;
      newParentId = target.parentId;
      const parentNode = this.ctx.store.getNode(newParentId)!;
      const siblings = parentNode.children || [];
      const targetIndex = siblings.indexOf(targetId);
      insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

      if (oldParentId === newParentId && oldChildIndex < insertIndex) {
        insertIndex--;
      }
    }

    if (newParentId === draggedId) return;

    const oldEdge = Object.values(this.ctx.store.getDocument().edges)
      .find(e => e.type === 'mindmap' && e.targetId === draggedId);

    const newEdgeId = genId();

    const cmd: ICommand = {
      id: genId(),
      description: 'Reparent mind map node',
      execute: () => {
        if (oldParentId) {
          const oldP = this.ctx.store.getNode(oldParentId);
          if (oldP) {
            this.ctx.store.updateNode(oldParentId, {
              children: (oldP.children || []).filter(c => c !== draggedId),
            });
          }
        }
        if (oldEdge) this.ctx.store.removeEdge(oldEdge.id);

        this.ctx.store.updateNode(draggedId, { parentId: newParentId });
        const newP = this.ctx.store.getNode(newParentId);
        if (newP) {
          const children = (newP.children || []).filter(c => c !== draggedId);
          children.splice(insertIndex, 0, draggedId);
          this.ctx.store.updateNode(newParentId, { children });
        }
        this.ctx.store.addEdge({
          id: newEdgeId,
          type: 'mindmap',
          sourceId: newParentId,
          targetId: draggedId,
          style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
        });
        this.relayout();
        this.ctx.requestRender();
      },
      undo: () => {
        this.ctx.store.removeEdge(newEdgeId);
        const newP = this.ctx.store.getNode(newParentId);
        if (newP) {
          this.ctx.store.updateNode(newParentId, {
            children: (newP.children || []).filter(c => c !== draggedId),
          });
        }
        this.ctx.store.updateNode(draggedId, { parentId: oldParentId });
        if (oldParentId) {
          const oldP = this.ctx.store.getNode(oldParentId);
          if (oldP) {
            const children = [...(oldP.children || [])];
            if (oldChildIndex >= 0 && oldChildIndex <= children.length) {
              children.splice(oldChildIndex, 0, draggedId);
            } else {
              children.push(draggedId);
            }
            this.ctx.store.updateNode(oldParentId, { children });
          }
        }
        if (oldEdge) this.ctx.store.addEdge(oldEdge);
        this.relayout();
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
  }

  private isDescendant(ancestorId: string, nodeId: string): boolean {
    const node = this.ctx.store.getNode(nodeId);
    if (!node) return false;
    if (node.parentId === ancestorId) return true;
    if (node.parentId) return this.isDescendant(ancestorId, node.parentId);
    return false;
  }

  relayout(): void {
    const nodes = this.ctx.store.getDocument().nodes;
    const root = Object.values(nodes).find((n) => n.type === 'mindmap' && !n.parentId);
    if (!root) return;

    this.rootId = root.id;
    const origin = (root.position.x === 0 && root.position.y === 0)
      ? { x: 100, y: 300 }
      : root.position;
    const positions = layoutTree(root.id, nodes, origin);
    for (const [id, pos] of positions) {
      this.ctx.store.updateNode(id, { position: pos });
    }
    this.ctx.requestRender();
  }

  getRootId(): string | null {
    if (this.rootId) return this.rootId;
    const nodes = this.ctx.store.getDocument().nodes;
    const root = Object.values(nodes).find((n) => n.type === 'mindmap' && !n.parentId);
    return root?.id || null;
  }
}
