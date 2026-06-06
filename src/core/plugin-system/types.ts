import { CanvasNode, CanvasEdge, Point } from '../data-model/types';
import { CanvasStore } from '../data-model/store';
import { EventBus } from '../event-bus/EventBus';
import { CommandHistory } from '../commands/CommandHistory';

export interface PluginContext {
  store: CanvasStore;
  eventBus: EventBus;
  commandHistory: CommandHistory;
  requestRender(): void;
}

export interface ToolbarContribution {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  isActive?: () => boolean;
  group?: string;
}

export interface ContextMenuContribution {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  category: 'shape' | 'tool' | 'export' | 'utility';
  isBuiltIn: boolean;
  activatable: boolean;
}

export interface IPlugin {
  id: string;
  name: string;
  version: string;

  register(ctx: PluginContext): void;
  activate(): void;
  deactivate(): void;
  destroy(): void;

  contributeToolbar?(): ToolbarContribution[];

  renderNode?(ctx: CanvasRenderingContext2D, node: CanvasNode, isSelected: boolean): void;
  renderEdge?(ctx: CanvasRenderingContext2D, edge: CanvasEdge, nodes: Record<string, CanvasNode>): void;

  hitTestNode?(node: CanvasNode, point: Point): boolean;

  onCanvasMouseDown?(point: Point, e: MouseEvent): boolean;
  onCanvasMouseMove?(point: Point, e: MouseEvent): void;
  onCanvasMouseUp?(point: Point, e: MouseEvent): void;
  onCanvasDblClick?(point: Point, e: MouseEvent): void;
  onKeyDown?(e: KeyboardEvent): boolean;
}

export interface IPluginV2 extends IPlugin {
  manifest?: PluginManifest;

  ownsNodeType?(type: string): boolean;
  ownsEdgeType?(type: string): boolean;

  canAcceptDrop?(draggedNodes: CanvasNode[], targetNode: CanvasNode): boolean;
  onDropOnNode?(draggedIds: string[], targetId: string, position: 'before' | 'after' | 'child'): void;

  contributeContextMenu?(selectedNodes: CanvasNode[]): ContextMenuContribution[];
}
