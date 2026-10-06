"use client";

import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";

type CropRatio = "square" | "portrait" | "landscape";

const CROP_RATIOS: Record<CropRatio, number> = {
  square: 1,
  portrait: 3 / 4,
  landscape: 4 / 3,
};

type MenuImageCropEditorProps = {
  src: string | null;
  onApply: (file: File, previewUrl: string) => void;
};

export default function MenuImageCropEditor({ src, onApply }: MenuImageCropEditorProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [ratio, setRatio] = useState<CropRatio>("square");
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(50);
  const [vertical, setVertical] = useState(50);
  const [imageReady, setImageReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    setImageReady(false);
    setError(null);
    setZoom(1);
    setHorizontal(50);
    setVertical(50);

    if (!src) {
      imageRef.current = null;
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageRef.current = image;
      setImageReady(true);
    };
    image.onerror = () => {
      imageRef.current = null;
      setError("This image could not be loaded for cropping. Try selecting the image again.");
    };
    image.src = src;
  }, [src]);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !imageReady) return;

    const aspect = CROP_RATIOS[ratio];
    const previewWidth = 480;
    const previewHeight = Math.round(previewWidth / aspect);
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    const crop = getCropRect(image.naturalWidth, image.naturalHeight, aspect, zoom, horizontal, vertical);
    const context = canvas.getContext("2d");
    context?.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      previewWidth,
      previewHeight,
    );
  }, [imageReady, ratio, zoom, horizontal, vertical]);

  const applyCrop = async () => {
    const image = imageRef.current;
    if (!image || !imageReady) return;

    setApplying(true);
    setError(null);
    try {
      const aspect = CROP_RATIOS[ratio];
      const outputWidth = 1200;
      const outputHeight = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const crop = getCropRect(image.naturalWidth, image.naturalHeight, aspect, zoom, horizontal, vertical);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare this image for cropping.");

      context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result
            ? resolve(result)
            : reject(new Error("Your browser could not export this crop.")),
          "image/jpeg",
          0.92,
        );
      });
      const file = new File([blob], "menu-item-crop.jpg", { type: "image/jpeg" });
      onApply(file, URL.createObjectURL(file));
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "Could not crop this image.");
    } finally {
      setApplying(false);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!imageReady || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const pointer = pointerRef.current;
    if (!image || !canvas || !pointer || pointer.id !== event.pointerId) return;

    const bounds = canvas.getBoundingClientRect();
    const crop = getCropRect(image.naturalWidth, image.naturalHeight, CROP_RATIOS[ratio], zoom, horizontal, vertical);
    const horizontalTravel = image.naturalWidth - crop.width;
    const verticalTravel = image.naturalHeight - crop.height;
    const deltaX = event.clientX - pointer.x;
    const deltaY = event.clientY - pointer.y;
    pointerRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };

    if (horizontalTravel > 0) {
      setHorizontal((position) =>
        clamp(position - (deltaX * crop.width / bounds.width / horizontalTravel) * 100, 0, 100),
      );
    }
    if (verticalTravel > 0) {
      setVertical((position) =>
        clamp(position - (deltaY * crop.height / bounds.height / verticalTravel) * 100, 0, 100),
      );
    }
  };

  const handlePointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointerRef.current?.id !== event.pointerId) return;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setZoom((current) => clamp(current + (event.deltaY < 0 ? 0.1 : -0.1), 1, 3));
  };

  if (!src) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Crop and position</h3>
          <p className="mt-1 text-xs text-slate-500">Drag the image to position it; use the mouse wheel to zoom.</p>
        </div>
        <label className="text-xs font-semibold text-slate-600">
          Shape
          <select
            value={ratio}
            onChange={(event) => setRatio(event.target.value as CropRatio)}
            className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
          >
            <option value="square">Square</option>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </label>
      </div>

      <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl bg-slate-100">
        <canvas
          ref={canvasRef}
          aria-label="Preview of menu image crop"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
          className="block max-h-72 w-full touch-none cursor-grab object-contain active:cursor-grabbing"
        />
        {!imageReady && !error && <p className="p-6 text-center text-sm text-slate-500">Loading image...</p>}
      </div>

      <p className="text-xs text-slate-500">Zoom: {zoom.toFixed(1)}× · Scroll over the image to adjust</p>

      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button
        type="button"
        onClick={() => void applyCrop()}
        disabled={!imageReady || applying}
        className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {applying ? "Applying crop..." : "Apply crop"}
      </button>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCropRect(
  imageWidth: number,
  imageHeight: number,
  targetAspect: number,
  zoom: number,
  horizontal: number,
  vertical: number,
) {
  let width = imageWidth;
  let height = imageHeight;

  if (width / height > targetAspect) {
    width = height * targetAspect;
  } else {
    height = width / targetAspect;
  }

  width /= zoom;
  height /= zoom;

  return {
    x: (imageWidth - width) * (horizontal / 100),
    y: (imageHeight - height) * (vertical / 100),
    width,
    height,
  };
}
