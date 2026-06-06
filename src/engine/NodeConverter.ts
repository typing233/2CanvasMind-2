import { CanvasNode, CanvasEdge, NodeId, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE } from '../core/data-model/types';
import { genId } from '../utils/id';

export interface ConversionResult {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  removedNodeIds: NodeId[];
  removedEdgeIds: string[];
}

export type ConverterFn = (
  sourceNodes: CanvasNode[],
  sourceEdges: CanvasEdge[],
  allNodes: Record<string, CanvasNode>,
  allEdges: Record<string, CanvasEdge>,
) => ConversionResult;

const converters = new Map<string, ConverterFn>();

export function registerConverter(fromPrefix: string, toPrefix: string, fn: ConverterFn): void {
  converters.set(`${fromPrefix}:${toPrefix}`, fn);
}

export function getConverter(fromPrefix: string, toPrefix: string): ConverterFn | undefined {
  return converters.get(`${fromPrefix}:${toPrefix}`);
}

export function getAvailableConversions(nodeType: string): string[] {
  const fromPrefix = nodeType.split('-')[0];
  const results: string[] = [];
  for (const key of converters.keys()) {
    const [from, to] = key.split(':');
    if (from === fromPrefix) results.push(to);
  }
  return results;
}

registerConverter('flowchart', 'mindmap', (sourceNodes, sourceEdges, allNodes, allEdges) => {
  const removedNodeIds = sourceNodes.map(n => n.id);
  const relatedEdges = Object.values(allEdges).filter(
    e => removedNodeIds.includes(e.sourceId) || removedNodeIds.includes(e.targetId)
  );
  const removedEdgeIds = relatedEdges.map(e => e.id);

  const flowEdges = relatedEdges.filter(e => e.type === 'flowchart');
  const incoming = new Map<string, string[]>();
  for (const e of flowEdges) {
    if (removedNodeIds.includes(e.sourceId) && removedNodeIds.includes(e.targetId)) {
      const list = incoming.get(e.targetId) || [];
      list.push(e.sourceId);
      incoming.set(e.targetId, list);
    }
  }

  const roots = sourceNodes.filter(n => !(incoming.get(n.id)?.length));
  const rootNode = roots[0] || sourceNodes[0];

  const newNodes: CanvasNode[] = [];
  const newEdges: CanvasEdge[] = [];
  const idMap = new Map<string, string>();

  const visited = new Set<string>();
  const buildTree = (sourceId: string, parentId?: string): string => {
    if (visited.has(sourceId)) return '';
    visited.add(sourceId);
    const src = allNodes[sourceId];
    if (!src) return '';

    const newId = genId();
    idMap.set(sourceId, newId);
    const text = (src.data.text as string) || 'Node';

    newNodes.push({
      id: newId,
      type: 'mindmap',
      position: { x: src.position.x, y: src.position.y },
      size: { width: Math.max(100, text.length * 8 + 24), height: 36 },
      data: { text },
      parentId,
      children: [],
      style: {
        fill: parentId ? src.style.fill : '#dbeafe',
        stroke: src.style.stroke,
        strokeWidth: src.style.strokeWidth,
        fontSize: src.style.fontSize,
        fontFamily: src.style.fontFamily || 'sans-serif',
        fontColor: src.style.fontColor,
        borderRadius: 12,
        opacity: src.style.opacity,
      },
      locked: false,
    });

    if (parentId) {
      const edgeId = genId();
      newEdges.push({
        id: edgeId,
        type: 'mindmap',
        sourceId: parentId,
        targetId: newId,
        style: { ...DEFAULT_EDGE_STYLE, arrowEnd: false },
      });
    }

    const children: string[] = [];
    for (const e of flowEdges) {
      if (e.sourceId === sourceId && removedNodeIds.includes(e.targetId) && !visited.has(e.targetId)) {
        const childId = buildTree(e.targetId, newId);
        if (childId) children.push(childId);
      }
    }

    const node = newNodes.find(n => n.id === newId)!;
    node.children = children;
    return newId;
  };

  buildTree(rootNode.id);

  for (const src of sourceNodes) {
    if (!visited.has(src.id)) {
      const rootNewId = newNodes.length > 0 ? newNodes[0].id : undefined;
      buildTree(src.id, rootNewId);
      if (rootNewId) {
        const root = newNodes.find(n => n.id === rootNewId)!;
        const lastAdded = newNodes[newNodes.length - 1];
        if (lastAdded && lastAdded.id !== rootNewId) {
          root.children = [...(root.children || []), lastAdded.id];
        }
      }
    }
  }

  return { nodes: newNodes, edges: newEdges, removedNodeIds, removedEdgeIds };
});

