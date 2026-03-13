import type { RoleHireSummary } from "@/lib/queries/stats";

interface HiredRejectedTableProps {
  data: RoleHireSummary[];
}

export function HiredRejectedTable({ data }: HiredRejectedTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
        <p className="text-sm text-gray-400">No hired or rejected candidates yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200">
              Role
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 text-right">
              Hired
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 text-right">
              Rejected
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 text-right">
              Hire Rate
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 text-right">
              Junior
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 text-right">
              Senior
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 text-right">
              Avg Days
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const hireRate =
              row.hired + row.rejected > 0
                ? ((row.hired / (row.hired + row.rejected)) * 100).toFixed(1) + "%"
                : "—";
            const avgDays =
              row.avgDaysToHire !== null ? String(row.avgDaysToHire) : "—";

            return (
              <tr
                key={row.roleId}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
              >
                <td className="px-4 py-2.5 font-medium text-gray-900 border-b border-gray-100 last:border-b-0">
                  {row.roleName}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700 border-b border-gray-100 last:border-b-0">
                  <span className="font-medium text-green-700">{row.hired}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700 border-b border-gray-100 last:border-b-0">
                  <span className="font-medium text-red-600">{row.rejected}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700 border-b border-gray-100 last:border-b-0">
                  {hireRate}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 border-b border-gray-100 last:border-b-0">
                  {row.juniorHired}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 border-b border-gray-100 last:border-b-0">
                  {row.seniorHired}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 border-b border-gray-100 last:border-b-0">
                  {avgDays}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
