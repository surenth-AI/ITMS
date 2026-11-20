import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type SignaturePadRef = { clearSignature: () => void; readSignature: () => void };

type Props = {
  onOK: (base64: string) => void;
  penColor: string;
  backgroundColor: string;
};

// Web: a plain HTML canvas (the native pad relies on a WebView, which has no web build).
const SignaturePad = forwardRef<SignaturePadRef, Props>(({ onOK, penColor, backgroundColor }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const fit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [penColor, backgroundColor]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  useImperativeHandle(ref, () => ({
    clearSignature: fit,
    readSignature: () => {
      if (canvasRef.current) onOK(canvasRef.current.toDataURL('image/png'));
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', touchAction: 'none', display: 'block' }}
      onPointerDown={e => {
        drawing.current = true;
        last.current = point(e);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={e => {
        if (!drawing.current || !last.current) return;
        const p = point(e);
        const ctx = e.currentTarget.getContext('2d')!;
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
      }}
      onPointerUp={() => { drawing.current = false; last.current = null; }}
      onPointerLeave={() => { drawing.current = false; last.current = null; }}
    />
  );
});

export default SignaturePad;
