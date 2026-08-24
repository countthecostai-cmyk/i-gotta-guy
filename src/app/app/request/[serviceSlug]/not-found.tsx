import Link from "next/link";
import { EmptyState } from "@/components/ui/primitives";

export default function ServiceNotFound() {
  return (
    <EmptyState
      title="We couldn't find that service"
      description="It may have been renamed or is no longer offered. Browse everything we offer from the home screen."
      action={
        <Link href="/app" className="text-sm font-medium text-brand hover:underline">
          Back to home
        </Link>
      }
    />
  );
}
