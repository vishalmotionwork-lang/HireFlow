"use client";

import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { parseExcelFile } from "@/lib/import/parseExcel";
import { parseCsvFile, parseCsvString } from "@/lib/import/parseCsv";
import type { ParseResult } from "@/lib/import/types";

interface Step1UploadProps {
  onParsed: (result: ParseResult) => void;
}

type ActiveTab = "file" | "paste";

export function Step1Upload({ onParsed }: Step1UploadProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("file");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedFile, setParsedFile] = useState<{ name: string; rowCount: number } | null>(null);
  const [pasteText, setPasteText] = useState("");

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
          result = await parseExcelFile(file);
        } else if (ext === "csv") {
          result = await parseCsvFile(file);
        } else {
          toast.error("Unsupported file type. Please upload .xlsx, .xls, or .csv");
          setIsLoading(false);
          return;
        }

        if (result.headers.length === 0 || result.rows.length === 0) {
          toast.error("The file appears to be empty or has no data rows.");
          setIsLoading(false);
          return;
        }

        setParsedFile({ name: file.name, rowCount: result.rows.length });
        onParsed(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse file";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onParsed]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
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
        toast.error("Could not parse the pasted data. Make sure it has a header row.");
        return;
      }

      onParsed(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse pasted data";
      toast.error(message);
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
                  <p className="text-sm font-medium text-gray-900">{parsedFile.name}</p>
                  <p className="text-xs text-gray-500">{parsedFile.rowCount} rows detected</p>
                </div>
                <p className="text-xs text-gray-400">Drop another file to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Upload size={20} className="text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {isDragActive ? "Drop your file here" : "Drag & drop or click to browse"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Accepts .xlsx, .xls, .csv</p>
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
            Copy cells from any spreadsheet and paste below. The first row should be the header row.
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
    </div>
  );
}
