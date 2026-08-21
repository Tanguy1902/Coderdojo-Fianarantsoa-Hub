"use client";

import Image from "next/image";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxModalProps {
  open: boolean;
  onClose: () => void;
  images: string[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  title?: string;
}

export function ImageLightboxModal({
  open,
  onClose,
  images,
  activeIndex,
  onIndexChange,
  title,
}: ImageLightboxModalProps) {
  const currentPhoto = images[activeIndex] || images[0];

  const handlePrev = () => {
    onIndexChange(activeIndex === 0 ? images.length - 1 : activeIndex - 1);
  };

  const handleNext = () => {
    onIndexChange(activeIndex === images.length - 1 ? 0 : activeIndex + 1);
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, activeIndex, images.length]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white font-mono text-xs z-10">
        <span>
          {title}
          {title && " — "}
          ({activeIndex + 1} / {images.length})
        </span>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Fermer la vue plein écran"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Center Image */}
      <div className="relative flex-1 w-full my-4 flex items-center justify-center">
        <div className="relative w-full h-full max-w-5xl max-h-[80vh]">
          <Image
            src={currentPhoto}
            alt={title ? `${title} — Photo ${activeIndex + 1}` : `Photo ${activeIndex + 1}`}
            fill
            sizes="100vw"
            className="object-contain"
          />
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white p-4 rounded-full transition-all"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white p-4 rounded-full transition-all"
              aria-label="Photo suivante"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Thumbnail Bar */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto py-2 z-10">
          {images.map((url, idx) => (
            <button
              key={idx}
              onClick={() => onIndexChange(idx)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                idx === activeIndex
                  ? "border-primary scale-110"
                  : "border-transparent opacity-40 hover:opacity-90"
              }`}
            >
              <Image src={url} alt={`Miniature ${idx + 1}`} fill sizes="48px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
