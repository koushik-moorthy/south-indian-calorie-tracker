import type { MetadataRoute } from "next";

/**
 * Web app manifest so the site installs to a phone home screen as a standalone
 * app (own icon, full-screen, brand theme). Next serves this at
 * /manifest.webmanifest and links it automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "South Indian Calorie Tracker",
    short_name: "Calories",
    description: "Estimate calories from South Indian foods using text or a photo.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#f97316",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
