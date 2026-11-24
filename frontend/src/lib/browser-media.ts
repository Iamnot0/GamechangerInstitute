const longestEdge = 1920;

const encode = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));

function draw(source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, longestEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare images for upload.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export type PreparedImage = { blob: Blob; width: number; height: number };

/** Phone photos are far larger than a web page needs, so each one is scaled and re-encoded before it leaves the browser. */
export async function preparePhoto(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = draw(bitmap, bitmap.width, bitmap.height);
  bitmap.close();
  const blob = await encode(canvas);
  if (!blob) throw new Error(`${file.name} could not be read as a photo.`);
  return { blob, width: canvas.width, height: canvas.height };
}

/** One frame from near the start of a video, used as its thumbnail so nobody has to make one. */
export async function captureFrame(file: File): Promise<PreparedImage> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error(`${file.name} could not be read as a video.`));
    });
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = Math.min(1, (video.duration || 0) / 2);
    });
    const canvas = draw(video, video.videoWidth, video.videoHeight);
    const blob = await encode(canvas);
    if (!blob) throw new Error(`A thumbnail could not be made from ${file.name}.`);
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const storageName = (folder: string, fileName: string, extension: string) =>
  `${folder}/${fileName.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file"}.${extension}`;
