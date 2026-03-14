"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sheet,
  Link2,
  RefreshCw,
  Trash2,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Pause,
  Play,
} from "lucide-react";
import {
  connectSheet,
  disconnectSheet,
  syncConnectedSheet,
  updateConnectedSheet,
} from "@/lib/actions/sheets";
import type { ConnectedSheet, SyncFrequency } from "@/lib/actions/sheets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Role {
  id: string;
  name: string;
}

interface SheetWithRole extends ConnectedSheet {
  roleName: string;
}

interface SheetsSectionProps {
  sheets: SheetWithRole[];
  roles: Role[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(date: Date | null): string {
  if (!date) return "Never";

  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const FREQUENCY_LABELS: Record<SyncFrequency, string> = {
  manual: "Manual only",
  hourly: "Every hour",
  daily: "Every day",
};

// ---------------------------------------------------------------------------
// Connect Sheet Modal
// ---------------------------------------------------------------------------

function ConnectSheetForm({
  roles,
  onClose,
}: {
  roles: Role[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [sheetUrl, setSheetUrl] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>("daily");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sheetUrl.trim()) {
      toast.error("Please paste a Google Sheet URL.");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a name for this sheet.");
      return;
    }
    if (!roleId) {
      toast.error("Please select a target role.");
      return;
    }

    startTransition(async () => {
      const result = await connectSheet({
        name: name.trim(),
        sheetUrl: sheetUrl.trim(),
        roleId,
        syncFrequency,
      });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Connected "${name.trim()}" successfully!`);
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Connect Google Sheet
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sheet URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Sheet URL
            </label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Sheet must be shared as "Anyone with the link can view"
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Video Editor Applications"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Target Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Import Candidates Into
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sync Frequency
            </label>
            <div className="flex gap-2">
              {(["hourly", "daily", "manual"] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setSyncFrequency(freq)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    syncFrequency === freq
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {freq === "hourly"
                    ? "Hourly"
                    : freq === "daily"
                      ? "Daily"
                      : "Manual"}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Connecting..." : "Connect Sheet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single Sheet Row
// ---------------------------------------------------------------------------

function SheetRow({
  sheet,
  roles,
}: {
  sheet: SheetWithRole;
  roles: Role[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    startTransition(async () => {
      const result = await syncConnectedSheet(sheet.id);
      setIsSyncing(false);
      if (result.error) {
        toast.error(`Sync failed: ${result.error}`);
      } else if (result.newRows === 0) {
        toast.info(`No new rows in "${sheet.name}"`);
      } else {
        toast.success(
          `Synced "${sheet.name}": ${result.importedCount} new candidates imported` +
            (result.skippedDuplicates > 0
              ? `, ${result.skippedDuplicates} duplicates skipped`
              : ""),
        );
      }
    });
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      const result = await updateConnectedSheet(sheet.id, {
        isActive: !sheet.isActive,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          sheet.isActive ? "Sheet paused" : "Sheet reactivated",
        );
      }
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await disconnectSheet(sheet.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Disconnected "${sheet.name}"`);
      }
      setShowConfirmDelete(false);
    });
  };

  const hasError = !!sheet.lastError;

  return (
    <div
      className={`border rounded-lg p-4 ${
        !sheet.isActive
          ? "bg-gray-50 border-gray-200 opacity-70"
          : hasError
            ? "bg-red-50/50 border-red-200"
            : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Sheet info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sheet className="h-4 w-4 text-green-600 shrink-0" />
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {sheet.name}
            </h4>
            {!sheet.isActive && (
              <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                Paused
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
            <span className="inline-flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {sheet.roleName}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {FREQUENCY_LABELS[sheet.syncFrequency as SyncFrequency]}
            </span>
            <span>
              Last synced: {timeAgo(sheet.lastSyncAt)}
            </span>
            {sheet.lastRowCount > 0 && (
              <span>{sheet.lastRowCount} rows</span>
            )}
          </div>

          {/* Error message */}
          {hasError && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{sheet.lastError}</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Open in Google Sheets */}
          <a
            href={sheet.sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Open in Google Sheets"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Sync Now */}
          <button
            onClick={handleSync}
            disabled={isSyncing || isPending}
            className="p-2 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 disabled:opacity-50"
            title="Sync Now"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
          </button>

          {/* Pause / Resume */}
          <button
            onClick={handleToggleActive}
            disabled={isPending}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title={sheet.isActive ? "Pause auto-sync" : "Resume auto-sync"}
          >
            {sheet.isActive ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>

          {/* Delete */}
          {showConfirmDelete ? (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={handleDisconnect}
                disabled={isPending}
                className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-2 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"
              title="Disconnect"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Section
// ---------------------------------------------------------------------------

export function SheetsSection({ sheets, roles }: SheetsSectionProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Connected Sheets
          </h2>
          <p className="text-sm text-gray-500">
            Auto-import candidates from Google Sheets linked to Instagram forms.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Connect Sheet
        </button>
      </div>

      {/* Sheet list */}
      {sheets.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <Sheet className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No sheets connected yet. Connect a Google Sheet to start
            auto-importing candidates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sheets.map((sheet) => (
            <SheetRow key={sheet.id} sheet={sheet} roles={roles} />
          ))}
        </div>
      )}

      {/* Connect modal */}
      {showForm && (
        <ConnectSheetForm roles={roles} onClose={() => setShowForm(false)} />
      )}
    </section>
  );
}
