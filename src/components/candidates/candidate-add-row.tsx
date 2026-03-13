"use client";

import { useActionState } from "react";
import { createCandidate } from "@/lib/actions/candidates";

interface CandidateAddRowProps {
  roleId: string;
  onCancel: () => void;
}

type FormErrors = Record<string, string[]>;

// State shape must be a single concrete type (not union) for useActionState to infer correctly
interface AddRowState {
  fieldErrors?: FormErrors;
  generalError?: string;
  success?: boolean;
}

const initialState: AddRowState = {};

export function CandidateAddRow({ roleId, onCancel }: CandidateAddRowProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: AddRowState, formData: FormData): Promise<AddRowState> => {
      const result = await createCandidate(formData);
      if ("success" in result && result.success) {
        onCancel();
        return { success: true };
      }
      if ("error" in result) {
        if (typeof result.error === "string") {
          return { generalError: result.error };
        }
        return { fieldErrors: result.error as FormErrors };
      }
      return { generalError: "An unexpected error occurred." };
    },
    initialState,
  );

  const errors: FormErrors = state?.fieldErrors ?? {};

  return (
    <tr className="border-b border-blue-100 bg-blue-50/30">
      <td colSpan={8} className="px-3 py-2">
        <form action={formAction} className="flex flex-wrap items-start gap-2">
          <input type="hidden" name="roleId" value={roleId} />

          {/* Name */}
          <div className="flex flex-col min-w-[140px]">
            <input
              name="name"
              type="text"
              required
              placeholder="Name *"
              autoFocus
              className="rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
              aria-label="Candidate name"
            />
            {errors.name && (
              <span className="text-xs text-red-500 mt-0.5">
                {errors.name[0]}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col min-w-[160px]">
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
              aria-label="Email address"
            />
            {errors.email && (
              <span className="text-xs text-red-500 mt-0.5">
                {errors.email[0]}
              </span>
            )}
          </div>

          {/* Portfolio URL */}
          <div className="flex flex-col min-w-[160px]">
            <input
              name="portfolioUrl"
              type="url"
              placeholder="Portfolio URL"
              className="rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
              aria-label="Portfolio URL"
            />
            {errors.portfolioUrl && (
              <span className="text-xs text-red-500 mt-0.5">
                {errors.portfolioUrl[0]}
              </span>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col min-w-[120px]">
            <input
              name="phone"
              type="tel"
              placeholder="Phone"
              className="rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
              aria-label="Phone / WhatsApp"
            />
            {errors.phone && (
              <span className="text-xs text-red-500 mt-0.5">
                {errors.phone[0]}
              </span>
            )}
          </div>

          {/* Instagram */}
          <div className="flex flex-col min-w-[120px]">
            <input
              name="instagram"
              type="text"
              placeholder="Instagram"
              className="rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
              aria-label="Instagram handle"
            />
            {errors.instagram && (
              <span className="text-xs text-red-500 mt-0.5">
                {errors.instagram[0]}
              </span>
            )}
          </div>

          {/* General error message */}
          {state?.generalError && (
            <span className="text-xs text-red-500 self-center">
              {state.generalError}
            </span>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
