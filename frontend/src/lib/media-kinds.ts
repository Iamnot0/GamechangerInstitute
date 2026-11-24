import type { PostKind } from "@/lib/admin-types";

export const kindLabels: Record<PostKind, { name: string; plural: string; add: string; about: string }> = {
  article: {
    name: "Article",
    plural: "Articles",
    add: "Write an article",
    about: "A story with a cover photo and text. Opens on its own page.",
  },
  video: {
    name: "Video",
    plural: "Videos",
    add: "Add a video",
    about: "Paste a YouTube link, or upload a video file.",
  },
  document: {
    name: "PDF",
    plural: "Documents",
    add: "Upload a PDF",
    about: "A document for readers to download.",
  },
};
