import { Template } from "tinacms";
import React from "react";
import Image from "next/image";

export interface IconLinkProps {
  url: string;
  text: string;
  iconType?: string;
}

const iconMap: Record<string, string> = {
  youtube: "/uploads/rules/use-icons-to-not-surprise-users/youtube.png",
  email: "/uploads/rules/use-icons-to-not-surprise-users/mail.png",
  pdf: "/uploads/rules/use-icons-to-not-surprise-users/pdf-icon.png",
  doc: "/uploads/rules/use-icons-to-not-surprise-users/docx-icon.png",
  docx: "/uploads/rules/use-icons-to-not-surprise-users/docx-icon.png",
  xls: "/uploads/rules/use-icons-to-not-surprise-users/xls-file.png",
  xlsx: "/uploads/rules/use-icons-to-not-surprise-users/xls-file.png",
  ppt: "/uploads/rules/use-icons-to-not-surprise-users/ppt-file.png",
  pptx: "/uploads/rules/use-icons-to-not-surprise-users/ppt-file.png",
  txt: "/uploads/rules/use-icons-to-not-surprise-users/txt-file.png",
  video: "/uploads/rules/use-icons-to-not-surprise-users/video-file.png",
  audio: "/uploads/rules/use-icons-to-not-surprise-users/audio-file.png",
  calendar: "/uploads/rules/use-icons-to-not-surprise-users/calendar-icon-png.png",
  zip: "/uploads/rules/use-icons-to-not-surprise-users/zip-file.png",
  map: "/uploads/rules/use-icons-to-not-surprise-users/map-icon.png",
  external: "/uploads/rules/use-icons-to-not-surprise-users/exit-image-icon.png",
};

function getIconType(url: string): string | null {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
    return "youtube";
  }

  if (lowerUrl.startsWith("mailto:")) {
    return "email";
  }

  if (lowerUrl.includes("google.com/maps")) {
    return "map";
  }

  if (lowerUrl.endsWith(".pdf")) return "pdf";
  if (lowerUrl.endsWith(".doc") || lowerUrl.endsWith(".docx")) return "doc";
  if (lowerUrl.endsWith(".xls") || lowerUrl.endsWith(".xlsx")) return "xls";
  if (lowerUrl.endsWith(".ppt") || lowerUrl.endsWith(".pptx")) return "ppt";
  if (lowerUrl.endsWith(".txt")) return "txt";
  if (lowerUrl.endsWith(".zip") || lowerUrl.endsWith(".rar") || lowerUrl.endsWith(".7z")) return "zip";
  if (lowerUrl.endsWith(".ics") || lowerUrl.endsWith(".vcs")) return "calendar";

  if (lowerUrl.match(/\.(avi|mov|mpg|mpeg|mp4|mkv|webm)$/)) return "video";

  if (lowerUrl.match(/\.(wav|wma|mp3|ogg|flac)$/)) return "audio";

  if (lowerUrl.startsWith("http")) {
    return "external";
  }

  return null;
}

export function IconLink({ data }: { data: IconLinkProps }) {
  const { url, text, iconType } = data;

  if (!url || !text) {
    return null;
  }

  const finalIconType = iconType || getIconType(url);
  const iconSrc = finalIconType ? iconMap[finalIconType] : null;

  return (
    <a
      href={url}
      className="icon-link"
      target={url.startsWith("http") ? "_blank" : undefined}
      rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {iconSrc && (
        <Image
          src={iconSrc}
          alt=""
          width={16}
          height={16}
          className="icon-link-image"
        />
      )}
      {text}
    </a>
  );
}

export const iconLinkTemplate: Template = {
  name: "iconLink",
  label: "Icon Link",
  fields: [
    {
      name: "text",
      label: "Link Text",
      type: "string",
      required: true,
    },
    {
      name: "url",
      label: "URL",
      type: "string",
      required: true,
    },
    {
      name: "iconType",
      label: "Icon Type (optional - auto-detected if empty)",
      type: "string",
      options: [
        { value: "", label: "Auto-detect" },
        { value: "youtube", label: "YouTube" },
        { value: "email", label: "Email" },
        { value: "pdf", label: "PDF" },
        { value: "doc", label: "Word Document" },
        { value: "xls", label: "Excel Spreadsheet" },
        { value: "ppt", label: "PowerPoint" },
        { value: "txt", label: "Text File" },
        { value: "video", label: "Video" },
        { value: "audio", label: "Audio" },
        { value: "calendar", label: "Calendar" },
        { value: "zip", label: "ZIP Archive" },
        { value: "map", label: "Google Maps" },
        { value: "external", label: "External Link" },
      ],
    },
  ],
};

export const iconLinkComponent = {
  iconLink: (props: any) => <IconLink data={props} />,
};
