import { CanvasNode, NodeId } from '../core/data-model/types';

export interface MdTreeNode {
  text: string;
  depth: number;
  children: MdTreeNode[];
  nodeId?: NodeId;
}

export function parseMarkdownToTree(md: string): MdTreeNode {
  const lines = md.split('\n').filter((l) => l.trim());
  const root: MdTreeNode = { text: 'Root', depth: 0, children: [] };
  const stack: MdTreeNode[] = [root];

  for (const line of lines) {
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

    const node: MdTreeNode = { text, depth, children: [] };

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
  serializeNode(root, lines, 0);
  return lines.join('\n');
}

function serializeNode(node: MdTreeNode, lines: string[], parentDepth: number): void {
  if (node.depth === 0 && node.text === 'Root') {
    for (const child of node.children) {
      serializeNode(child, lines, 0);
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
    serializeNode(child, lines, node.depth);
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
  lineStart: number;
  lineEnd: number;
}

export function buildSyncMap(md: string, root: MdTreeNode): SyncMapEntry[] {
  const entries: SyncMapEntry[] = [];
  const lines = md.split('\n');
  let lineIdx = 0;

  function walk(node: MdTreeNode): void {
    if (!node.nodeId) {
      for (const child of node.children) walk(child);
      return;
    }

    while (lineIdx < lines.length) {
      const line = lines[lineIdx];
      if (line.includes(node.text)) {
        entries.push({ nodeId: node.nodeId, lineStart: lineIdx, lineEnd: lineIdx });
        lineIdx++;
        break;
      }
      lineIdx++;
    }

    for (const child of node.children) walk(child);
  }

  walk(root);
  return entries;
}
