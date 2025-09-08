import { useEffect, useCallback, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { useLocalStorage } from "./use-local-storage";
import axios from "axios";

interface EditorContent {
  content: any;
  lastModified: string;
  title?: string;
}

interface ArticleMetadata {
  id: string;
  title: string;
  content?: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // Add other fields your backend returns
}

interface ServerSaveOptions {
  enabled?: boolean; // Whether to enable auto-save to server
  baseUrl?: string; // Base URL for the backend server (default: http://localhost:3000)
  onSaveSuccess?: (response: any) => void;
  onSaveError?: (error: Error) => void;
  onFetchSuccess?: (articleData: ArticleMetadata) => void;
  onFetchError?: (error: Error) => void;
  customSaveFunction?: (content: any, articleId: string) => Promise<void>; // Optional custom save function
  customFetchFunction?: (articleId: string) => Promise<ArticleMetadata>; // Optional custom fetch function
}

export function useEditorLocalStorage(
  editor: Editor | null,
  articleId: string,
  serverSaveOptions?: ServerSaveOptions
) {
  const storageKey = `notion-editor-${articleId}`;
  const [savedContent, setSavedContent] = useLocalStorage<EditorContent | null>(
    storageKey,
    null
  );
  const lastServerSavedContent = useRef<string | null>(null);
  const isSaving = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load content when editor is ready and articleId changes
  useEffect(() => {
    if (!editor || !savedContent) return;

    try {
      // Only set content if the editor is currently empty or has default content
      const currentContent = editor.getJSON();
      const isEmpty =
        !currentContent.content ||
        currentContent.content.length === 0 ||
        (currentContent.content.length === 1 &&
          currentContent.content[0].type === "paragraph" &&
          (!currentContent.content[0].content ||
            currentContent.content[0].content.length === 0));

      if (isEmpty) {
        // Set the content from localStorage
        editor.commands.setContent(savedContent.content);
        console.log(`Loaded content for article: ${articleId}`);
      }
    } catch (error) {
      console.error("Error loading content from localStorage:", error);
    }
  }, [editor, savedContent, articleId]);

  // Built-in server save function using axios
  const defaultServerSave = useCallback(
    async (content: any, articleId: string) => {
      const baseUrl = serverSaveOptions?.baseUrl || "http://localhost:5000";
      const response = await axios.post(
        `${baseUrl}/api/articles/save-draft/${articleId}`,
        {
          articleId,
          content,
          title: getDocumentTitle(content),
        }
      );
      return response.data;
    },
    [serverSaveOptions?.baseUrl]
  );

  // Save content to server
  const saveToServer = useCallback(async () => {
    console.log("Attempting to save to server...");
    if (!editor || !serverSaveOptions?.enabled || isSaving.current) return;
    console.log("Passed initial checks for server save.");
    try {
      const content = editor.getJSON();
      const contentString = JSON.stringify(content);

      // Only save if content has actually changed since last server save
      if (contentString === lastServerSavedContent.current) return;

      isSaving.current = true;

      // Use custom save function if provided, otherwise use built-in axios function
      const saveFunction =
        serverSaveOptions.customSaveFunction || defaultServerSave;
      const response = await saveFunction(content, articleId);

      lastServerSavedContent.current = contentString;
      setHasUnsavedChanges(false); // Reset unsaved changes flag after successful save
      serverSaveOptions.onSaveSuccess?.(response);
      console.log(`Content saved to server for article: ${articleId}`);
    } catch (error) {
      console.error("Error saving content to server:", error);
      serverSaveOptions.onSaveError?.(error as Error);
    } finally {
      isSaving.current = false;
    }
  }, [editor, serverSaveOptions, articleId, defaultServerSave]);

  // Save content to localStorage
  const saveContent = useCallback(() => {
    if (!editor) return;

    try {
      const content = editor.getJSON();
      const contentData: EditorContent = {
        content,
        lastModified: new Date().toISOString(),
        title: getDocumentTitle(content),
      };

      setSavedContent(contentData);
      console.log(`Content saved for article: ${articleId}`);
    } catch (error) {
      console.error("Error saving content to localStorage:", error);
    }
  }, [editor, setSavedContent, articleId]);

  // Auto-save functionality with debouncing
  useEffect(() => {
    console.log(
      "Setting up auto-save effect, editor:",
      !!editor
    );
    if (!editor) return;

    let localSaveTimeoutId: NodeJS.Timeout;
    let serverSaveTimeoutId: NodeJS.Timeout;

    const handleUpdate = () => {
      console.log("Editor update detected");
      // Mark content as having unsaved changes
      setHasUnsavedChanges(true);
      
      // Clear existing timeouts
      clearTimeout(localSaveTimeoutId);
      clearTimeout(serverSaveTimeoutId);

      // Debounce local storage save (1 second)
      localSaveTimeoutId = setTimeout(() => {
        console.log("Executing local save");
        saveContent();
      }, 1000);

      // Debounce server save (30 seconds)
      if (serverSaveOptions?.enabled) {
        console.log("Setting up server save timeout (30s)");
        serverSaveTimeoutId = setTimeout(() => {
          console.log("Executing server save from timeout");
          saveToServer();
        }, 30000); // Back to 30 seconds
      } else {
        console.log(
          "Server save disabled, serverSaveOptions.enabled:",
          serverSaveOptions?.enabled
        );
      }
    };

    // Listen to editor updates
    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      clearTimeout(localSaveTimeoutId);
      clearTimeout(serverSaveTimeoutId);
    };
  }, [editor]); // ← Only depend on editor, not the functions

  // Manual save function (saves both locally and to server immediately)
  const manualSave = useCallback(async () => {
    saveContent();
    if (serverSaveOptions?.enabled) {
      await saveToServer();
    }
  }, [saveContent, saveToServer, serverSaveOptions]);

  // Clear content function
  const clearContent = useCallback(() => {
    setSavedContent(null);
    if (editor) {
      editor.commands.clearContent();
    }
    console.log(`Content cleared for article: ${articleId}`);
  }, [editor, setSavedContent, articleId]);

  return {
    savedContent,
    manualSave,
    clearContent,
    saveToServer,
    isSaving: isSaving.current,
    hasUnsavedChanges,
    lastModified: savedContent?.lastModified,
    title: savedContent?.title,
  };
}

// Helper function to extract title from content
function getDocumentTitle(content: any): string {
  if (!content || !content.content) return "Untitled";

  // Look for the first heading or paragraph with text
  for (const node of content.content) {
    if (node.type === "heading" && node.content?.[0]?.text) {
      return node.content[0].text;
    }
    if (node.type === "paragraph" && node.content?.[0]?.text) {
      return (
        node.content[0].text.substring(0, 50) +
        (node.content[0].text.length > 50 ? "..." : "")
      );
    }
  }

  return "Untitled";
}
