"use client";

import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { parseExcelFile } from "@/lib/import/parseExcel";
import { parseCsvFile, parseCsvString } from "@/lib/import/parseCsv";
import {
  parseExcelMultiSheet,
  isMultiSheetExcel,
} from "@/lib/import/parseExcelMultiSheet";
import { importFromUrl } from "@/lib/actions/importFromUrl";
import type { SheetData } from "@/lib/import/parseExcelMultiSheet";
import type { ParseResult } from "@/lib/import/types";

interface Step1UploadProps {
  onParsed: (result: ParseResult, source: "excel" | "csv" | "paste") => void;
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
  const [isLinkLoading, setIsLinkLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // File drop handler
  // ---------------------------------------------------------------------------

  const handleFileDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsLoading(true);
      setParsedFile(null);

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
        setParsedFile({ name: file.name, rowCount: result.rows.length });
        onParsed(result, source);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to parse file";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onParsed],
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

  const handlePaste = () => {
    if (!pasteText.trim()) {
      toast.error("Please paste some data first.");
      return;
    }

    try {
      const result = parseCsvString(pasteText);

      if (result.headers.length === 0 || result.rows.length === 0) {
        toast.error(
          "Could not parse the pasted data. Make sure it has a header row.",
        );
        return;
      }

      onParsed(result, "paste");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse pasted data";
      toast.error(message);
    }
  };

  // ---------------------------------------------------------------------------
  // Link import handler
  // ---------------------------------------------------------------------------

  const handleLinkImport = async () => {
    const url = linkUrl.trim();
    if (!url) {
      toast.error("Please enter a spreadsheet URL.");
      return;
    }

    setIsLinkLoading(true);

    try {
      const result = await importFromUrl(url);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onParsed(result.data, result.source);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to import from URL";
      toast.error(message);
    } finally {
      setIsLinkLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
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

      {/* Link tab */}
      {activeTab === "link" && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Paste a Google Sheets link (must be public) or a direct .csv / .xlsx
            file URL. The data will be imported into the same mapping flow.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Spreadsheet URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Link2 size={14} className="text-gray-400" />
                </div>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkUrl.trim() && !isLinkLoading) {
                      handleLinkImport();
                    }
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={isLinkLoading}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleLinkImport}
                disabled={isLinkLoading || !linkUrl.trim()}
                className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {isLinkLoading && (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {isLinkLoading ? "Fetching..." : "Import"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-gray-600">Supported URLs</p>
            <ul className="text-xs text-gray-500 space-y-0.5 list-disc pl-4">
              <li>Google Sheets (public): paste the share link directly</li>
              <li>Direct links to .csv or .xlsx files</li>
            </ul>
            <p className="text-xs text-gray-400 mt-1">
              For Google Sheets, make sure sharing is set to &quot;Anyone with
              the link&quot; &gt; Viewer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
