"use client";

import { useState, type ReactNode } from "react";
import { Upload, Clock } from "lucide-react";

type PageTab = "import" | "history";

interface ImportPageTabsProps {
  importWizard: ReactNode;
  importHistory: ReactNode;
}

export function ImportPageTabs({
  importWizard,
  importHistory,
}: ImportPageTabsProps) {
  const [activeTab, setActiveTab] = useState<PageTab>("import");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("import")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "import"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Upload size={14} />
          Import
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "history"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Clock size={14} />
          History
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "import" && importWizard}
      {activeTab === "history" && importHistory}
    </div>
  );
}
