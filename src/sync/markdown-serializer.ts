import { CanvasNode, NodeId } from '../core/data-model/types';

export interface MdTreeNode {
  text: string;
  depth: number;
  children: MdTreeNode[];
  nodeId?: NodeId;
  sourceLine?: number;
}

export function parseMarkdownToTree(md: string): MdTreeNode {
  const lines = md.split('\n');
  const root: MdTreeNode = { text: 'Root', depth: 0, children: [] };
  const stack: MdTreeNode[] = [root];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    const listMatch = line.match(/^(\s*)[-*+]\s+(.+)/);

    let depth: number;
    let text: string;

    if (headingMatch) {
      depth = headingMatch[1].length;
      text = headingMatch[2].trim();
    } else if (listMatch) {
      const indent = listMatch[1].length;
      depth = 7 + Math.floor(indent / 2);
      text = listMatch[2].trim();
    } else {
      continue;
    }

    const node: MdTreeNode = { text, depth, children: [], sourceLine: i };

    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }

  if (root.children.length === 1) {
    return root.children[0];
  }
  return root;
}

export function serializeTreeToMarkdown(root: MdTreeNode): string {
  const lines: string[] = [];
  serializeNode(root, lines);
  return lines.join('\n');
}

function serializeNode(node: MdTreeNode, lines: string[]): void {
  if (node.depth === 0 && node.text === 'Root') {
    for (const child of node.children) {
      serializeNode(child, lines);
    }
    return;
  }

  if (node.depth <= 6) {
    lines.push(`${'#'.repeat(node.depth)} ${node.text}`);
  } else {
    const indent = '  '.repeat(Math.max(0, node.depth - 7));
    lines.push(`${indent}- ${node.text}`);
  }

  for (const child of node.children) {
    serializeNode(child, lines);
  }
}

export function mindmapToMdTree(
  rootId: string,
  nodes: Record<string, CanvasNode>,
  depth = 1,
): MdTreeNode {
  const node = nodes[rootId];
  if (!node) return { text: '', depth, children: [] };

  const children = (node.children || []).map((childId) =>
    mindmapToMdTree(childId, nodes, depth + 1),
  );

  return {
    text: (node.data.text as string) || '',
    depth,
    children,
    nodeId: rootId,
  };
}

export interface SyncMapEntry {
  nodeId: string;
  line: number;
}

export function buildSyncMapFromEditorContent(
  md: string,
  nodes: Record<string, CanvasNode>,
  rootId: string | null,
): SyncMapEntry[] {
  if (!rootId) return [];

  const entries: SyncMapEntry[] = [];
  const lines = md.split('\n');

  const nodeTexts = collectNodeTextsInOrder(rootId, nodes);

  let nodeIdx = 0;
  for (let i = 0; i < lines.length && nodeIdx < nodeTexts.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^#{1,6}\s+(.+)/);
    const listMatch = line.match(/^\s*[-*+]\s+(.+)/);

    let text: string | null = null;
    if (headingMatch) {
      text = headingMatch[1].trim();
    } else if (listMatch) {
      text = listMatch[1].trim();
    }

    if (text !== null && text === nodeTexts[nodeIdx].text) {
      entries.push({ nodeId: nodeTexts[nodeIdx].id, line: i });
      nodeIdx++;
    }
  }

  return entries;
}

function collectNodeTextsInOrder(
  rootId: string,
  nodes: Record<string, CanvasNode>,
): { id: string; text: string }[] {
  const result: { id: string; text: string }[] = [];

  function walk(id: string): void {
    const node = nodes[id];
    if (!node) return;
    result.push({ id, text: (node.data.text as string) || '' });
    if (node.children) {
      for (const childId of node.children) walk(childId);
    }
  }

  walk(rootId);
  return result;
}
