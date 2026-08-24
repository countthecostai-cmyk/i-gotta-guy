import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-52" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
    </div>
  );
}
