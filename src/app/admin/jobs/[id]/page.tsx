import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminContext } from "../../_lib/require-admin";
import { formatDateTime } from "../../_lib/format";
import { JobStatusBadge, PaymentStatusBadge } from "@/components/admin/StatusBadges";
import { ReasonActionButton } from "@/components/admin/ReasonActionButton";
import { DisputeResolutionModal } from "@/components/admin/DisputeResolutionModal";
import { Card } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/domain/job-state-machine";
import { adminRefundJob } from "@/lib/actions/admin";

export const metadata = { title: "Job detail" };

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin } = await requireAdminContext();

  const { data: job } = await admin.from("jobs").select("*").eq("id", id).maybeSingle();
  if (!job) notFound();

  const [{ data: service }, { data: customer }, { data: guyProfile }, { data: address }, { data: history }, { data: payment }] =
    await Promise.all([
      admin.from("services").select("name, pricing_model").eq("id", job.service_id).maybeSingle(),
      admin.from("profiles").select("id, full_name, phone").eq("id", job.customer_id).maybeSingle(),
      job.guy_id
        ? admin.from("profiles").select("full_name, phone").eq("id", job.guy_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("addresses").select("*").eq("id", job.address_id).maybeSingle(),
      admin.from("job_status_history").select("*").eq("job_id", id).order("created_at", { ascending: true }),
      // A tipped job has a second, separate payments row (see addTip) —
      // scope to the primary service charge, not "most recent payment"
      // (which would be the tip), so refund eligibility reflects the
      // charge that adminRefundJob() actually refunds.
      admin.from("payments").select("*").eq("job_id", id).eq("kind", "charge").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

  const status = job.status as JobStatus;
  const canRefund = payment?.status === "succeeded" && status !== "REFUNDED";

  return (
    <div>
      <Link href="/admin/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={15} /> Back to Jobs
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{service?.name ?? "Job"}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <JobStatusBadge status={status} />
            <span className="text-sm text-ink-soft">Requested {formatDateTime(job.requested_at)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "DISPUTED" && <DisputeResolutionModal jobId={job.id} />}
          {canRefund && (
            <ReasonActionButton
              label="Issue refund"
              title="Refund this job"
              fieldLabel="Refund reason"
              confirmVariant="danger"
              action={adminRefundJob.bind(null, job.id)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink">Pricing breakdown</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Service amount" value={formatCents(job.service_amount_cents)} />
              <Row label="Add-ons" value={formatCents(job.addon_amount_cents)} />
              <Row label="Discount" value={job.discount_cents > 0 ? `−${formatCents(job.discount_cents)}` : formatCents(0)} />
              <Row label="Tax" value={formatCents(job.tax_cents)} />
              <Row label="Platform fee" value={formatCents(job.platform_fee_cents)} />
              <Row label="Tip" value={formatCents(job.tip_cents)} />
              <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm font-semibold">
                <span className="text-ink">Customer total</span>
                <span className="text-ink">{formatCents(job.total_cents)}</span>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{job.description || "No description provided."}</p>
            {job.details && Object.keys(job.details).length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-line pt-3">
                {Object.entries(job.details as Record<string, unknown>).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 text-sm">
                    <span className="text-ink-soft">{key.replace(/_/g, " ")}</span>
                    <span className="text-right text-ink">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink">Status history</h2>
            {!history || history.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No history recorded.</p>
            ) : (
              <ol className="mt-3 space-y-3 border-l border-line pl-4">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand" />
                    <div className="flex flex-wrap items-center gap-2">
                      <JobStatusBadge status={h.status as JobStatus} />
                      <span className="text-xs text-ink-soft">{formatDateTime(h.created_at)}</span>
                    </div>
                    {h.note && <p className="mt-1 text-sm text-ink-soft">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink">Customer</h2>
            <p className="mt-2 text-sm font-medium text-ink">
              <Link href={`/admin/customers/${customer?.id}`} className="hover:text-brand">
                {customer?.full_name ?? "Unknown"}
              </Link>
            </p>
            <p className="text-sm text-ink-soft">{customer?.phone || "No phone on file"}</p>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink">Guy</h2>
            {job.guy_id ? (
              <>
                <p className="mt-2 text-sm font-medium text-ink">
                  <Link href={`/admin/guys/${job.guy_id}`} className="hover:text-brand">
                    {guyProfile?.full_name ?? "Unknown"}
                  </Link>
                </p>
                <p className="text-sm text-ink-soft">{guyProfile?.phone || "No phone on file"}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Not yet assigned ({JOB_STATUS_LABELS[status]}).</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink">Location</h2>
            {address ? (
              <p className="mt-2 text-sm text-ink-soft">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.state} {address.postal_code}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">
                {job.city}, {job.state} {job.postal_code}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-ink">Payment</h2>
            {!payment ? (
              <p className="mt-2 text-sm text-ink-soft">No payment record yet.</p>
            ) : (
              <dl className="mt-2 space-y-2 text-sm">
                <Row label="Status" value={<PaymentStatusBadge status={payment.status} />} />
                <Row label="Charged" value={formatCents(payment.amount_cents)} />
                {payment.refunded_cents > 0 && <Row label="Refunded" value={formatCents(payment.refunded_cents)} />}
                <Row label="Processor" value={<span className="capitalize">{payment.processor}</span>} />
                <Row label="Processor fee" value={formatCents(payment.processor_fee_cents)} />
              </dl>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
