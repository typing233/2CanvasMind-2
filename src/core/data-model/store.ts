import { create } from 'zustand';
import type { CanvasDocument, CanvasEdge, CanvasNode, EdgeId, NodeId, Viewport } from './types';
import { genId } from '../../utils/id';

export interface CanvasStore {
  document: CanvasDocument;
  selectedNodeIds: Set<NodeId>;
  selectedEdgeIds: Set<EdgeId>;
  activePluginId: string | null;

  getDocument(): CanvasDocument;
  getSelectedNodeIds(): Set<NodeId>;

  addNode(node: CanvasNode): void;
  updateNode(id: NodeId, patch: Partial<CanvasNode>): void;
  removeNode(id: NodeId): void;
  getNode(id: NodeId): CanvasNode | undefined;

  addEdge(edge: CanvasEdge): void;
  updateEdge(id: EdgeId, patch: Partial<CanvasEdge>): void;
  removeEdge(id: EdgeId): void;

  setViewport(vp: Viewport): void;
  setSelection(nodeIds: NodeId[], edgeIds?: EdgeId[]): void;
  setActivePlugin(pluginId: string | null): void;

  loadDocument(doc: CanvasDocument): void;
  getSerializableDocument(): CanvasDocument;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  document: {
    id: genId(),
    name: 'Untitled',
    nodes: {},
    edges: {},
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  selectedNodeIds: new Set(),
  selectedEdgeIds: new Set(),
  activePluginId: null,

  getDocument() {
    return get().document;
  },

  getSelectedNodeIds() {
    return get().selectedNodeIds;
  },

  addNode(node) {
    set((s) => ({
      document: {
        ...s.document,
        nodes: { ...s.document.nodes, [node.id]: node },
      },
    }));
  },

  updateNode(id, patch) {
    set((s) => {
      const existing = s.document.nodes[id];
      if (!existing) return s;
      return {
        document: {
          ...s.document,
          nodes: { ...s.document.nodes, [id]: { ...existing, ...patch } },
        },
      };
    });
  },

  removeNode(id) {
    set((s) => {
      const { [id]: _, ...rest } = s.document.nodes;
      return { document: { ...s.document, nodes: rest } };
    });
  },

  getNode(id) {
    return get().document.nodes[id];
  },

  addEdge(edge) {
    set((s) => ({
      document: {
        ...s.document,
        edges: { ...s.document.edges, [edge.id]: edge },
      },
    }));
  },

  updateEdge(id, patch) {
    set((s) => {
      const existing = s.document.edges[id];
      if (!existing) return s;
      return {
        document: {
          ...s.document,
          edges: { ...s.document.edges, [id]: { ...existing, ...patch } },
        },
      };
    });
  },

  removeEdge(id) {
    set((s) => {
      const { [id]: _, ...rest } = s.document.edges;
      return { document: { ...s.document, edges: rest } };
    });
  },

  setViewport(vp) {
    set((s) => ({
      document: { ...s.document, viewport: vp },
    }));
  },

  setSelection(nodeIds, edgeIds = []) {
    set({ selectedNodeIds: new Set(nodeIds), selectedEdgeIds: new Set(edgeIds) });
  },

  setActivePlugin(pluginId) {
    set({ activePluginId: pluginId });
  },

  loadDocument(doc) {
    set({
      document: doc,
      selectedNodeIds: new Set(),
      selectedEdgeIds: new Set(),
    });
  },

  getSerializableDocument() {
    return get().document;
  },
}));
