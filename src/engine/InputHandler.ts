import { Point } from '../core/data-model/types';
import { ViewportManager } from '../core/viewport/ViewportManager';
import { PluginManager } from '../core/plugin-system/PluginManager';
import { useCanvasStore, CanvasStore } from '../core/data-model/store';
import { CommandHistory } from '../core/commands/CommandHistory';
import { ICommand } from '../core/commands/Command';
import { HitTester } from './HitTester';
import { DragDropManager } from './DragDropManager';
import { IPluginV2 } from '../core/plugin-system/types';
import { genId } from '../utils/id';

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private viewport: ViewportManager;
  private plugins: PluginManager;
  private store: CanvasStore;
  private commandHistory: CommandHistory;
  private hitTester: HitTester;
  private dragDropManager: DragDropManager;
  private requestRender: () => void;

  private isPanning = false;
  private isDragging = false;
  private lastMouse: Point = { x: 0, y: 0 };
  private dragStartCanvas: Point = { x: 0, y: 0 };
  private dragStartPositions: Map<string, Point> = new Map();
  private spaceHeld = false;
  private dragDistance = 0;

  constructor(
    canvas: HTMLCanvasElement,
    viewport: ViewportManager,
    plugins: PluginManager,
    store: CanvasStore,
    commandHistory: CommandHistory,
    hitTester: HitTester,
    requestRender: () => void,
  ) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.plugins = plugins;
    this.store = store;
    this.commandHistory = commandHistory;
    this.hitTester = hitTester;
    this.dragDropManager = new DragDropManager(store);
    this.requestRender = requestRender;
    this.bind();
  }

  private bind(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDblClick);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDblClick);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  getDragDropManager(): DragDropManager {
    return this.dragDropManager;
  }

  private onMouseDown = (e: MouseEvent): void => {
    const screenPt = this.getMousePos(e);
    const canvasPt = this.viewport.screenToCanvas(screenPt);
    this.lastMouse = screenPt;

    if (this.spaceHeld || e.button === 1) {
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    const plugin = this.plugins.getActive();
    if (plugin?.onCanvasMouseDown?.(canvasPt, e)) return;

    const state = useCanvasStore.getState();
    const nodes = Object.values(state.document.nodes);
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (this.hitTester.hitTestNode(nodes[i], canvasPt)) {
        state.setSelection([nodes[i].id]);
        this.isDragging = true;
        this.dragDistance = 0;
        this.dragStartCanvas = canvasPt;
        this.dragStartPositions.clear();
        for (const nodeId of useCanvasStore.getState().selectedNodeIds) {
          const n = useCanvasStore.getState().getNode(nodeId);
          if (n) this.dragStartPositions.set(nodeId, { ...n.position });
        }
        this.requestRender();
        return;
      }
    }

    state.setSelection([]);
    this.requestRender();
  };

  private onMouseMove = (e: MouseEvent): void => {
    const screenPt = this.getMousePos(e);
    const canvasPt = this.viewport.screenToCanvas(screenPt);

    if (this.isPanning) {
      const dx = screenPt.x - this.lastMouse.x;
      const dy = screenPt.y - this.lastMouse.y;
      this.viewport.pan(dx, dy);
      this.lastMouse = screenPt;
      this.requestRender();
      return;
    }

    if (this.isDragging) {
      const dx = canvasPt.x - this.dragStartCanvas.x;
      const dy = canvasPt.y - this.dragStartCanvas.y;
      this.dragStartCanvas = canvasPt;
      this.dragDistance += Math.abs(dx) + Math.abs(dy);

      const state = useCanvasStore.getState();
      for (const nodeId of state.selectedNodeIds) {
        const node = state.getNode(nodeId);
        if (node && !node.locked) {
          state.updateNode(nodeId, {
            position: { x: node.position.x + dx, y: node.position.y + dy },
          });
        }
      }

      if (this.dragDistance > 20) {
        if (!this.dragDropManager.isActive()) {
          this.dragDropManager.startDrag(state.selectedNodeIds);
        }
        this.dragDropManager.updateDropTarget(canvasPt, state.document.nodes);
      }

      this.requestRender();
      return;
    }

    const plugin = this.plugins.getActive();
    plugin?.onCanvasMouseMove?.(canvasPt, e);
  };

  private onMouseUp = (e: MouseEvent): void => {
    const screenPt = this.getMousePos(e);
    const canvasPt = this.viewport.screenToCanvas(screenPt);

    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.spaceHeld ? 'grab' : 'default';
      return;
    }

    if (this.isDragging) {
      this.isDragging = false;

      if (this.dragDropManager.isActive()) {
        const dropTarget = this.dragDropManager.endDrag();
        if (dropTarget) {
          this.handleDrop(dropTarget.nodeId, dropTarget.position);
          return;
        }
      }

      this.commitMoveCommand();
      return;
    }

    const plugin = this.plugins.getActive();
    plugin?.onCanvasMouseUp?.(canvasPt, e);
  };

  private handleDrop(targetId: string, position: 'before' | 'after' | 'child'): void {
    const state = useCanvasStore.getState();
    const draggedIds = Array.from(state.selectedNodeIds);
    if (draggedIds.length === 0) return;

    const targetNode = state.getNode(targetId);
    if (!targetNode) return;

    const plugin = this.plugins.getPluginForNodeType(targetNode.type) as IPluginV2 | undefined;
    if (plugin?.onDropOnNode) {
      plugin.onDropOnNode(draggedIds, targetId, position);
    } else {
      this.commitMoveCommand();
    }
  }

  private commitMoveCommand(): void {
    if (this.dragStartPositions.size === 0) return;

    const state = useCanvasStore.getState();
    const endPositions = new Map<string, Point>();
    let hasMoved = false;

    for (const [nodeId, startPos] of this.dragStartPositions) {
      const node = state.getNode(nodeId);
      if (node) {
        endPositions.set(nodeId, { ...node.position });
        if (node.position.x !== startPos.x || node.position.y !== startPos.y) {
          hasMoved = true;
        }
      }
    }

    if (!hasMoved) {
      this.dragStartPositions.clear();
      return;
    }

    const startSnap = new Map(this.dragStartPositions);
    const endSnap = new Map(endPositions);

    const cmd: ICommand = {
      id: genId(),
      description: 'Move nodes',
      execute: () => {
        const s = useCanvasStore.getState();
        for (const [nodeId, pos] of endSnap) {
          s.updateNode(nodeId, { position: pos });
        }
        this.requestRender();
      },
      undo: () => {
        const s = useCanvasStore.getState();
        for (const [nodeId, pos] of startSnap) {
          s.updateNode(nodeId, { position: pos });
        }
        this.requestRender();
      },
    };

    this.commandHistory.pushWithoutExecute(cmd);
    this.dragStartPositions.clear();
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const screenPt = this.getMousePos(e);
    this.viewport.zoomAtPoint(e.deltaY, screenPt);
    this.requestRender();
  };

  private onDblClick = (e: MouseEvent): void => {
    const screenPt = this.getMousePos(e);
    const canvasPt = this.viewport.screenToCanvas(screenPt);
    const plugin = this.plugins.getActive();
    plugin?.onCanvasDblClick?.(canvasPt, e);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && !this.spaceHeld) {
      this.spaceHeld = true;
      this.canvas.style.cursor = 'grab';
      e.preventDefault();
      return;
    }

    const plugin = this.plugins.getActive();
    if (plugin?.onKeyDown?.(e)) return;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.spaceHeld = false;
      this.canvas.style.cursor = 'default';
    }
  };

  private getMousePos(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
}
