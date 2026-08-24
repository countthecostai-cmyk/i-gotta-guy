import Link from "next/link";
import { EmptyState } from "@/components/ui/primitives";

export default function JobNotFound() {
  return (
    <EmptyState
      title="We couldn't find that job"
      description="It may have been removed, or it doesn't belong to your account."
      action={
        <Link href="/app/jobs" className="text-sm font-medium text-brand hover:underline">
          Back to your jobs
        </Link>
      }
    />
  );
}
