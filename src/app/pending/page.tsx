"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut, CheckCircle, Loader2 } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Poll every 5 seconds to check approval status
    const interval = setInterval(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("team_members")
        .select("is_active")
        .eq("user_id", user.id)
        .single();

      if (data?.is_active) {
        setApproved(true);
        clearInterval(interval);
        // Brief delay to show the approved state, then redirect
        setTimeout(() => router.replace("/dashboard"), 1500);
      }
    }, 5000);

    // Also listen for realtime changes
    const channel = supabase
      .channel("pending-approval")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "team_members" },
        (payload) => {
          if (payload.new?.is_active) {
            setApproved(true);
            clearInterval(interval);
            setTimeout(() => router.replace("/dashboard"), 1500);
          }
        },
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [router]);

  if (approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="w-full max-w-sm mx-auto p-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-gray-900">
                You&apos;re Approved!
              </h1>
              <p className="text-sm text-gray-500">
                Redirecting to dashboard...
              </p>
            </div>
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

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
              This page will update automatically when you&apos;re approved.
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
