import { CanvasNode, CanvasEdge } from '../core/data-model/types';

export interface FlowchartMdBlock {
  title: string;
  steps: { text: string; connections: string[] }[];
}

export function serializeFlowchartToMarkdown(
  nodes: Record<string, CanvasNode>,
  edges: Record<string, CanvasEdge>,
): string {
  const flowNodes = Object.values(nodes).filter(n => n.type.startsWith('flowchart'));
  if (flowNodes.length === 0) return '';

  const lines: string[] = ['# Flowchart', ''];

  const outgoing = new Map<string, string[]>();
  for (const edge of Object.values(edges)) {
    if (edge.type !== 'flowchart') continue;
    const targets = outgoing.get(edge.sourceId) || [];
    targets.push(edge.targetId);
    outgoing.set(edge.sourceId, targets);
  }

  const incoming = new Map<string, number>();
  for (const edge of Object.values(edges)) {
    if (edge.type !== 'flowchart') continue;
    incoming.set(edge.targetId, (incoming.get(edge.targetId) || 0) + 1);
  }

  const roots = flowNodes.filter(n => !incoming.has(n.id) || incoming.get(n.id) === 0);
  const visited = new Set<string>();
  const queue = roots.length > 0 ? [...roots] : [flowNodes[0]];

  let stepNum = 1;
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    const text = (node.data.text as string) || 'Step';
    const targets = outgoing.get(node.id) || [];
    const connectionTexts = targets
      .map(tid => nodes[tid])
      .filter(Boolean)
      .map(t => (t.data.text as string) || 'Step');

    let line = `${stepNum}. ${text}`;
    if (connectionTexts.length > 0) {
      line += ` → ${connectionTexts.join(', ')}`;
    }
    lines.push(line);
    stepNum++;

    for (const tid of targets) {
      if (!visited.has(tid) && nodes[tid]) {
        queue.push(nodes[tid]);
      }
    }
  }

  for (const node of flowNodes) {
    if (!visited.has(node.id)) {
      const text = (node.data.text as string) || 'Step';
      lines.push(`${stepNum}. ${text}`);
      stepNum++;
    }
  }

  return lines.join('\n');
}

export function parseFlowchartMarkdown(md: string): { steps: { text: string; targets: string[] }[] } {
  const lines = md.split('\n');
  const steps: { text: string; targets: string[] }[] = [];

  for (const line of lines) {
    const match = line.match(/^\d+\.\s+(.+?)(?:\s*→\s*(.+))?$/);
    if (match) {
      const text = match[1].trim();
      const targets = match[2] ? match[2].split(',').map(t => t.trim()) : [];
      steps.push({ text, targets });
    }
  }

  return { steps };
}
