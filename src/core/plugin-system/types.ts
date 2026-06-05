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
