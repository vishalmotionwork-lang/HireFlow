"use client";

import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { parseExcelFile } from "@/lib/import/parseExcel";
import { parseCsvFile, parseCsvString } from "@/lib/import/parseCsv";
import {
  parseExcelMultiSheet,
  isMultiSheetExcel,
} from "@/lib/import/parseExcelMultiSheet";
import { hashFile, hashContent } from "@/lib/import/hashSource";
import {
  checkDuplicateSheet,
  type DuplicateSheetMatch,
} from "@/lib/actions/importHistory";
import type { ImportSourceInfo } from "@/lib/actions/import";
import type { SheetData } from "@/lib/import/parseExcelMultiSheet";
import { importFromUrl } from "@/lib/actions/importFromUrl";
import type { ParseResult } from "@/lib/import/types";

interface Step1UploadProps {
  onParsed: (
    result: ParseResult,
    source: "excel" | "csv" | "paste",
    sourceInfo?: ImportSourceInfo,
  ) => void;
  onMultiSheetParsed?: (sheets: SheetData[]) => void;
}

type ActiveTab = "file" | "paste" | "link";

export function Step1Upload({
  onParsed,
  onMultiSheetParsed,
}: Step1UploadProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("file");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedFile, setParsedFile] = useState<{
    name: string;
    rowCount: number;
  } | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  // Duplicate sheet detection
  const [duplicateWarning, setDuplicateWarning] =
    useState<DuplicateSheetMatch | null>(null);
  const [pendingParse, setPendingParse] = useState<{
    result: ParseResult;
    source: "excel" | "csv" | "paste";
    sourceInfo: ImportSourceInfo;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // File drop handler
  // ---------------------------------------------------------------------------

  const handleFileDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsLoading(true);
      setParsedFile(null);
      setDuplicateWarning(null);
      setPendingParse(null);

      try {
        let result: ParseResult;
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

        if (ext === "xlsx" || ext === "xls") {
          // Check for multi-sheet workbook (one sheet per role)
          const isMulti = await isMultiSheetExcel(file);
          if (isMulti && onMultiSheetParsed) {
            const multiResult = await parseExcelMultiSheet(file);
            if (multiResult.sheets.length > 0) {
              const totalRows = multiResult.sheets.reduce(
                (sum, s) => sum + s.rows.length,
                0,
              );
              setParsedFile({
                name: file.name,
                rowCount: totalRows,
              });
              onMultiSheetParsed(multiResult.sheets);
              setIsLoading(false);
              return;
            }
          }
          result = await parseExcelFile(file);
        } else if (ext === "csv") {
          result = await parseCsvFile(file);
        } else {
          toast.error(
            "Unsupported file type. Please upload .xlsx, .xls, or .csv",
          );
          setIsLoading(false);
          return;
        }

        if (result.headers.length === 0 || result.rows.length === 0) {
          toast.error("The file appears to be empty or has no data rows.");
          setIsLoading(false);
          return;
        }

        const source: "excel" | "csv" =
          ext === "xlsx" || ext === "xls" ? "excel" : "csv";

        // Compute hash for duplicate detection
        const fileHash = await hashFile(file);
        const sourceInfo: ImportSourceInfo = {
          sourceName: file.name,
          sourceUrl: file.name,
          sourceHash: fileHash,
        };

        // Check for duplicate sheet
        const duplicate = await checkDuplicateSheet(fileHash);

        setParsedFile({ name: file.name, rowCount: result.rows.length });

        if (duplicate) {
          // Show warning, stash the parsed result
          setDuplicateWarning(duplicate);
          setPendingParse({ result, source, sourceInfo });
        } else {
          onParsed(result, source, sourceInfo);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to parse file";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onParsed, onMultiSheetParsed],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
      "text/plain": [".csv"],
    },
    multiple: false,
    disabled: isLoading,
  });

  // ---------------------------------------------------------------------------
  // Paste handler
  // ---------------------------------------------------------------------------

  const handlePaste = async () => {
    if (!pasteText.trim()) {
      toast.error("Please paste some data first.");
      return;
    }

    setDuplicateWarning(null);
    setPendingParse(null);

    try {
      const result = parseCsvString(pasteText);

      if (result.headers.length === 0 || result.rows.length === 0) {
        toast.error(
          "Could not parse the pasted data. Make sure it has a header row.",
        );
        return;
      }

      // Compute hash of pasted content for dedup
      const pasteHash = await hashContent(pasteText.trim());
      const sourceInfo: ImportSourceInfo = {
        sourceName: "Pasted data",
        sourceHash: pasteHash,
      };

      const duplicate = await checkDuplicateSheet(pasteHash);

      if (duplicate) {
        setDuplicateWarning(duplicate);
        setPendingParse({ result, source: "paste", sourceInfo });
      } else {
        onParsed(result, "paste", sourceInfo);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse pasted data";
      toast.error(message);
    }
  };

  const handleDuplicateProceed = () => {
    if (!pendingParse) return;
    const { result, source, sourceInfo } = pendingParse;
    setDuplicateWarning(null);
    setPendingParse(null);
    onParsed(result, source, sourceInfo);
  };

  const handleDuplicateCancel = () => {
    setDuplicateWarning(null);
    setPendingParse(null);
    setParsedFile(null);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Duplicate sheet warning banner */}
      {duplicateWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="text-amber-500 mt-0.5 flex-shrink-0"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                This sheet was already imported
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Imported on{" "}
                {new Date(duplicateWarning.createdAt).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )}
                {" — "}
                {duplicateWarning.importedCount} candidate
                {duplicateWarning.importedCount !== 1 ? "s" : ""} were added.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleDuplicateProceed}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  Import Anyway
                </button>
                <button
                  onClick={handleDuplicateCancel}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("file")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "file"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "paste"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Paste Data
        </button>
        <button
          onClick={() => setActiveTab("link")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "link"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Paste Link
        </button>
      </div>

      {/* File upload tab */}
      {activeTab === "file" && (
        <div className="space-y-3">
          <div
            {...getRootProps()}
            className={`relative rounded-lg border-2 border-dashed px-8 py-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : isLoading
                  ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                  : "border-gray-300 bg-gray-50/50 hover:border-blue-400 hover:bg-blue-50/30"
            }`}
          >
            <input {...getInputProps()} />

            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <p className="text-sm text-gray-500">Parsing file...</p>
              </div>
            ) : parsedFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <FileText size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {parsedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {parsedFile.rowCount} rows detected
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Drop another file to replace
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Upload size={20} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {isDragActive
                      ? "Drop your file here"
                      : "Drag & drop or click to browse"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Accepts .xlsx, .xls, .csv
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Paste tab */}
      {activeTab === "paste" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Copy cells from any spreadsheet and paste below. The first row
            should be the header row.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste spreadsheet data here..."
            rows={8}
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 resize-y"
          />
          <div className="flex justify-end">
            <button
              onClick={handlePaste}
              disabled={!pasteText.trim()}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Parse Data
            </button>
          </div>
        </div>
      )}

      {/* Paste Link tab */}
      {activeTab === "link" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Paste a public Google Sheet URL or a direct link to a .csv / .xlsx
            file. The sheet must be shared as &ldquo;Anyone with the
            link&rdquo;.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                setLinkError("");
              }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              onClick={async () => {
                if (!linkUrl.trim()) {
                  setLinkError("Please paste a URL first.");
                  return;
                }
                setIsLoading(true);
                setLinkError("");
                setDuplicateWarning(null);
                setPendingParse(null);
                try {
                  const res = await importFromUrl(linkUrl.trim());
                  if (!res.success) {
                    setLinkError(res.error);
                    return;
                  }
                  const sourceInfo: ImportSourceInfo = {
                    sourceName: res.source ?? linkUrl.trim(),
                    sourceUrl: linkUrl.trim(),
                    sourceHash: await hashContent(linkUrl.trim()),
                  };
                  const duplicate = await checkDuplicateSheet(
                    sourceInfo.sourceHash!,
                  );
                  if (duplicate) {
                    setDuplicateWarning(duplicate);
                    setPendingParse({
                      result: res.data!,
                      source: "csv",
                      sourceInfo,
                    });
                  } else {
                    onParsed(res.data!, "csv", sourceInfo);
                  }
                } catch {
                  setLinkError("Failed to fetch the sheet. Please try again.");
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading || !linkUrl.trim()}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Fetching..." : "Import"}
            </button>
          </div>
          {linkError && <p className="text-sm text-red-600">{linkError}</p>}
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600">Supported formats:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Google Sheets (must be public)</li>
              <li>Direct .csv or .xlsx file URLs</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
