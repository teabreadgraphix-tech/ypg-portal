import { put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";

function safeExtension(filename: string) {
  const match = /\.[a-z0-9]{1,10}$/i.exec(filename);
  return match ? match[0].toLowerCase() : "";
}

/** Uploads a file to Vercel Blob and returns its public (unguessable-URL) address. */
export async function uploadFile(buffer: Buffer, originalFilename: string, mimeType: string) {
  const key = `documents/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${safeExtension(originalFilename)}`;
  const blob = await put(key, buffer, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: false,
  });
  return blob.url;
}

export async function deleteFile(url: string) {
  await del(url);
}
