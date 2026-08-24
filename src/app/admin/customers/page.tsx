import Link from "next/link";
import { requireAdminContext } from "../_lib/require-admin";
import { formatDate, initials } from "../_lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card, EmptyState, Input } from "@/components/ui/primitives";

export const metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { admin } = await requireAdminContext();
  const { q } = await searchParams;
  const search = (q ?? "").trim();

  let query = admin
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(200);

  if (search) query = query.ilike("full_name", `%${search}%`);

  const { data: customers, error } = await query;

  // Job counts per customer, bounded to the customers on this page.
  const ids = (customers ?? []).map((c) => c.id);
  const jobCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: jobs } = await admin.from("jobs").select("customer_id").in("customer_id", ids);
    for (const j of jobs ?? []) jobCounts.set(j.customer_id, (jobCounts.get(j.customer_id) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader title="Customers" description="Everyone who has signed up to request services." />

      <form className="mb-5 max-w-sm" action="/admin/customers" method="get">
        <Input type="search" name="q" placeholder="Search by name…" defaultValue={search} />
      </form>

      {error ? (
        <Card className="p-6 text-sm text-danger">Failed to load customers: {error.message}</Card>
      ) : !customers || customers.length === 0 ? (
        <EmptyState
          title={search ? "No customers match your search" : "No customers yet"}
          description={search ? "Try a different name." : "New signups will appear here."}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Jobs</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-trust-light text-xs font-semibold text-trust-dark">
                        {initials(c.full_name || "Customer")}
                      </div>
                      <span className="font-medium text-ink hover:text-brand">{c.full_name || "Unnamed"}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{jobCounts.get(c.id) ?? 0}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
