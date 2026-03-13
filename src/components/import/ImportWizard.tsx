"use client";

import { useReducer, useEffect } from "react";
import { Step1Upload } from "@/components/import/Step1Upload";
import { Step2Mapping } from "@/components/import/Step2Mapping";
import type {
  ParseResult,
  RawRow,
  ColumnMapping,
  ValidatedRow,
  DuplicateInfo,
  ImportResult,
} from "@/lib/import/types";
import type { Role } from "@/types";

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
  validatedRows: [],
  duplicateInfo: {},
  result: null,
};

// ---------------------------------------------------------------------------
// Reducer actions
// ---------------------------------------------------------------------------

type WizardAction =
  | { type: "FILE_PARSED"; payload: ParseResult }
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
                  isCurrent ? "text-blue-600" : isDone ? "text-gray-600" : "text-gray-400"
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
  // Restore state from sessionStorage on mount
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

  const handleParsed = (result: ParseResult) => {
    dispatch({ type: "FILE_PARSED", payload: result });
  };

  const handleMappingConfirmed = (mapping: ColumnMapping, targetRoleId: string) => {
    dispatch({ type: "MAPPING_CONFIRMED", payload: { mapping, targetRoleId } });
  };

  const handleBack = () => {
    dispatch({ type: "BACK" });
  };

  const handleReset = () => {
    clearSessionState();
    dispatch({ type: "RESET" });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
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
        <div className="py-12 text-center text-gray-400">
          <p className="text-sm">Step 3 — Validate coming in Plan 04</p>
          <button
            onClick={handleBack}
            className="mt-4 text-sm text-blue-500 hover:underline"
          >
            Go back
          </button>
        </div>
      )}

      {state.step === "summary" && (
        <div className="py-12 text-center text-gray-400">
          <p className="text-sm">Step 4 — Summary coming in Plan 04</p>
          <button
            onClick={handleReset}
            className="mt-4 text-sm text-blue-500 hover:underline"
          >
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
