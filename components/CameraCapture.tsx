"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  // Called with a JPEG File once the user snaps a photo. Reuses the same
  // file-handling path as uploads in the parent form.
  onCapture: (file: File) => void;
}

type FacingMode = "environment" | "user";
type Status = "idle" | "live" | "captured" | "error";

export default function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Release the camera (and turn off the hardware indicator light).
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError(
        "Live camera isn't available here (it needs a secure HTTPS connection). Use the Upload tab instead."
      );
      return;
    }

    // Always release a previous stream before requesting a new one (e.g. on flip).
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          /* autoplay can reject silently; preview still renders */
        });
      }
      setStatus("live");
    } catch (err) {
      stopStream();
      setStatus("error");
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Camera permission was denied. Allow access in your browser, or use the Upload tab.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No camera was found on this device. Use the Upload tab instead.");
      } else if (name === "NotReadableError") {
        setError("The camera is in use by another app. Close it and try again.");
      } else {
        setError("Couldn't start the camera. Use the Upload tab instead.");
      }
    }
  }, [facingMode, stopStream]);

  // Start on mount and restart whenever the facing mode changes. The cleanup
  // releases the camera on unmount (e.g. when switching back to the Upload tab).
  useEffect(() => {
    startStream();
    return stopStream;
  }, [startStream, stopStream]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("The camera isn't ready yet — wait a moment and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Couldn't capture the photo. Try again or use the Upload tab.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Couldn't capture the photo. Try again or use the Upload tab.");
          return;
        }
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopStream();
        setStatus("captured");
        onCapture(file);
      },
      "image/jpeg",
      0.9
    );
  }, [onCapture, stopStream]);

  const handleRetake = useCallback(() => {
    setStatus("idle");
    startStream();
  }, [startStream]);

  const handleFlip = useCallback(() => {
    setFacingMode((mode) => (mode === "environment" ? "user" : "environment"));
  }, []);

  if (status === "error") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
        <button
          type="button"
          onClick={handleRetake}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Try the camera again
        </button>
      </div>
    );
  }

  if (status === "captured") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-800">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Photo captured ✓
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          See the preview below, then Analyze — or retake.
        </span>
        <button
          type="button"
          onClick={handleRetake}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Retake photo
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-black dark:border-slate-700">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} playsInline muted className="h-64 w-full object-cover" />

      <button
        type="button"
        onClick={handleFlip}
        aria-label="Switch camera"
        className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white backdrop-blur transition hover:bg-black/70"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M3 11a9 9 0 0 1 15-6.7L21 7" />
          <path d="M21 3v4h-4" />
          <path d="M21 13a9 9 0 0 1-15 6.7L3 17" />
          <path d="M3 21v-4h4" />
        </svg>
      </button>

      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-4">
        <button
          type="button"
          onClick={handleCapture}
          aria-label="Capture photo"
          className="h-14 w-14 rounded-full border-4 border-white bg-white/30 shadow-lg transition hover:bg-white/60 active:scale-95"
        />
      </div>
    </div>
  );
}
