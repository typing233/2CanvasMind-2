import { Point, Size } from '../../core/data-model/types';

export function circlePath(pos: Point, size: Size): Path2D {
  const path = new Path2D();
  const cx = pos.x + size.width / 2;
  const cy = pos.y + size.height / 2;
  const rx = size.width / 2;
  const ry = size.height / 2;
  path.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  return path;
}

export function trianglePath(pos: Point, size: Size): Path2D {
  const path = new Path2D();
  path.moveTo(pos.x + size.width / 2, pos.y);
  path.lineTo(pos.x + size.width, pos.y + size.height);
  path.lineTo(pos.x, pos.y + size.height);
  path.closePath();
  return path;
}

export function hexagonPath(pos: Point, size: Size): Path2D {
  const path = new Path2D();
  const cx = pos.x + size.width / 2;
  const cy = pos.y + size.height / 2;
  const rx = size.width / 2;
  const ry = size.height / 2;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

export function starPath(pos: Point, size: Size): Path2D {
  const path = new Path2D();
  const cx = pos.x + size.width / 2;
  const cy = pos.y + size.height / 2;
  const outerR = Math.min(size.width, size.height) / 2;
  const innerR = outerR * 0.4;
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

export function arrowPath(pos: Point, size: Size): Path2D {
  const path = new Path2D();
  const w = size.width;
  const h = size.height;
  const x = pos.x;
  const y = pos.y;

  path.moveTo(x + w * 0.6, y);
  path.lineTo(x + w, y + h / 2);
  path.lineTo(x + w * 0.6, y + h);
  path.lineTo(x + w * 0.6, y + h * 0.65);
  path.lineTo(x, y + h * 0.65);
  path.lineTo(x, y + h * 0.35);
  path.lineTo(x + w * 0.6, y + h * 0.35);
  path.closePath();
  return path;
}

export const shapePathGenerators: Record<string, (pos: Point, size: Size) => Path2D> = {
  'geo-circle': circlePath,
  'geo-triangle': trianglePath,
  'geo-hexagon': hexagonPath,
  'geo-star': starPath,
  'geo-arrow': arrowPath,
};
