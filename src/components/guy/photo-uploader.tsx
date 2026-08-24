"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSafeImageUrl } from "@/lib/domain/safe-url";
import { ErrorBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/primitives";

export interface JobPhotoData {
  id: string;
  url: string;
  stage: string;
}

const STAGE_LABELS: Record<string, string> = { before: "Before", after: "After", request: "Request" };

export function PhotoUploader({ jobId, photos }: { jobId: string; photos: JobPhotoData[] }) {
  const router = useRouter();
  const [stage, setStage] = useState<"before" | "after">("before");
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);

  async function insertPhotoRow(photoUrl: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: insertErr } = await supabase
      .from("job_photos")
      .insert({ job_id: jobId, url: photoUrl, stage, uploaded_by: user?.id ?? null });
    if (insertErr) throw new Error(insertErr.message);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const path = `${jobId}/${stage}-${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("job-photos").upload(path, file);
      if (uploadErr) {
        setStorageAvailable(false);
        throw new Error("Photo storage isn't set up yet — paste an image URL below instead.");
      }
      const { data: pub } = supabase.storage.from("job-photos").getPublicUrl(path);
      await insertPhotoRow(pub.publicUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that photo.");
    } finally {
      setPending(false);
      e.target.value = "";
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isSafeImageUrl(trimmed)) {
      setError("Please paste a valid http:// or https:// image link.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await insertPhotoRow(trimmed);
      setUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that photo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.filter((p) => isSafeImageUrl(p.url)).map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-xl border border-line bg-ink/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={STAGE_LABELS[p.stage] ?? p.stage} className="h-full w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                {STAGE_LABELS[p.stage] ?? p.stage}
              </span>
            </a>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-line p-3">
        <div className="mb-2 flex items-center gap-2">
          <Camera className="h-4 w-4 text-ink-soft" />
          <span className="text-sm font-medium text-ink">Add a photo</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={stage}
            onChange={(e) => setStage(e.target.value as "before" | "after")}
            className="w-auto"
            aria-label="Photo stage"
          >
            <option value="before">Before</option>
            <option value="after">After</option>
          </Select>
          <label className="tap-target inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5">
            <Upload className="h-4 w-4" />
            {pending ? "Uploading…" : "Upload photo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={pending} />
          </label>
        </div>
        {!storageAvailable && (
          <form onSubmit={handleUrlSubmit} className="mt-3 flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste an image URL"
              className="tap-target flex-1 rounded-xl border border-line bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <Button type="submit" size="sm" variant="outline" disabled={pending || !url.trim()}>
              Add
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
