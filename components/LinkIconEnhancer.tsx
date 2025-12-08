"use client";

import { useEffect, useRef } from "react";

// Icon configurations - maps link types to their icon paths
const ICON_CONFIG: Record<string, string> = {
  youtube: "/uploads/rules/use-icons-to-not-surprise-users/youtube.png",
  email: "/uploads/rules/use-icons-to-not-surprise-users/mail.png",
  pdf: "/uploads/rules/use-icons-to-not-surprise-users/pdf-icon.png",
  doc: "/uploads/rules/use-icons-to-not-surprise-users/docx-icon.png",
  xls: "/uploads/rules/use-icons-to-not-surprise-users/xls-file.png",
  ppt: "/uploads/rules/use-icons-to-not-surprise-users/ppt-file.png",
  txt: "/uploads/rules/use-icons-to-not-surprise-users/txt-file.png",
  video: "/uploads/rules/use-icons-to-not-surprise-users/video-file.png",
  audio: "/uploads/rules/use-icons-to-not-surprise-users/audio-file.png",
  calendar: "/uploads/rules/use-icons-to-not-surprise-users/calendar-icon-png.png",
  zip: "/uploads/rules/use-icons-to-not-surprise-users/zip-file.png",
  map: "/uploads/rules/use-icons-to-not-surprise-users/map-icon.png",
  external: "/uploads/rules/use-icons-to-not-surprise-users/exit-image-icon.jpg",
};

function getIconType(href: string): string | null {
  const lowerHref = href.toLowerCase();

  // YouTube
  if (lowerHref.includes("youtube.com") || lowerHref.includes("youtu.be")) {
    return "youtube";
  }

  // Email
  if (lowerHref.startsWith("mailto:")) {
    return "email";
  }

  // Google Maps
  if (lowerHref.includes("google.com/maps")) {
    return "map";
  }

  // File extensions
  if (lowerHref.endsWith(".pdf")) return "pdf";
  if (lowerHref.endsWith(".doc") || lowerHref.endsWith(".docx")) return "doc";
  if (lowerHref.endsWith(".xls") || lowerHref.endsWith(".xlsx")) return "xls";
  if (lowerHref.endsWith(".ppt") || lowerHref.endsWith(".pptx")) return "ppt";
  if (lowerHref.endsWith(".txt")) return "txt";
  if (lowerHref.endsWith(".zip") || lowerHref.endsWith(".rar") || lowerHref.endsWith(".7z")) return "zip";
  if (lowerHref.endsWith(".ics") || lowerHref.endsWith(".vcs")) return "calendar";

  // Video files
  if (/\.(avi|mov|mpg|mpeg|mp4|mkv|webm)$/.test(lowerHref)) return "video";

  // Audio files
  if (/\.(wav|wma|mp3|ogg|flac)$/.test(lowerHref)) return "audio";

  // External links (http/https that aren't internal)
  if ((lowerHref.startsWith("http://") || lowerHref.startsWith("https://")) &&
      !lowerHref.includes("ssw.com.au/rules")) {
    return "external";
  }

  return null;
}

interface LinkIconEnhancerProps {
  children: React.ReactNode;
}

export function LinkIconEnhancer({ children }: LinkIconEnhancerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Find all links that don't already have an icon image
    const links = containerRef.current.querySelectorAll("a[href]");

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      // Skip if link already has an image inside it
      if (link.querySelector("img")) return;

      // Skip if link already has been processed
      if (link.hasAttribute("data-icon-enhanced")) return;

      const iconType = getIconType(href);
      if (!iconType) return;

      const iconSrc = ICON_CONFIG[iconType];
      if (!iconSrc) return;

      // Create and insert the icon
      const icon = document.createElement("img");
      icon.src = iconSrc;
      icon.alt = "";
      icon.width = 16;
      icon.height = 16;
      icon.style.cssText = "display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: 0; margin-bottom: 0;";

      // Insert at the beginning of the link
      link.insertBefore(icon, link.firstChild);

      // Mark as processed
      link.setAttribute("data-icon-enhanced", "true");

      // Add underline styling to the link
      (link as HTMLElement).style.textDecoration = "underline";
    });
  }, [children]);

  return <div ref={containerRef}>{children}</div>;
}

export default LinkIconEnhancer;
