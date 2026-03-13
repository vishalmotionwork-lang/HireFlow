"use client";

import { useReducer, useEffect, useState, useCallback } from "react";
import { Step1Upload } from "@/components/import/Step1Upload";
import { Step2Mapping } from "@/components/import/Step2Mapping";
import { Step3Validate } from "@/components/import/Step3Validate";
import { Step4Summary } from "@/components/import/Step4Summary";
import { StepUrlPaste } from "@/components/import/StepUrlPaste";
import { ExtractionProgress } from "@/components/import/ExtractionProgress";
import { ExtractionReviewList } from "@/components/import/ExtractionReviewList";
import { ExtractionReviewModal } from "@/components/import/ExtractionReviewModal";
import type { ExtractionStatusDraft } from "@/components/import/ExtractionProgress";
import type {
  ParseResult,
  RawRow,
  ColumnMapping,
  ValidatedRow,
  DuplicateInfo,
  ImportResult,
} from "@/lib/import/types";
import type { Role, ExtractionDraft } from "@/types";

// ---------------------------------------------------------------------------
// Import tab type (top-level mode switcher)
// ---------------------------------------------------------------------------

type ImportTab = "file" | "url";

// ---------------------------------------------------------------------------
// Wizard state
// ---------------------------------------------------------------------------

type WizardStep = "upload" | "map" | "validate" | "summary";

interface WizardState {
  step: WizardStep;
  rawRows: RawRow[];
  headers: string[];
  mapping: ColumnMapping;
  targetRoleId: string;
  source: "excel" | "csv" | "paste";
  validatedRows: ValidatedRow[];
  duplicateInfo: Record<number, DuplicateInfo>;
  result: ImportResult | null;
}

const INITIAL_STATE: WizardState = {
  step: "upload",
  rawRows: [],
  headers: [],
  mapping: {},
  targetRoleId: "",
  source: "csv",
  validatedRows: [],
  duplicateInfo: {},
  result: null,
};

// ---------------------------------------------------------------------------
// Reducer actions
// ---------------------------------------------------------------------------

type WizardAction =
  | {
      type: "FILE_PARSED";
      payload: ParseResult & { source: "excel" | "csv" | "paste" };
    }
  | {
      type: "MAPPING_CONFIRMED";
      payload: { mapping: ColumnMapping; targetRoleId: string };
    }
  | {
      type: "VALIDATION_COMPLETE";
      payload: {
        validatedRows: ValidatedRow[];
        duplicateInfo: Record<number, DuplicateInfo>;
      };
    }
  | { type: "IMPORT_COMPLETE"; payload: ImportResult }
  | { type: "BACK" }
  | { type: "RESET" };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "FILE_PARSED":
      return {
        ...state,
        step: "map",
        headers: action.payload.headers,
        rawRows: action.payload.rows,
        source: action.payload.source,
        mapping: {},
      };
    case "MAPPING_CONFIRMED":
      return {
        ...state,
        step: "validate",
        mapping: action.payload.mapping,
        targetRoleId: action.payload.targetRoleId,
      };
    case "VALIDATION_COMPLETE":
      return {
        ...state,
        step: "summary",
        validatedRows: action.payload.validatedRows,
        duplicateInfo: action.payload.duplicateInfo,
      };
    case "IMPORT_COMPLETE":
      return {
        ...state,
        step: "summary",
        result: action.payload,
      };
    case "BACK": {
      const prevStepMap: Partial<Record<WizardStep, WizardStep>> = {
        map: "upload",
        validate: "map",
        summary: "validate",
      };
      const prevStep = prevStepMap[state.step];
      return prevStep ? { ...state, step: prevStep } : state;
    }
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Session storage persistence key
// ---------------------------------------------------------------------------

const SESSION_KEY = "hireflow-import-wizard";

function loadSessionState(): WizardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as WizardState) : null;
  } catch {
    return null;
  }
}

