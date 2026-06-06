import { CanvasStore } from '../core/data-model/store';
import { CanvasNode, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE } from '../core/data-model/types';
import { CommandHistory } from '../core/commands/CommandHistory';
import { ICommand } from '../core/commands/Command';
import { EventBus } from '../core/event-bus/EventBus';
import { MindMapPlugin } from '../plugins/mind-map/MindMapPlugin';
import { genId } from '../utils/id';
import {
  parseMarkdownToTree,
  MdTreeNode,
  SyncMapEntry,
  buildSyncMapFromEditorContent,
} from './markdown-serializer';

export class SyncEngine {
  private store: CanvasStore;
  private commandHistory: CommandHistory;
  private eventBus: EventBus;
  private mindmapPlugin: MindMapPlugin;
  private updating: 'md' | 'canvas' | null = null;
  private syncMap: SyncMapEntry[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    store: CanvasStore,
    commandHistory: CommandHistory,
    eventBus: EventBus,
    mindmapPlugin: MindMapPlugin,
  ) {
    this.store = store;
    this.commandHistory = commandHistory;
    this.eventBus = eventBus;
    this.mindmapPlugin = mindmapPlugin;
  }

  onMarkdownChanged(md: string): void {
    if (this.updating === 'canvas') return;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.applyMarkdownToCanvas(md);
    }, 400);
  }

  applyMarkdownToCanvas(md: string): void {
    this.updating = 'md';
    try {
      const tree = parseMarkdownToTree(md);
      this.rebuildMindmapFromTree(tree, md);
    } finally {
      this.updating = null;
    }
  }

  rebuildSyncMap(editorMd: string): void {
    const rootId = this.mindmapPlugin.getRootId();
    const nodes = this.store.getDocument().nodes;
    this.syncMap = buildSyncMapFromEditorContent(editorMd, nodes, rootId);
  }

  getNodeIdForLine(line: number): string | null {
    for (const entry of this.syncMap) {
      if (entry.line === line) {
        return entry.nodeId;
      }
    }
    return null;
  }

  getLineForNodeId(nodeId: string): number | null {
    const entry = this.syncMap.find((e) => e.nodeId === nodeId);
    return entry !== undefined ? entry.line : null;
  }

  private rebuildMindmapFromTree(tree: MdTreeNode, editorMd: string): void {
    const doc = this.store.getDocument();
    const nodes = doc.nodes;
    const edges = doc.edges;

    const existingMindmapNodes = Object.values(nodes).filter((n) => n.type === 'mindmap');
    const existingEdgesList = Object.values(edges).filter((e) => e.type === 'mindmap');

    const removedNodes = [...existingMindmapNodes];
    const removedEdges = [...existingEdgesList];

    const newNodes: CanvasNode[] = [];
    const newEdges: { id: string; sourceId: string; targetId: string }[] = [];
    const lineMap: SyncMapEntry[] = [];

    const buildNodes = (mdNode: MdTreeNode, parentId?: string): string => {
      const id = genId();
      newNodes.push({
        id,
        type: 'mindmap',
        position: { x: 0, y: 0 },
        size: { width: Math.max(100, mdNode.text.length * 8 + 24), height: 36 },
        data: { text: mdNode.text },
        parentId,
        children: [],
        style: { ...DEFAULT_NODE_STYLE, borderRadius: 12, fill: parentId ? '#ffffff' : '#dbeafe' },
        locked: false,
      });

      if (mdNode.sourceLine !== undefined) {
        lineMap.push({ nodeId: id, line: mdNode.sourceLine });
      }

      if (parentId) {
        newEdges.push({ id: genId(), sourceId: parentId, targetId: id });
      }

      const childIds: string[] = [];
      for (const child of mdNode.children) {
        childIds.push(buildNodes(child, id));
      }

      const node = newNodes.find((n) => n.id === id)!;
      node.children = childIds;

      return id;
    };

    const treeToProcess = tree.text === 'Root' && tree.children.length > 0 ? tree.children[0] : tree;
    buildNodes(treeToProcess);

    const cmd: ICommand = {
      id: genId(),
      description: 'Sync markdown to mind map',
      execute: () => {
        for (const e of removedEdges) this.store.removeEdge(e.id);
        for (const n of removedNodes) this.store.removeNode(n.id);
        for (const n of newNodes) this.store.addNode(n);
        for (const e of newEdges) {
          this.store.addEdge({
            id: e.id,
            type: 'mindmap',
            sourceId: e.sourceId,
            targetId: e.targetId,
            style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
          });
        }
        this.mindmapPlugin.relayout();
        this.syncMap = lineMap;
        this.eventBus.emit('sync:canvas-updated');
      },
      undo: () => {
        for (const e of newEdges) this.store.removeEdge(e.id);
        for (const n of newNodes) this.store.removeNode(n.id);
        for (const n of removedNodes) this.store.addNode(n);
        for (const e of removedEdges) this.store.addEdge(e);
        this.mindmapPlugin.relayout();
        this.syncMap = [];
        this.eventBus.emit('sync:canvas-updated');
      },
    };
    this.commandHistory.execute(cmd);
  }
}
