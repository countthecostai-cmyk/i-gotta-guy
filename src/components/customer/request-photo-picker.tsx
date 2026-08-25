"use client";

import { useEffect, useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

export interface PickedPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

const MAX_PHOTOS = 10;

/**
 * Lets the customer attach photos to a service request before it's
 * created — "Take Photo" opens the device camera directly (via the
 * `capture` attribute, where the browser supports it), "Upload Photo"
 * opens the normal file picker with multi-select. Files are held
 * client-side (with local object-URL previews) until the job is actually
 * created, at which point the caller uploads them and attaches them to
 * the new job's id.
 */
export function RequestPhotoPicker({
  photos,
  onChange,
}: {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
}) {
  // Revoke every object URL still outstanding when the picker unmounts
  // (e.g. navigating away without submitting) to avoid leaking memory.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    return () => {
      for (const p of photosRef.current) URL.revokeObjectURL(p.previewUrl);
    };
  }, []);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    const files = Array.from(fileList).slice(0, room);
    const added: PickedPhoto[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    onChange([...photos, ...added]);
  }

  function removePhoto(id: string) {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(photos.filter((p) => p.id !== id));
  }

  const atLimit = photos.length >= MAX_PHOTOS;

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a build-time-known host */}
              <img src={p.previewUrl} alt="Selected photo" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                aria-label="Remove photo"
                className="tap-target absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label
          className={`tap-target inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink/5 ${atLimit ? "pointer-events-none opacity-50" : ""}`}
        >
          <Camera className="h-4 w-4" />
          Take Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={atLimit}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label
          className={`tap-target inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink/5 ${atLimit ? "pointer-events-none opacity-50" : ""}`}
        >
          <ImagePlus className="h-4 w-4" />
          Upload Photo
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={atLimit}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="text-xs text-ink-soft">
        {photos.length > 0 ? `${photos.length}/${MAX_PHOTOS} photos added.` : "Add photos so your Guy can see the job beforehand — great for lawn mowing, yard work, tree trimming, and more."}
      </p>
    </div>
  );
}
