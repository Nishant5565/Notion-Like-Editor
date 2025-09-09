import axiosInstance from "@/config/axiosInstance";
import { useEffect } from "react";

/**
 * Handles the deletion of an image from the server
 * @param imageUrl - The URL of the image to delete
 * @param articleId - The ID of the article the image belongs to
 * @param onSuccess - Optional callback to run after successful deletion
 * @param onError - Optional callback to run on error
 */
export const handleImageDeletion = async (
  imageUrl: string,
  articleId: string,
  onSuccess?: () => Promise<void>,
  onError?: (error: any) => void
) => {
  console.log("Image deleted:", imageUrl);

  try {
    await axiosInstance.delete(`upload/article-image`, {
      data: {
        imageUrl: imageUrl,
        articleId: articleId,
      },
    });

    console.log("Image successfully deleted from server");

    // Call success callback if provided
    if (onSuccess) {
      await onSuccess();
    }
  } catch (error) {
    console.error("Failed to delete image from server:", error);

    // Call error callback if provided
    if (onError) {
      onError(error);
    }
  }
};

/**
 * Creates a hook for monitoring image deletions in the editor
 * @param editor - The Tiptap editor instance
 * @param articleId - The ID of the article
 * @param onImageDelete - Callback function to handle image deletion
 */
export const useImageDeletionMonitor = (
  editor: any,
  articleId: string,
  onImageDelete: (imageUrl: string) => Promise<void>
) => {
  useEffect(() => {
    if (!editor) return;

    let previousImages: string[] = [];

    // Get images from the document
    const getImagesFromDoc = () => {
      const images: string[] = [];
      editor.state.doc.descendants((node: any) => {
        if (node.type.name === "image" || node.type.name === "imageUpload") {
          const src = node.attrs.src;
          if (src) {
            images.push(src);
          }
        }
      });
      return images;
    };

    // Initialize previous images
    previousImages = getImagesFromDoc();

    // Listen for document changes
    const handleUpdate = () => {
      const currentImages = getImagesFromDoc();

      // Find deleted images
      const deletedImages = previousImages.filter(
        (img) => !currentImages.includes(img)
      );

      // Handle each deleted image
      deletedImages.forEach((imageUrl) => {
        onImageDelete(imageUrl);
      });

      // Update previous images
      previousImages = currentImages;
    };

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, articleId, onImageDelete]);
};
