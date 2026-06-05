import { CanvasStore } from '../core/data-model/store';
import { CanvasNode, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE } from '../core/data-model/types';
import { CommandHistory } from '../core/commands/CommandHistory';
import { ICommand } from '../core/commands/Command';
import { EventBus } from '../core/event-bus/EventBus';
import { MindMapPlugin } from '../plugins/mind-map/MindMapPlugin';
import { genId } from '../utils/id';
import {
  parseMarkdownToTree,
  serializeTreeToMarkdown,
  mindmapToMdTree,
  buildSyncMap,
  MdTreeNode,
  SyncMapEntry,
} from './markdown-serializer';

export class SyncEngine {
  private store: CanvasStore;
  private commandHistory: CommandHistory;
  private eventBus: EventBus;
  private mindmapPlugin: MindMapPlugin;
  private updating: 'md' | 'canvas' | null = null;
  private lastMd = '';
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
      this.rebuildMindmapFromTree(tree);
      this.lastMd = md;
    } finally {
      this.updating = null;
    }
  }

  getMarkdownFromCanvas(): string {
    if (this.updating === 'md') return this.lastMd;

    const rootId = this.mindmapPlugin.getRootId();
    if (!rootId) return '';

    const nodes = this.store.document.nodes;
    const mdTree = mindmapToMdTree(rootId, nodes);
    const md = serializeTreeToMarkdown(mdTree);
    this.lastMd = md;
    this.syncMap = buildSyncMap(md, mdTree);
    return md;
  }

  getSyncMap(): SyncMapEntry[] {
    return this.syncMap;
  }

  getNodeIdForLine(line: number): string | null {
    for (const entry of this.syncMap) {
      if (line >= entry.lineStart && line <= entry.lineEnd) {
        return entry.nodeId;
      }
    }
    return null;
  }

  getLineForNodeId(nodeId: string): number | null {
    const entry = this.syncMap.find((e) => e.nodeId === nodeId);
    return entry ? entry.lineStart : null;
  }

  private rebuildMindmapFromTree(tree: MdTreeNode): void {
    const nodes = this.store.document.nodes;
    const edges = this.store.document.edges;

    const existingMindmapNodes = Object.values(nodes).filter((n) => n.type === 'mindmap');
    const existingEdgesList = Object.values(edges).filter((e) => e.type === 'mindmap');

    const removedNodes = [...existingMindmapNodes];
    const removedEdges = [...existingEdgesList];

    const newNodes: CanvasNode[] = [];
    const newEdges: { id: string; sourceId: string; targetId: string }[] = [];

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

    const rootText = tree.text === 'Root' && tree.children.length > 0 ? tree.children[0].text : tree.text;
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
        this.eventBus.emit('sync:canvas-updated');
      },
      undo: () => {
        for (const e of newEdges) this.store.removeEdge(e.id);
        for (const n of newNodes) this.store.removeNode(n.id);
        for (const n of removedNodes) this.store.addNode(n);
        for (const e of removedEdges) this.store.addEdge(e);
        this.mindmapPlugin.relayout();
        this.eventBus.emit('sync:canvas-updated');
      },
    };
    this.commandHistory.execute(cmd);
  }
}
