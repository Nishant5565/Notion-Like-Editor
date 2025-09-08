"use client";

// --- Tiptap UI ---
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- UI Primitives ---
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
import { ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { IoIosSave } from "react-icons/io";

// --- Styles ---
import "@/components/tiptap-templates/notion-like/notion-like-editor-header.scss";

interface NotionEditorHeaderProps {
  articleId: string;
  lastModified: string;
  handleManualSave: () => void;
  handleSubmitForReview: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
}

export function NotionEditorHeader({
  articleId,
  lastModified,
  handleManualSave,
  handleSubmitForReview,
  isSaving = false,
  hasUnsavedChanges = false,
}: NotionEditorHeaderProps) {
  const isDisabled = isSaving || !hasUnsavedChanges;
  
  return (
    <header className="notion-like-editor-header flex justify-between items-center">
      <div className="flex items-center gap-8">
        <button
          onClick={handleManualSave}
          disabled={isDisabled}
          className={`text-[13px] px-4 py-2 rounded flex items-center gap-2 transition-colors ${
            isDisabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white cursor-pointer hover:bg-blue-600"
          }`}
        >
          {isSaving ? "Saving..." : "Save Draft"} <IoIosSave size={18} />
        </button>
        <span style={{ marginLeft: "10px", fontSize: "12px" }}>
          Last saved:{" "}
          {Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(lastModified)) || "Never"}
        </span>
      </div>
      <div className="notion-like-editor-header-actions">
        <ButtonGroup orientation="horizontal">
          <UndoRedoButton action="undo" />
          <UndoRedoButton action="redo" />
        </ButtonGroup>

        <Separator />

        <Separator />
      </div>
    </header>
  );
}
