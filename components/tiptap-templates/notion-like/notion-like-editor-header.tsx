"use client";

// --- Tiptap UI ---
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- UI Primitives ---
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import { Separator } from "@/components/tiptap-ui-primitive/separator";
import { ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { IoIosSave, IoIosSend } from "react-icons/io";

// --- Styles ---
import "@/components/tiptap-templates/notion-like/notion-like-editor-header.scss";
import axiosInstance from "@/config/axiosInstance";

interface NotionEditorHeaderProps {
  articleId: string;
  lastModified: string;
  handleManualSave: () => void;
  handleSubmitForReview: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  isSubmittingForReview?: boolean;
}

export function NotionEditorHeader({
  articleId,
  lastModified,
  handleManualSave,
  handleSubmitForReview,
  isSaving = false,
  hasUnsavedChanges = false,
  isSubmittingForReview = false,
}: NotionEditorHeaderProps) {
  const isDisabled = isSaving || !hasUnsavedChanges;

  return (
    <header className="notion-like-editor-header flex justify-between items-center relative">
      <div className="flex flex-col md:flex-row items-start md:items-center md:gap-8">
        <div className=" flex gap-2">
          <button
            onClick={handleManualSave}
            disabled={isDisabled}
            className={`text-xs md:text-[13px] px-4 py-2 rounded flex items-center gap-2 transition-colors ${
              isDisabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white cursor-pointer hover:bg-blue-600"
            }`}
          >
            {isSaving ? "Saving..." : "Save Draft"}{" "}
            <IoIosSave className="text-sm md:text-[18px]" />
          </button>
          <button
            onClick={handleSubmitForReview}
            className={`text-xs md:text-[13px] px-4 py-2 rounded flex items-center gap-2 transition-colors bg-green-500 text-white cursor-pointer hover:bg-green-600`}
            disabled={isSubmittingForReview}
          >
            {isSubmittingForReview ? "Submitting..." : "Submit"}
            <IoIosSend className="text-sm md:text-[18px]" />
          </button>
        </div>
        <div className="text-[10px] md:text-[13px] text-gray-600 mt-1 md:mt-0">
          Last saved:{" "}
          {(lastModified &&
            Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(lastModified))) ||
            "Never"}
        </div>
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
