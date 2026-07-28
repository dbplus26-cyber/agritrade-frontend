"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Draw-to-sign pad: replaces print-sign-scan for waybills, grant agreements
 * and repayment receipts. Renders a bordered canvas the user signs with a
 * finger or mouse; `onCapture` receives a PNG File ready for the existing
 * document-upload mutations. Purely additive - callers keep their FilePicker
 * path for photographed/scanned documents.
 */
export function SignaturePad({
  fileName = "signature.png",
  onCapture,
  className,
}: {
  /** Name given to the produced PNG file. */
  fileName?: string;
  /** Called with the drawn signature as a PNG File. */
  onCapture: (file: File) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Size the backing store to the rendered box (device-pixel aware) once on
  // mount; a resize mid-signature would smear the drawing, so we deliberately
  // do not observe resizes - "Clear" is the recovery.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1F211C";
    // White ground so the exported PNG prints cleanly.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const pointOf = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pointOf(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // A dot for a tap, so single taps leave a mark too.
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setHasInk(true);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointOf(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  }, []);

  const capture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], fileName, { type: "image/png" }));
      clear();
    }, "image/png");
  }, [clear, fileName, onCapture]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="h-[140px] w-full touch-none rounded-[2px] border-[1.5px] border-dashed border-soil/40 bg-white"
        aria-label="Signature pad - draw your signature"
        role="img"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-soil/70">
          Sign above with a finger or mouse
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clear}
            disabled={!hasInk}
            className="cursor-pointer text-[12px] font-semibold text-soil underline-offset-2 hover:underline disabled:cursor-default disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={capture}
            disabled={!hasInk}
            className="cursor-pointer text-[12px] font-semibold text-console underline-offset-2 hover:underline disabled:cursor-default disabled:opacity-50"
          >
            Use signature
          </button>
        </div>
      </div>
    </div>
  );
}
