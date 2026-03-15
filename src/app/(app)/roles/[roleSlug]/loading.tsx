import { Skeleton } from "@/components/ui/skeleton";

export default function RoleLoading() {
  return (
    <div className="space-y-4">
      {/* Role header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 border-b border-gray-200">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 -mb-px" />
        ))}
      </div>

      {/* Filter bar placeholder */}
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
        <div className="flex-1" />
        <Skeleton className="h-8 w-52 rounded-md" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2.5">
          <div className="flex gap-6">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24 hidden lg:block" />
            <Skeleton className="h-3 w-20 hidden xl:block" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12 hidden sm:block" />
          </div>
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-gray-100 px-3 py-3"
          >
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36 hidden lg:block" />
            <Skeleton className="h-4 w-24 hidden xl:block" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
