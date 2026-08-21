"use client";

import Image from "next/image";
import { useRef, useCallback, useEffect, type ChangeEvent } from "react";
import { z } from "zod";
import { Controller, useFormContext } from "react-hook-form";
import { Camera, CloudUpload, Upload } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { FieldError } from "@/components/common/FieldError";
import { memoryFormSchema } from "@/lib/validation/schemas";

type MemoryFormValues = z.infer<typeof memoryFormSchema>;

interface MemoryUploadModalProps {
  open: boolean;
  imageUrl: string;
  images: string[];
  cloudinaryId?: string;
  isUploading: boolean;
  uploadError?: string | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onClose: () => void;
  onSubmit: (values: MemoryFormValues) => void;
}

export function MemoryUploadModal({
  open,
  imageUrl,
  images = [],
  cloudinaryId,
  isUploading,
  uploadError,
  onFileChange,
  onRemoveImage,
  onClose,
  onSubmit,
}: MemoryUploadModalProps) {
  const { control, handleSubmit, formState } = useFormContext<MemoryFormValues>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevSubmitCount = useRef(formState.submitCount);

  const handleClose = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (formState.submitCount > prevSubmitCount.current && !formState.isSubmitting) {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    prevSubmitCount.current = formState.submitCount;
  }, [formState.submitCount, formState.isSubmitting]);

  if (!open) return null;

  const allImages = images.length > 0 ? images : imageUrl ? [imageUrl] : [];

  return (
    <Modal
      title="Ajouter un souvenir (Multi-photos)"
      icon={<Camera className="w-5 h-5 text-primary" />}
      onClose={handleClose}
      maxWidth="max-w-xl"
    >
      <div className="flex justify-between items-center mb-4">
        <p className="font-mono text-xs text-primary font-semibold">
          Stockage Cloudinary + Galerie Multi-photos activé
        </p>
        {cloudinaryId && (
          <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
            ID: {cloudinaryId}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <Field label="Titre du souvenir">
              <input
                type="text"
                {...field}
                placeholder="Ex: Workshop Python & Hackathon"
                className={inputClassName}
              />
              <FieldError message={fieldState.error?.message} />
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field label="Description">
              <textarea
                rows={3}
                {...field}
                placeholder="Raconte cette belle aventure..."
                className={`${inputClassName} resize-none`}
              />
              <FieldError message={fieldState.error?.message} />
            </Field>
          )}
        />

        <div>
          <label className="font-mono text-xs uppercase tracking-wider text-on-surface font-semibold mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CloudUpload className="w-4 h-4 text-primary" />
              Photos du souvenir ({allImages.length})
            </span>
            <span className="text-[10px] text-on-surface-variant normal-case">
              Sélectionnez une ou plusieurs photos
            </span>
          </label>

          {uploadError && (
            <p className="font-mono text-xs text-error mb-2" role="alert">{uploadError}</p>
          )}

          <div className="flex items-center gap-3 mb-3">
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={onFileChange}
              className="w-full text-xs font-mono text-on-surface bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-surface-tint"
            />
            {isUploading && (
              <span className="font-mono text-xs text-primary animate-pulse flex items-center gap-1 shrink-0">
                <Upload className="w-4 h-4 animate-bounce" />
                Upload...
              </span>
            )}
          </div>

          {/* Grid Preview of Attached Photos */}
          {allImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
              {allImages.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-outline-variant/40 group">
                  <Image src={url} alt={`Photo ${idx + 1}`} fill sizes="100px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold transition-colors"
                    title="Supprimer cette photo"
                  >
                    ✕
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-primary text-on-primary font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Couverture
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Controller
          name="eventDate"
          control={control}
          render={({ field, fieldState }) => (
            <Field label="Mois & Année">
              <input
                type="text"
                {...field}
                className={inputClassName}
              />
              <FieldError message={fieldState.error?.message} />
            </Field>
          )}
        />

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-full font-mono text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="bg-primary text-on-primary font-mono text-xs font-semibold px-6 py-2.5 rounded-full hover:bg-surface-tint disabled:opacity-50"
          >
            Publier le souvenir ({allImages.length} photo{allImages.length > 1 ? "s" : ""})
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-mono text-xs uppercase tracking-wider text-on-surface font-semibold mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClassName =
  "w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-on-surface font-body focus:outline-none focus:ring-2 focus:ring-primary";
