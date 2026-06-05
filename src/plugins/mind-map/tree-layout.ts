import { CanvasNode, Point } from '../../core/data-model/types';

interface LayoutNode {
  id: string;
  children: LayoutNode[];
  x: number;
  y: number;
  width: number;
  height: number;
  prelim: number;
  modifier: number;
}

const H_SPACING = 80;
const V_SPACING = 40;

export function layoutTree(
  rootId: string,
  nodes: Record<string, CanvasNode>,
  origin: Point = { x: 100, y: 300 },
): Map<string, Point> {
  const positions = new Map<string, Point>();
  const root = nodes[rootId];
  if (!root) return positions;

  const tree = buildLayoutTree(rootId, nodes);
  if (!tree) return positions;

  firstPass(tree);
  secondPass(tree, 0);

  const minY = findMinY(tree);
  assignPositions(tree, positions, origin, -minY);

  return positions;
}

function buildLayoutTree(id: string, nodes: Record<string, CanvasNode>): LayoutNode | null {
  const node = nodes[id];
  if (!node) return null;

  const children: LayoutNode[] = [];
  if (node.children) {
    for (const childId of node.children) {
      const child = buildLayoutTree(childId, nodes);
      if (child) children.push(child);
    }
  }

  return {
    id,
    children,
    x: 0,
    y: 0,
    width: node.size.width,
    height: node.size.height,
    prelim: 0,
    modifier: 0,
  };
}

function firstPass(node: LayoutNode): void {
  if (node.children.length === 0) {
    node.prelim = 0;
    return;
  }

  for (const child of node.children) {
    firstPass(child);
  }

  if (node.children.length === 1) {
    node.prelim = node.children[0].prelim;
  } else {
    let prevBottom = -Infinity;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const topOfChild = child.prelim - child.height / 2;
      if (i === 0) {
        prevBottom = child.prelim + child.height / 2;
      } else {
        const desiredTop = prevBottom + V_SPACING;
        if (topOfChild < desiredTop) {
          const shift = desiredTop - topOfChild;
          child.prelim += shift;
          shiftSubtree(child, shift);
        }
        prevBottom = child.prelim + child.height / 2;
      }
    }

    const first = node.children[0].prelim;
    const last = node.children[node.children.length - 1].prelim;
    node.prelim = (first + last) / 2;
  }
}

function shiftSubtree(node: LayoutNode, shift: number): void {
  for (const child of node.children) {
    child.prelim += shift;
    shiftSubtree(child, shift);
  }
}

function secondPass(node: LayoutNode, modifier: number): void {
  node.y = node.prelim + modifier;
  for (const child of node.children) {
    secondPass(child, modifier + node.modifier);
  }
}

function findMinY(node: LayoutNode): number {
  let min = node.y;
  for (const child of node.children) {
    min = Math.min(min, findMinY(child));
  }
  return min;
}

function assignPositions(
  node: LayoutNode,
  positions: Map<string, Point>,
  origin: Point,
  yOffset: number,
  depth = 0,
): void {
  const x = origin.x + depth * (node.width + H_SPACING);
  const y = origin.y + node.y + yOffset;
  positions.set(node.id, { x, y: y - node.height / 2 });

  for (const child of node.children) {
    assignPositions(child, positions, origin, yOffset, depth + 1);
  }
}
