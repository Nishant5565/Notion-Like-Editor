"use client"

import * as React from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import { createPortal } from "react-dom"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Mention } from "@tiptap/extension-mention"
import { TaskList, TaskItem } from "@tiptap/extension-list"
import { Color, TextStyle } from "@tiptap/extension-text-style"
import { Placeholder, Selection } from "@tiptap/extensions"
import { History } from "@tiptap/extension-history"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Superscript } from "@tiptap/extension-superscript"
import { Subscript } from "@tiptap/extension-subscript"
import { TextAlign } from "@tiptap/extension-text-align"
import { Mathematics } from "@tiptap/extension-mathematics"
import { UniqueID } from "@tiptap/extension-unique-id"
import { Emoji, gitHubEmojis } from "@tiptap/extension-emoji"

// --- Hooks ---
import { useUiEditorState } from "@/hooks/use-ui-editor-state"
import { useScrollToHash } from "@/components/tiptap-ui/copy-anchor-link-button/use-scroll-to-hash"

// --- Custom Extensions ---
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import { UiState } from "@/components/tiptap-extension/ui-state-extension"
import { Image } from "@/components/tiptap-node/image-node/image-node-extension"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { EmojiDropdownMenu } from "@/components/tiptap-ui/emoji-dropdown-menu"
import { MentionDropdownMenu } from "@/components/tiptap-ui/mention-dropdown-menu"
import { SlashDropdownMenu } from "@/components/tiptap-ui/slash-dropdown-menu"
import { DragContextMenu } from "@/components/tiptap-ui/drag-context-menu"

// --- Contexts ---
import { AppProvider } from "@/contexts/app-context"
import { UserProvider, useUser } from "@/contexts/user-context"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-templates/notion-like/notion-like-editor.scss"

// --- Content ---
import { NotionEditorHeader } from "@/components/tiptap-templates/notion-like/notion-like-editor-header"
import { MobileToolbar } from "@/components/tiptap-templates/notion-like/notion-like-editor-mobile-toolbar"
import { NotionToolbarFloating } from "@/components/tiptap-templates/notion-like/notion-like-editor-toolbar-floating"

export interface NotionEditorProps {
  placeholder?: string
}

export interface EditorProviderProps {
  placeholder?: string
}

/**
 * EditorContent component that renders the actual editor
 */
export function EditorContentArea() {
  const { editor } = React.useContext(EditorContext)!
  const {
    isDragging,
  } = useUiEditorState(editor)

  useScrollToHash()

  if (!editor) {
    return null
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
      <MentionDropdownMenu />
      <SlashDropdownMenu />
      <NotionToolbarFloating />

      {createPortal(<MobileToolbar />, document.body)}
    </EditorContent>
  )
}

/**
 * Component that creates and provides the editor instance
 */
export function EditorProvider(props: EditorProviderProps) {
  const { placeholder = "Start writing..." } = props

  const { user } = useUser()

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
      emojis: gitHubEmojis.filter(
        (emoji) => !emoji.name.includes("regional")
      ),
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
      upload: handleImageUpload,
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
  ]

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "notion-like-editor",
      },
    },
    extensions,
  })

  if (!editor) {
    return null
  }

  return (
    <div className="notion-like-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <NotionEditorHeader />
        <EditorContentArea />
      </EditorContext.Provider>

      
    </div>
  )
}

/**
 * Full editor with all necessary providers, ready to use
 */
export function NotionEditor({
  placeholder = "Start writing...",
}: NotionEditorProps) {
  return (
    <UserProvider>
      <AppProvider>
        <EditorProvider placeholder={placeholder} />
      </AppProvider>
    </UserProvider>
  )
}
