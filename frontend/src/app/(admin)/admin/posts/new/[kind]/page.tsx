import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { postKinds, type PostKind } from "@/lib/admin-types";
import { kindLabels } from "@/lib/media-kinds";

type NewPostPageProps = PageProps<"/admin/posts/new/[kind]">;

const isKind = (value: string): value is PostKind => postKinds.some((kind) => kind === value);

export async function generateMetadata({ params }: NewPostPageProps): Promise<Metadata> {
  const { kind } = await params;
  return { title: isKind(kind) ? kindLabels[kind].add : "Media" };
}

export default async function NewPostPage({ params }: NewPostPageProps) {
  const { kind } = await params;
  if (!isKind(kind)) notFound();

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <Link href="/admin/posts/" className="admin-page__back">
          Media
        </Link>
        <h1 className="admin-page__title">{kindLabels[kind].add}</h1>
      </header>
      <PostEditor kind={kind} post={null} />
    </div>
  );
}
