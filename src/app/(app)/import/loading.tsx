import { Skeleton } from "@/components/ui/skeleton";

export default function ImportLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {/* Tab strip */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          <Skeleton className="h-8 w-24 -mb-px" />
          <Skeleton className="h-8 w-16 -mb-px" />
        </div>

        {/* Upload area */}
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}
