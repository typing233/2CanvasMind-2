export type NodeId = string;
export type EdgeId = string;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  borderRadius: number;
  opacity?: number;
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  dash?: number[];
  arrowStart: boolean;
  arrowEnd: boolean;
  routeType?: 'straight' | 'bezier' | 'elbow';
}

export interface CanvasNode {
  id: NodeId;
  type: string;
  position: Point;
  size: Size;
  data: Record<string, unknown>;
  parentId?: NodeId;
  children?: NodeId[];
  style: NodeStyle;
  locked: boolean;
}

export interface CanvasEdge {
  id: EdgeId;
  type: string;
  sourceId: NodeId;
  targetId: NodeId;
  waypoints?: Point[];
  style: EdgeStyle;
  label?: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasDocument {
  id: string;
  name: string;
  nodes: Record<NodeId, CanvasNode>;
  edges: Record<EdgeId, CanvasEdge>;
  viewport: Viewport;
}

export const DEFAULT_NODE_STYLE: NodeStyle = {
  fill: '#ffffff',
  stroke: '#374151',
  strokeWidth: 2,
  fontSize: 14,
  fontFamily: 'sans-serif',
  fontColor: '#1f2937',
  borderRadius: 6,
};

export const DEFAULT_EDGE_STYLE: EdgeStyle = {
  stroke: '#6b7280',
  strokeWidth: 2,
  arrowStart: false,
  arrowEnd: true,
};
