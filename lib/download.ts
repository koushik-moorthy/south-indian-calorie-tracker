"use client";

/** Trigger a browser download of in-memory text as a file. */
export function downloadTextFile(
  filename: string,
  mimeType: string,
  content: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