registerConverter('mindmap', 'flowchart', (sourceNodes, sourceEdges, allNodes, allEdges) => {
  const removedNodeIds = sourceNodes.map(n => n.id);
  const relatedEdges = Object.values(allEdges).filter(
    e => removedNodeIds.includes(e.sourceId) || removedNodeIds.includes(e.targetId)
  );
  const removedEdgeIds = relatedEdges.map(e => e.id);

  const newNodes: CanvasNode[] = [];
  const newEdges: CanvasEdge[] = [];
  const idMap = new Map<string, string>();

  let offsetY = 0;
  const baseX = sourceNodes.length > 0 ? sourceNodes[0].position.x : 100;

  const root = sourceNodes.find(n => !n.parentId) || sourceNodes[0];

  const visited = new Set<string>();
  const flatten = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const src = allNodes[nodeId];
    if (!src || !removedNodeIds.includes(nodeId)) return;

    const newId = genId();
    idMap.set(nodeId, newId);
    const text = (src.data.text as string) || 'Process';

    newNodes.push({
      id: newId,
      type: 'flowchart-rect',
      position: { x: baseX, y: 100 + offsetY },
      size: { width: 120, height: 60 },
      data: { text },
      style: {
        fill: src.style.fill === '#dbeafe' ? '#f0fdf4' : src.style.fill,
        stroke: src.style.stroke,
        strokeWidth: src.style.strokeWidth,
        fontSize: src.style.fontSize,
        fontFamily: src.style.fontFamily || 'sans-serif',
        fontColor: src.style.fontColor,
        borderRadius: 4,
        opacity: src.style.opacity,
      },
      locked: false,
    });
    offsetY += 100;

    for (const childId of (src.children || [])) {
      flatten(childId);
    }
  };

  flatten(root.id);
  for (const n of sourceNodes) {
    if (!visited.has(n.id)) flatten(n.id);
  }

  for (const src of sourceNodes) {
    const newSourceId = idMap.get(src.id);
    if (!newSourceId) continue;
    for (const childId of (src.children || [])) {
      const newTargetId = idMap.get(childId);
      if (newTargetId) {
        newEdges.push({
          id: genId(),
          type: 'flowchart',
          sourceId: newSourceId,
          targetId: newTargetId,
          style: { ...DEFAULT_EDGE_STYLE },
        });
      }
    }
  }

  return { nodes: newNodes, edges: newEdges, removedNodeIds, removedEdgeIds };
});

registerConverter('sticky', 'mindmap', (sourceNodes, _sourceEdges, allNodes, allEdges) => {
  const removedNodeIds = sourceNodes.map(n => n.id);
  const relatedEdges = Object.values(allEdges).filter(
    e => removedNodeIds.includes(e.sourceId) || removedNodeIds.includes(e.targetId)
  );
  const removedEdgeIds = relatedEdges.map(e => e.id);

  const newNodes: CanvasNode[] = sourceNodes.map(src => ({
    id: genId(),
    type: 'mindmap',
    position: { ...src.position },
    size: { width: Math.max(100, ((src.data.text as string) || '').length * 8 + 24), height: 36 },
    data: { text: src.data.text || 'Note' },
    children: [],
    style: { ...DEFAULT_NODE_STYLE, borderRadius: 12, fontFamily: 'sans-serif' },
    locked: false,
  }));

  return { nodes: newNodes, edges: [], removedNodeIds, removedEdgeIds };
});

registerConverter('geo', 'flowchart', (sourceNodes, _sourceEdges, allNodes, allEdges) => {
  const removedNodeIds = sourceNodes.map(n => n.id);
  const relatedEdges = Object.values(allEdges).filter(
    e => removedNodeIds.includes(e.sourceId) || removedNodeIds.includes(e.targetId)
  );
  const removedEdgeIds = relatedEdges.map(e => e.id);

  const newNodes: CanvasNode[] = sourceNodes.map(src => ({
    id: genId(),
    type: 'flowchart-rect',
    position: { ...src.position },
    size: { width: 120, height: 60 },
    data: { text: src.data.text || 'Shape' },
    style: {
      ...src.style,
      borderRadius: 4,
      fontFamily: src.style.fontFamily || 'sans-serif',
    },
    locked: false,
  }));

  return { nodes: newNodes, edges: [], removedNodeIds, removedEdgeIds };
});
