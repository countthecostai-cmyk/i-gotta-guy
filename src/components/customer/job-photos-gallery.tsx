import { isSafeImageUrl } from "@/lib/domain/safe-url";

export interface JobPhotoData {
  id: string;
  url: string;
  stage: string;
}

const STAGE_LABELS: Record<string, string> = {
  request: "Submitted with request",
  before: "Before",
  after: "After",
};

export function JobPhotosGallery({ photos }: { photos: JobPhotoData[] }) {
  const safePhotos = photos.filter((p) => isSafeImageUrl(p.url));
  if (safePhotos.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {safePhotos.map((photo) => (
        <a
          key={photo.id}
          href={photo.url}
          target="_blank"
          rel="noreferrer"
          className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-paper"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- job photo host is arbitrary storage, not known at build time */}
          <img src={photo.url} alt={STAGE_LABELS[photo.stage] ?? "Job photo"} className="h-full w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            {STAGE_LABELS[photo.stage] ?? photo.stage}
          </span>
        </a>
      ))}
    </div>
  );
}
