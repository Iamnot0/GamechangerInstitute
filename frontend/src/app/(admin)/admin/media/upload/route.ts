import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getStaffSession } from "@/lib/staff";

const maximumPhotoBytes = 10 * 1024 * 1024;

const problem = (status: number, detail: string) =>
  Response.json({ title: "Upload refused", status, detail }, { status, headers: { "Content-Type": "application/problem+json" } });

/** Issues a short-lived, single-file upload token to signed-in staff. The file itself goes
    from the browser straight to storage and never passes through this server. */
export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session.isStaff) return problem(403, "Only staff can upload photos.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return problem(503, "Photo storage is not connected yet.");

  const body = (await request.json()) as HandleUploadBody;
  try {
    return Response.json(
      await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ["image/webp", "image/jpeg", "image/png"],
          maximumSizeInBytes: maximumPhotoBytes,
          addRandomSuffix: true,
        }),
      }),
    );
  } catch (error) {
    return problem(400, error instanceof Error ? error.message : "The upload could not be started.");
  }
}
