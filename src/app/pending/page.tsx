"use client";

import { Clock, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
      <div className="w-full max-w-sm mx-auto p-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock size={32} className="text-amber-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-gray-900">
              Pending Approval
            </h1>
            <p className="text-sm text-gray-500 max-w-xs">
              Your request has been sent to an admin for approval. You&apos;ll
              receive access once an admin reviews and approves your account.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              This usually takes a few hours. Try signing in again later, or
              reach out to your team admin directly.
            </p>
          </div>

          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
