"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { analyzeImage } from "@/lib/api";

interface Props {
  onResult: (result: AnalysisResult) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export default function ImageUploadForm({ onResult }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Validate a candidate file (from upload, paste, or drop) and set preview.
  const acceptFile = useCallback((selected: File | null) => {
    setError(null);

    // Revoke any previous object URL to avoid leaks.
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFile(null);
      setPreviewUrl(null);
      setError("Unsupported image type. Use JPG, PNG, or WEBP.");
      return;
    }

    if (selected.size > MAX_BYTES) {
      setFile(null);
      setPreviewUrl(null);
      setError("Image is too large. Maximum size is 10 MB.");
      return;
    }

    const url = URL.createObjectURL(selected);
    previewUrlRef.current = url;
    setFile(selected);
    setPreviewUrl(url);
  }, []);

  // Allow pasting an image from the clipboard anywhere on the page.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const pasted = item.getAsFile();
          if (pasted) {
            e.preventDefault();
            acceptFile(pasted);
          }
          break;
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [acceptFile]);

  // Clean up the object URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    acceptFile(dropped);
  }

  async function handleAnalyze() {
    setError(null);
    if (!file) {
      setError("Please select, paste, or drop an image.");
      return;
    }

    setLoading(true);
    try {
      onResult(await analyzeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Upload Food Image
      </span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
          dragging
            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
            : "border-slate-300 hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-brand-500 dark:hover:bg-slate-800"
        }`}
      >
        <span className="text-sm font-medium text-brand-700 dark:text-brand-500">
          Click to choose a file
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          or drag &amp; drop, or paste with{" "}
          <kbd className="rounded border border-slate-300 bg-white px-1 font-sans dark:border-slate-600 dark:bg-slate-700">
            ⌘/Ctrl + V
          </kbd>
        </span>
        <span className="text-xs text-slate-400">JPG, PNG, WEBP · max 10 MB</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Selected food preview"
          className="max-h-56 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
        />
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={loading || !file}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Analyzing…" : "Analyze Image"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
