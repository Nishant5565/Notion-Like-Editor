"use client";

import * as React from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { createPortal } from "react-dom";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Mention } from "@tiptap/extension-mention";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder, Selection } from "@tiptap/extensions";
import { History } from "@tiptap/extension-history";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Mathematics } from "@tiptap/extension-mathematics";
import { UniqueID } from "@tiptap/extension-unique-id";
import { Emoji, gitHubEmojis } from "@tiptap/extension-emoji";

// --- Hooks ---
import { useUiEditorState } from "@/hooks/use-ui-editor-state";
import { useScrollToHash } from "@/components/tiptap-ui/copy-anchor-link-button/use-scroll-to-hash";
import { useEditorLocalStorage } from "@/hooks/use-editor-local-storage";

// --- Custom Extensions ---
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { UiState } from "@/components/tiptap-extension/ui-state-extension";
import { Image } from "@/components/tiptap-node/image-node/image-node-extension";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { EmojiDropdownMenu } from "@/components/tiptap-ui/emoji-dropdown-menu";
import { SlashDropdownMenu } from "@/components/tiptap-ui/slash-dropdown-menu";
import { DragContextMenu } from "@/components/tiptap-ui/drag-context-menu";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-templates/notion-like/notion-like-editor.scss";

// --- Content ---
import { NotionEditorHeader } from "@/components/tiptap-templates/notion-like/notion-like-editor-header";
import { MobileToolbar } from "@/components/tiptap-templates/notion-like/notion-like-editor-mobile-toolbar";
import { NotionToolbarFloating } from "@/components/tiptap-templates/notion-like/notion-like-editor-toolbar-floating";
import axios from "axios";

export interface NotionEditorProps {
  placeholder?: string;
  articleId: string;
}

export interface EditorProviderProps {
  placeholder?: string;
  articleId: string;
}

/**
 * EditorContent component that renders the actual editor
 */
export function EditorContentArea() {
  const { editor } = React.useContext(EditorContext)!;
  const { isDragging } = useUiEditorState(editor);

  useScrollToHash();

  if (!editor) {
    return null;
  }

  return (
    <EditorContent
      editor={editor}
      role="presentation"
      className="notion-like-editor-content"
      style={{
        cursor: isDragging ? "grabbing" : "auto",
      }}
    >
      <DragContextMenu />
      <EmojiDropdownMenu />
      <SlashDropdownMenu />
      <NotionToolbarFloating />

      {createPortal(<MobileToolbar />, document.body)}
    </EditorContent>
  );
}

/**
 * Component that creates and provides the editor instance
 */
export function EditorProvider(props: EditorProviderProps) {
  const { placeholder = "Start writing...", articleId } = props;
  const [articleDetails, setArticleDetails] = React.useState<any>(null);
  // Create extensions array
  const extensions = [
    StarterKit.configure({
      undoRedo: false, // Disable StarterKit's undo/redo, we'll add it separately
      horizontalRule: false,
      dropcursor: {
        width: 2,
      },
      link: { openOnClick: false },
    }),
    HorizontalRule,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Placeholder.configure({
      placeholder,
      emptyNodeClass: "is-empty with-slash",
    }),
    Mention,
    Emoji.configure({
      emojis: gitHubEmojis.filter((emoji) => !emoji.name.includes("regional")),
      forceFallbackImages: true,
    }),
    Mathematics,
    Superscript,
    Subscript,
    Color,
    TextStyle,
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }),
    Selection,
    Image,
    ImageUploadNode.configure({
      accept: "image/*",
      maxSize: MAX_FILE_SIZE,
      limit: 3,
      upload: (file, onProgress, abortSignal) =>
        handleImageUpload(file, articleDetails?.title, onProgress, abortSignal),
      onError: (error) => console.error("Upload failed:", error),
    }),
    UniqueID.configure({
      types: [
        "paragraph",
        "bulletList",
        "orderedList",
        "taskList",
        "heading",
        "blockquote",
        "codeBlock",
      ],
    }),
    Typography,
    UiState,
    // Add History extension for undo/redo in local-only mode
    History.configure({
      depth: 100,
    }),
  ];

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "notion-like-editor",
      },
    },
    extensions,
  });

  // Use the localStorage hook to auto-save and restore content
  const {
    savedContent,
    manualSave,
    clearContent,
    lastModified,
    title,
    isSaving,
    hasUnsavedChanges,
  } = useEditorLocalStorage(editor, articleId, {
    enabled: true, // ← This is required for server saves
    onSaveSuccess: (response) => console.log("Server saved!", response),
    onSaveError: (error) => console.log("Server error:", error),
  });
  React.useEffect(() => {
    if (!articleId || !editor) return;
    //fetch article title and set it in the editor

    const fetchArticle = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/articles/details-for-writing/${articleId}`
        );

        console.log("Fetched article:", response.data.data);
        setArticleDetails(response.data.data);
      } catch (error) {
        console.error("Failed to fetch article:", error);
      }
    };

    fetchArticle();
  }, [articleId, editor]);
  // Debug function to test manual save
  const handleManualSave = async () => {
    console.log("Manual save button clicked");
    try {
      await manualSave();
      console.log("Manual save completed");
    } catch (error) {
      console.error("Manual save failed:", error);
    }
  };
  const handleSubmitForReview = async () => {
    console.log("Submit for review clicked");
    // Implement submission logic here
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="notion-like-editor-wrapper">
      {/* Debug save button */}

      <EditorContext.Provider value={{ editor }}>
        <NotionEditorHeader
          articleId={articleId}
          lastModified={lastModified ?? ""}
          handleManualSave={handleManualSave}
          handleSubmitForReview={handleSubmitForReview}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
        />
        <div className="md:max-w-[768px] mx-auto px-6 md:px-12">
          <h2 className="text-2xl md:text-3xl font-bold font-sans mx-0 pt-6  ">
            Title : {articleDetails ? articleDetails.title : "Loading title..."}
          </h2>
          <h3 className="text-base md:text-md font-sans mx-0 pt-2 pb-4 text-gray-600  ">
            Description :{" "}
            {articleDetails
              ? articleDetails.shortDescription || "No description"
              : "Loading description..."}
          </h3>
        </div>
        <EditorContentArea />
      </EditorContext.Provider>
    </div>
  );
}

/**
 * Full editor with all necessary providers, ready to use
 */
export function NotionEditor({
  placeholder = "Start writing...",
  articleId,
}: NotionEditorProps) {
  return <EditorProvider placeholder={placeholder} articleId={articleId} />;
}
