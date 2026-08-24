import { ShieldCheck, Star, User } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";

export interface GuyProfileData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  avg_rating: number | null;
  rating_count: number;
  completed_jobs_count: number;
  identity_verified: boolean;
  background_check_status: string;
}

export function GuyCard({ guy }: { guy: GuyProfileData }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-brand-dark">
        {guy.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar host is arbitrary/admin-configured, not known at build time
          <img src={guy.avatar_url} alt={guy.full_name} width={48} height={48} className="h-full w-full object-cover" />
        ) : (
          <User className="h-6 w-6" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-semibold text-ink">{guy.full_name || "Your Guy"}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          {guy.avg_rating != null && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {guy.avg_rating.toFixed(1)} ({guy.rating_count})
            </span>
          )}
          <span>{guy.completed_jobs_count} jobs completed</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {guy.identity_verified && (
            <Badge variant="trust">
              <ShieldCheck className="h-3 w-3" /> ID verified
            </Badge>
          )}
          {guy.background_check_status === "passed" && <Badge variant="trust">Background checked</Badge>}
        </div>
      </div>
    </Card>
  );
}
