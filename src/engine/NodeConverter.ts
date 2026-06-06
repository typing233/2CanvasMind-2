import { CanvasNode, CanvasEdge, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE } from '../core/data-model/types';
import { genId } from '../utils/id';

export interface ConversionResult {
  node: CanvasNode;
  edges: CanvasEdge[];
}

export type ConverterFn = (source: CanvasNode) => ConversionResult;

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

registerConverter('flowchart', 'mindmap', (source) => {
  const node: CanvasNode = {
    id: genId(),
    type: 'mindmap',
    position: { ...source.position },
    size: { width: Math.max(100, ((source.data.text as string) || '').length * 8 + 24), height: 36 },
    data: { text: source.data.text || 'Node' },
    children: [],
    style: { ...DEFAULT_NODE_STYLE, borderRadius: 12 },
    locked: false,
  };
  return { node, edges: [] };
});

registerConverter('mindmap', 'flowchart', (source) => {
  const node: CanvasNode = {
    id: genId(),
    type: 'flowchart-rect',
    position: { ...source.position },
    size: { width: 120, height: 60 },
    data: { text: source.data.text || 'Process' },
    style: { ...DEFAULT_NODE_STYLE, fill: '#f0fdf4', borderRadius: 4 },
    locked: false,
  };
  return { node, edges: [] };
});

registerConverter('sticky', 'mindmap', (source) => {
  const node: CanvasNode = {
    id: genId(),
    type: 'mindmap',
    position: { ...source.position },
    size: { width: Math.max(100, ((source.data.text as string) || '').length * 8 + 24), height: 36 },
    data: { text: source.data.text || 'Note' },
    children: [],
    style: { ...DEFAULT_NODE_STYLE, borderRadius: 12 },
    locked: false,
  };
  return { node, edges: [] };
});

registerConverter('geo', 'flowchart', (source) => {
  const node: CanvasNode = {
    id: genId(),
    type: 'flowchart-rect',
    position: { ...source.position },
    size: { width: 120, height: 60 },
    data: { text: source.data.text || 'Shape' },
    style: { ...DEFAULT_NODE_STYLE, fill: '#f0fdf4', borderRadius: 4 },
    locked: false,
  };
  return { node, edges: [] };
});
