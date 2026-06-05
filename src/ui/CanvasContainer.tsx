import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../core/data-model/store';
import { ViewportManager } from '../core/viewport/ViewportManager';
import { PluginManager } from '../core/plugin-system/PluginManager';
import { CanvasEngine } from '../engine/CanvasEngine';
import { FreehandPlugin } from '../plugins/freehand/FreehandPlugin';

interface Props {
  viewport: ViewportManager;
  plugins: PluginManager;
}

export function CanvasContainer({ viewport, plugins }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new CanvasEngine(canvas, viewport, plugins);
    engineRef.current = engine;

    const handleResize = () => {
      const parent = canvas.parentElement!;
      engine.resize(parent.clientWidth, parent.clientHeight);
    };

    handleResize();
    engine.start();

    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(canvas.parentElement!);

    const unsub = useCanvasStore.subscribe(() => {
      engine.requestRender();
    });

    const renderLiveStroke = () => {
      const freehand = plugins.get('freehand') as FreehandPlugin | undefined;
      const stroke = freehand?.getLiveStroke?.();
      if (stroke && stroke.points.length > 1) {
        const ctx = canvas.getContext('2d')!;
        const vp = viewport.getViewport();
        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(vp.x, vp.y);
        ctx.scale(vp.zoom, vp.zoom);
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
      requestAnimationFrame(renderLiveStroke);
    };
    const liveFrame = requestAnimationFrame(renderLiveStroke);

    return () => {
      engine.stop();
      resizeObs.disconnect();
      unsub();
      cancelAnimationFrame(liveFrame);
    };
  }, [viewport, plugins]);

  return (
    <div className="flex-1 relative overflow-hidden bg-gray-50">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
