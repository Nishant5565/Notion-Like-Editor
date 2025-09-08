import { NotionEditor } from "@/components/tiptap-templates/notion-like/notion-like-editor"
import { Metadata } from "next"

interface PageProps {
  params: { articleId: string }
}

export const metadata:Metadata = {
  title: 'MOW Editor',
  description: 'My otaku world editor to write, edit and manage articles',
}

export default async function Page({ params }: PageProps) {
  return <NotionEditor articleId={params.articleId} />
}
