'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { EDL_THEME as t } from '@/lib/inspection-theme';

interface SignatureData {
  svg: string;
  timestamp: string;
  ip?: string;
  userAgent: string;
  geoloc?: { lat: number; lng: number };
}

interface SignatureCanvasProps {
  onSign: (data: SignatureData) => void;
  label?: string;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSign,
  label = 'Signez ci-dessous',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const pathsRef = useRef<{ x: number; y: number }[][]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#111827'; // gray-900 for signature on white bg
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPoint = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const point = getPoint(e);
    currentPathRef.current = [point];

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const point = getPoint(e);
    currentPathRef.current.push(point);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    if (currentPathRef.current.length > 0) {
      pathsRef.current.push([...currentPathRef.current]);
      currentPathRef.current = [];
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pathsRef.current = [];
    setHasDrawn(false);
  };

  const handleConfirm = useCallback(async () => {
    // Generate SVG from paths
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let svgPaths = '';
    for (const path of pathsRef.current) {
      if (path.length < 2) continue;
      const d = path
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');
      svgPaths += `<path d="${d}" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rect.width} ${rect.height}">${svgPaths}</svg>`;

    // Collect metadata
    let geoloc: { lat: number; lng: number } | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
      );
      geoloc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      // Geoloc not available — that's ok
    }

    onSign({
      svg,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      geoloc,
    });
  }, [onSign]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`text-[20px] font-bold ${t.textPrimary}`}>
          {label}
        </div>
        {hasDrawn && (
          <button
            onClick={handleClear}
            className={`flex items-center gap-1.5 text-[16px] font-medium ${t.textMuted}`}
          >
            <RotateCcw size={16} />
            Effacer
          </button>
        )}
      </div>

      <div className={`rounded-xl overflow-hidden relative ${t.signatureCanvasBg}`}>
        <canvas
          ref={canvasRef}
          className="w-full touch-none bg-white"
          style={{ height: 200 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-[15px] opacity-40 ${t.textMuted}`}>
              Signez ici
            </span>
          </div>
        )}
      </div>

      {hasDrawn && (
        <button
          onClick={handleConfirm}
          className={`w-full py-4 rounded-2xl text-[18px] font-bold active:scale-[0.98] ${t.btnPrimary}`}
        >
          Valider la signature
        </button>
      )}
    </div>
  );
};

export default SignatureCanvas;
