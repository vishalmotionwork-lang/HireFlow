import { Inbox } from "lucide-react";

export default function MasterPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Master View</h1>
        <p className="mt-1 text-sm text-gray-500">All Candidates</p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Inbox size={22} className="text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-700">No candidates yet</h3>
        <p className="mt-1 max-w-xs text-xs text-gray-400">
          All candidates across every role will appear here once imported or
          added manually.
        </p>
      </div>
    </div>
  );
}