function saveSessionState(state: WizardState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function clearSessionState(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map" },
  { key: "validate", label: "Validate" },
  { key: "summary", label: "Summary" },
];

const STEP_ORDER: WizardStep[] = ["upload", "map", "validate", "summary"];

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step dot */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-blue-500 text-white"
                    : isCurrent
                      ? "bg-blue-500 text-white ring-4 ring-blue-100"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isCurrent
                    ? "text-blue-600"
                    : isDone
                      ? "text-gray-600"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-16 mx-2 mt-[-14px] rounded transition-colors ${
                  i < currentIndex ? "bg-blue-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImportWizard component
// ---------------------------------------------------------------------------

interface ImportWizardProps {
  roles: Role[];
}

export function ImportWizard({ roles }: ImportWizardProps) {
  // ---------------------------------------------------------------------------
  // Top-level tab (File Upload flow vs URL flow)
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<ImportTab>("file");

  // ---------------------------------------------------------------------------
  // URL extraction flow state
  // ---------------------------------------------------------------------------
  const [extractionBatchId, setExtractionBatchId] = useState<string | null>(
    null,
  );
  const [extractionCandidateId, setExtractionCandidateId] = useState<
    string | null
  >(null);
  const [extractionDrafts, setExtractionDrafts] = useState<
    ExtractionStatusDraft[] | null
  >(null);
  // Review state
  const [reviewDrafts, setReviewDrafts] = useState<ExtractionDraft[] | null>(
    null,
  );
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // File/paste import flow state (existing reducer)
  // ---------------------------------------------------------------------------
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE, () => {
    return loadSessionState() ?? INITIAL_STATE;
  });

  // Persist state on every change (except when back at upload or import done)
  useEffect(() => {
    if (state.result !== null || state.step === "upload") {
      clearSessionState();
    } else {
      saveSessionState(state);
    }
  }, [state]);

  // ---------------------------------------------------------------------------
  // File/paste handlers
  // ---------------------------------------------------------------------------

  const handleParsed = (
    result: ParseResult,
    source: "excel" | "csv" | "paste",
  ) => {
    dispatch({ type: "FILE_PARSED", payload: { ...result, source } });
  };

  const handleImportComplete = (result: ImportResult) => {
    dispatch({ type: "IMPORT_COMPLETE", payload: result });
  };

  const handleMappingConfirmed = (
    mapping: ColumnMapping,
    targetRoleId: string,
  ) => {
    dispatch({ type: "MAPPING_CONFIRMED", payload: { mapping, targetRoleId } });
  };

  const handleBack = () => {
    dispatch({ type: "BACK" });
  };

  const handleReset = () => {
    clearSessionState();
    dispatch({ type: "RESET" });
  };

  // ---------------------------------------------------------------------------
  // URL extraction handlers
  // ---------------------------------------------------------------------------

  const handleBatchStarted = (batchId: string, candidateId?: string) => {
    setExtractionBatchId(batchId);
    setExtractionCandidateId(candidateId ?? null);
    setExtractionDrafts(null);
    setReviewDrafts(null);
    setSelectedDraftId(null);
  };

  const handleExtractionComplete = (drafts: ExtractionStatusDraft[]) => {
    setExtractionDrafts(drafts);
    // Transition directly to review: use the drafts from polling as ExtractionDraft
    const asDrafts = drafts as unknown as ExtractionDraft[];
    setReviewDrafts(asDrafts);
    // Auto-select the first reviewable draft
    const firstReviewable = asDrafts.find((d) => d.status === "completed");
    setSelectedDraftId(firstReviewable?.id ?? null);
  };

  const handleExtractionReset = () => {
    setExtractionBatchId(null);
    setExtractionCandidateId(null);
    setExtractionDrafts(null);
    setReviewDrafts(null);
    setSelectedDraftId(null);
  };

  // Re-fetch drafts from API after confirm/skip to get updated statuses
  const refreshReviewDrafts = useCallback(async () => {
    if (!extractionBatchId) return;
    try {
      const res = await fetch(`/api/extraction-status/${extractionBatchId}`);
      if (!res.ok) return;
      const data = await res.json();
      const asDrafts = data.drafts as unknown as ExtractionDraft[];
      setReviewDrafts(asDrafts);
    } catch {
      // ignore — stale data is acceptable
    }
  }, [extractionBatchId]);

  // Navigate to the next/prev reviewable draft
  const getReviewableIds = (drafts: ExtractionDraft[]) =>
    drafts.filter((d) => d.status === "completed").map((d) => d.id);

  const handleReviewConfirm = useCallback(async () => {
    await refreshReviewDrafts();
    // Auto-advance to next completed draft
    if (!reviewDrafts || !selectedDraftId) return;
    const ids = getReviewableIds(reviewDrafts);
    const idx = ids.indexOf(selectedDraftId);
    const nextId = ids[idx + 1] ?? ids[idx - 1] ?? null;
    setSelectedDraftId(nextId);
  }, [refreshReviewDrafts, reviewDrafts, selectedDraftId]);

  const handleReviewSkip = useCallback(async () => {
    await refreshReviewDrafts();
    // Auto-advance to next completed draft
    if (!reviewDrafts || !selectedDraftId) return;
    const ids = getReviewableIds(reviewDrafts);
    const idx = ids.indexOf(selectedDraftId);
    const nextId = ids[idx + 1] ?? ids[idx - 1] ?? null;
    setSelectedDraftId(nextId);
  }, [refreshReviewDrafts, reviewDrafts, selectedDraftId]);

  // ---------------------------------------------------------------------------
  // Tab switcher resets URL flow when switching tabs
  // ---------------------------------------------------------------------------

  const handleTabChange = (tab: ImportTab) => {
    setActiveTab(tab);
    if (tab === "file") {
      handleExtractionReset();
    } else {
      handleReset();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Determine whether we're deep in the file/paste wizard (past upload step)
  const isDeepInFileWizard = state.step !== "upload";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Top-level import mode tabs — hidden when deep in the file/paste wizard */}
      {!isDeepInFileWizard && !extractionBatchId && (
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          <button
            onClick={() => handleTabChange("file")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "file"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            File Upload
          </button>
          <button
            onClick={() => handleTabChange("url")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "url"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            URL
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* FILE/PASTE FLOW                                                     */}
      {/* ------------------------------------------------------------------ */}

      {activeTab === "file" && (
        <>
          <StepIndicator currentStep={state.step} />

          {state.step === "upload" && <Step1Upload onParsed={handleParsed} />}

          {state.step === "map" && (
            <Step2Mapping
              headers={state.headers}
              rows={state.rawRows}
              roles={roles}
              onConfirm={handleMappingConfirmed}
              onBack={handleBack}
            />
          )}

          {state.step === "validate" && (
            <Step3Validate
              rows={state.rawRows}
              headers={state.headers}
              mapping={state.mapping}
              targetRoleId={state.targetRoleId}
              roles={roles}
              source={state.source}
              onImportComplete={handleImportComplete}
              onBack={handleBack}
            />
          )}

          {state.step === "summary" && state.result !== null && (
            <Step4Summary
              result={state.result}
              onStartNew={handleReset}
              targetRoleId={state.targetRoleId}
              roles={roles}
            />
          )}
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* URL EXTRACTION FLOW                                                 */}
      {/* ------------------------------------------------------------------ */}

      {activeTab === "url" && !extractionBatchId && (
        <StepUrlPaste
          roles={roles.map((r) => ({ id: r.id, name: r.name }))}
          onBatchStarted={handleBatchStarted}
        />
      )}

      {activeTab === "url" && extractionBatchId && !extractionDrafts && (
        <ExtractionProgress
          batchId={extractionBatchId}
          onComplete={handleExtractionComplete}
        />
      )}

      {activeTab === "url" &&
        extractionDrafts &&
        reviewDrafts &&
        (() => {
          const allDone = reviewDrafts.every(
            (d) =>
              d.status === "applied" ||
              d.status === "reviewed" ||
              d.status === "failed",
          );
          const confirmedCount = reviewDrafts.filter(
            (d) => d.status === "applied",
          ).length;
          const skippedCount = reviewDrafts.filter(
            (d) => d.status === "reviewed",
          ).length;
          const failedCount = reviewDrafts.filter(
            (d) => d.status === "failed",
          ).length;

          const reviewableIds = reviewDrafts
            .filter((d) => d.status === "completed")
            .map((d) => d.id);
          const selectedDraft = selectedDraftId
            ? (reviewDrafts.find((d) => d.id === selectedDraftId) ?? null)
            : null;
          const selectedIdx = selectedDraft
            ? reviewableIds.indexOf(selectedDraft.id)
            : -1;

          if (allDone) {
            return (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-5">
                  <p className="text-sm font-semibold text-green-800 mb-2">
                    All done!
                  </p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>
                      {confirmedCount} candidate
                      {confirmedCount !== 1 ? "s" : ""} confirmed and saved
                    </li>
                    <li>{skippedCount} skipped</li>
                    {failedCount > 0 && (
                      <li>
                        {failedCount} URL{failedCount !== 1 ? "s" : ""} failed
                        to extract
                      </li>
                    )}
                  </ul>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleExtractionReset}
                    className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="flex gap-4 min-h-[520px]">
              {/* List panel */}
              <div className="w-64 flex-shrink-0 rounded-xl border border-gray-200 overflow-hidden">
                <ExtractionReviewList
                  drafts={reviewDrafts}
                  onSelectDraft={setSelectedDraftId}
                  selectedDraftId={selectedDraftId}
                />
              </div>

              {/* Modal panel */}
              <div className="flex-1 min-w-0">
                {selectedDraft ? (
                  <ExtractionReviewModal
                    draft={selectedDraft}
                    onConfirm={handleReviewConfirm}
                    onSkip={handleReviewSkip}
                    onNext={() => {
                      const nextId = reviewableIds[selectedIdx + 1];
                      if (nextId) setSelectedDraftId(nextId);
                    }}
                    onPrev={() => {
                      const prevId = reviewableIds[selectedIdx - 1];
                      if (prevId) setSelectedDraftId(prevId);
                    }}
                    hasNext={selectedIdx < reviewableIds.length - 1}
                    hasPrev={selectedIdx > 0}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 p-8">
                    <p className="text-sm text-gray-500">
                      Select a portfolio from the list to review extracted data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
