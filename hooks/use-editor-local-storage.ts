import { useEffect, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { useLocalStorage } from './use-local-storage'

interface EditorContent {
  content: any
  lastModified: string
  title?: string
}

export function useEditorLocalStorage(editor: Editor | null, articleId: string) {
  const storageKey = `notion-editor-${articleId}`
  const [savedContent, setSavedContent] = useLocalStorage<EditorContent | null>(storageKey, null)

  // Load content when editor is ready and articleId changes
  useEffect(() => {
    if (!editor || !savedContent) return

    try {
      // Only set content if the editor is currently empty or has default content
      const currentContent = editor.getJSON()
      const isEmpty = !currentContent.content || 
                     currentContent.content.length === 0 || 
                     (currentContent.content.length === 1 && 
                      currentContent.content[0].type === 'paragraph' && 
                      (!currentContent.content[0].content || currentContent.content[0].content.length === 0))
      
      if (isEmpty) {
        // Set the content from localStorage
        editor.commands.setContent(savedContent.content)
        console.log(`Loaded content for article: ${articleId}`)
      }
    } catch (error) {
      console.error('Error loading content from localStorage:', error)
    }
  }, [editor, savedContent, articleId])

  // Save content to localStorage
  const saveContent = useCallback(() => {
    if (!editor) return

    try {
      const content = editor.getJSON()
      const contentData: EditorContent = {
        content,
        lastModified: new Date().toISOString(),
        title: getDocumentTitle(content)
      }
      
      setSavedContent(contentData)
      console.log(`Content saved for article: ${articleId}`)
    } catch (error) {
      console.error('Error saving content to localStorage:', error)
    }
  }, [editor, setSavedContent, articleId])

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (!editor) return

    let timeoutId: NodeJS.Timeout

    const handleUpdate = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        saveContent()
      }, 1000) // Debounce for 1 second
    }

    // Listen to editor updates
    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      clearTimeout(timeoutId)
    }
  }, [editor, saveContent])

  // Manual save function
  const manualSave = useCallback(() => {
    saveContent()
  }, [saveContent])

  // Clear content function
  const clearContent = useCallback(() => {
    setSavedContent(null)
    if (editor) {
      editor.commands.clearContent()
    }
    console.log(`Content cleared for article: ${articleId}`)
  }, [editor, setSavedContent, articleId])

  return {
    savedContent,
    manualSave,
    clearContent,
    lastModified: savedContent?.lastModified,
    title: savedContent?.title
  }
}

// Helper function to extract title from content
function getDocumentTitle(content: any): string {
  if (!content || !content.content) return 'Untitled'
  
  // Look for the first heading or paragraph with text
  for (const node of content.content) {
    if (node.type === 'heading' && node.content?.[0]?.text) {
      return node.content[0].text
    }
    if (node.type === 'paragraph' && node.content?.[0]?.text) {
      return node.content[0].text.substring(0, 50) + (node.content[0].text.length > 50 ? '...' : '')
    }
  }
  
  return 'Untitled'
}
