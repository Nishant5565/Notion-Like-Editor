import { useEffect, useCallback, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { useLocalStorage } from "./use-local-storage";
import axios from "axios";
import axiosInstance from "@/config/axiosInstance";
import API_URL from "@/config/API_URL";

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
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentLoadError, setContentLoadError] = useState<string | null>(null);
  const hasInitiallyLoaded = useRef(false);

  // Built-in server fetch function
  const fetchDraftFromServer = async (
    articleId: string
  ): Promise<ArticleMetadata> => {
    const response = await axiosInstance.get(
      `article-draft/get-draft/${articleId}`
    );
    return response.data.data;
  };

  // Function to validate JSON content
  const isValidContent = (content: any): boolean => {
    try {
      if (!content) return false;

      // Check if it's a valid TipTap JSON structure
      if (typeof content !== "object" || !content.type) {
        return false;
      }
      // Basic validation for TipTap document structure
      return content.type === "doc" || content.content !== undefined;
    } catch (error) {
      console.error("Content validation error:", error);
      return false;
    }
  };

  // Function to compare dates and determine which content is more recent
  const getMostRecentContent = (
    localContent: EditorContent | null,
    serverData: ArticleMetadata | null
  ): { source: "local" | "server" | "none"; content: EditorContent | null } => {
    // If no server data, use local if valid
    if (!serverData || !serverData.content) {
      if (localContent && isValidContent(localContent.content)) {
        return { source: "local", content: localContent };
      }
      return { source: "none", content: null };
    }

    // If no local content or invalid local content, use server
    if (!localContent || !isValidContent(localContent.content)) {
      const serverContent: EditorContent = {
        content: serverData.content,
        lastModified: serverData.updatedAt,
        title: serverData.title,
      };
      return { source: "server", content: serverContent };
    }

    // Both exist and are valid, compare dates
    const localDate = new Date(localContent.lastModified);
    const serverDate = new Date(serverData.updatedAt);

    if (serverDate > localDate) {
      const serverContent: EditorContent = {
        content: serverData.content,
        lastModified: serverData.updatedAt,
        title: serverData.title,
      };
      return { source: "server", content: serverContent };
    } else {
      return { source: "local", content: localContent };
    }
  };

  // Initial content loading effect
  useEffect(() => {
    if (!editor || hasInitiallyLoaded.current || !articleId) return;

    const loadInitialContent = async () => {
      setIsLoadingContent(true);
      setContentLoadError(null);
      hasInitiallyLoaded.current = true;

      try {
        let serverData: ArticleMetadata | null = null;

        // Try to fetch from server if enabled
        if (serverSaveOptions?.enabled) {
          try {
            const fetchFunction =
              serverSaveOptions.customFetchFunction || fetchDraftFromServer;
            serverData = await fetchFunction(articleId);
            serverSaveOptions.onFetchSuccess?.(serverData);
            console.log("Fetched content from server:", serverData.content);
          } catch (serverError) {
            console.warn("Failed to fetch from server:", serverError);
            serverSaveOptions.onFetchError?.(serverError as Error);
          }
        }

        // Get the most recent content
        const { source, content } = getMostRecentContent(
          savedContent,
          serverData
        );

        console.log(`Using content from: ${source}`);

        if (content) {
          // If using server content, save it to local storage
          if (source === "server") {
            setSavedContent(content);
            console.log("Saved server content to local storage");
          }

          // Set content in editor
          editor.commands.setContent(content.content);
          lastServerSavedContent.current = JSON.stringify(content.content);
          console.log(
            `Loaded content for article: ${articleId} from ${source}`
          );
        } else {
          // No valid content found, start with empty document
          console.log("No valid content found, starting with empty document");
          editor.commands.clearContent();
        }

        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error during initial content loading:", error);
        setContentLoadError(
          error instanceof Error ? error.message : "Unknown error"
        );

        // Fallback to empty document
        editor.commands.clearContent();
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadInitialContent();
  }, [editor, articleId, serverSaveOptions?.enabled]);

  // Built-in server save function using axios
  const defaultServerSave = useCallback(
    async (content: any, articleId: string) => {
      const baseUrl = API_URL;
      const response = await axiosInstance.post(
        `article-draft/save-draft/${articleId}`,
        {
          articleId,
          content,
        }
      );
      console.log("Server save response:", response.data);
      return response.data.status;
    },
    [serverSaveOptions?.baseUrl]
  );

  // Save content to server
  const saveToServer = useCallback(async () => {
    if (!editor || !serverSaveOptions?.enabled || isSaving.current) return;
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

      // Validate content before saving
      if (!isValidContent(content)) {
        console.warn(
          "Attempting to save invalid content, skipping localStorage save"
        );
        return;
      }

      const contentData: EditorContent = {
        content,
        lastModified: new Date().toISOString(),
      };

      setSavedContent(contentData);
    } catch (error) {
      console.error("Error saving content to localStorage:", error);
    }
  }, [editor, setSavedContent]);

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (!editor || !hasInitiallyLoaded.current) return;

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
        saveContent();
      }, 1000);

      // Debounce server save (10 seconds)
      if (serverSaveOptions?.enabled) {
        serverSaveTimeoutId = setTimeout(() => {
          saveToServer();
        }, 10000);
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
  }, [editor, hasInitiallyLoaded.current]);

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
    lastServerSavedContent.current = null;
    setHasUnsavedChanges(false);
    console.log(`Content cleared for article: ${articleId}`);
  }, [editor, setSavedContent, articleId]);

  // Submit function for final submission
  const submitContent = useCallback(
    async (comment?: string) => {
      if (!editor) {
        throw new Error("Editor not available");
      }

      try {
        const jsonContent = editor.getJSON();
        const htmlContent = editor.getHTML();

        // Validate content before submitting
        if (!isValidContent(jsonContent)) {
          throw new Error("Invalid content cannot be submitted");
        }

        console.log("Submitting content:", { jsonContent, htmlContent });

        // Use axios to submit the content
        const response = await axiosInstance.post(
          `articles/commit-article/${articleId}`,
          {
            articleId,
            contentJSON: jsonContent,
            contentHTML: htmlContent,
            comments: comment || "",
          }
        );

        console.log("Content submitted successfully:", response.data);

        // Update last server saved content after successful submission
        lastServerSavedContent.current = JSON.stringify(jsonContent);
        setHasUnsavedChanges(false);

        return response.data;
      } catch (error) {
        console.error("Error submitting content:", error);
        throw error;
      }
    },
    [editor, articleId]
  );

  return {
    savedContent,
    manualSave,
    clearContent,
    saveToServer,
    submitContent, // Add this new function
    isSaving: isSaving.current,
    hasUnsavedChanges,
    isLoadingContent,
    contentLoadError,
    lastModified: savedContent?.lastModified,
    title: savedContent?.title,
  };
}
