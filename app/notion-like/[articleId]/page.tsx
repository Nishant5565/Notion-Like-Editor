import { NotionEditor } from "@/components/tiptap-templates/notion-like/notion-like-editor"

interface PageProps {
  params: { articleId: string }
}

export default async function Page({ params }: PageProps) {
  return <NotionEditor articleId={params.articleId} />
}
