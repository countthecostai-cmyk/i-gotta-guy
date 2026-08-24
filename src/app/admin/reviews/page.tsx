import Link from "next/link";
import { requireAdminContext } from "../_lib/require-admin";
import { formatDateTime } from "../_lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, EmptyState, Select } from "@/components/ui/primitives";

export const metadata = { title: "Reviews" };

const RATING_OPTIONS = [5, 4, 3, 2, 1];

export default async function ReviewsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ rating?: string }>;
}) {
  const { admin } = await requireAdminContext();
  const { rating } = await searchParams;
  const ratingFilter = rating ? Number(rating) : undefined;

  let query = admin
    .from("reviews")
    .select("id, rating, comment, created_at, job_id, author_id, target_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (ratingFilter) query = query.eq("rating", ratingFilter);

  const { data: reviews, error } = await query;

  const userIds = [...new Set((reviews ?? []).flatMap((r) => [r.author_id, r.target_id]))];
  const nameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", userIds);
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name);
  }

  return (
    <div>
      <PageHeader title="Reviews" description="Every rating and review left by customers and Guys, for moderation visibility." />

      <form className="mb-5 flex flex-wrap items-end gap-3" action="/admin/reviews" method="get">
        <div className="w-44">
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Filter by rating</label>
          <Select name="rating" defaultValue={rating ?? ""}>
            <option value="">All ratings</option>
            {RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} star{r === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="submit"
          className="tap-target h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper hover:bg-ink/90"
        >
          Apply
        </button>
      </form>

      {error ? (
        <Card className="p-6 text-sm text-danger">Failed to load reviews: {error.message}</Card>
      ) : !reviews || reviews.length === 0 ? (
        <EmptyState title="No reviews yet" description="Reviews left after completed jobs will appear here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Comment</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">About</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 font-medium text-ink">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
                  <td className="max-w-xs px-4 py-3 text-ink-soft">{r.comment || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{nameById.get(r.author_id) ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-ink-soft">{nameById.get(r.target_id) ?? "Unknown"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/jobs/${r.job_id}`} className="font-medium text-brand hover:underline">
                      View job
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{formatDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* No deleteReview action is wired up yet — this is a read/audit view.
          Add a server action with an admin-role check in src/lib/actions/admin.ts
          if moderation deletion becomes a requirement. */}
    </div>
  );
}
