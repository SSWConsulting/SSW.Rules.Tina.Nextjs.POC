import { Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import { Prism } from "tinacms/dist/rich-text/prism";
import { toSlug } from "@/lib/utils";

// Helper function to extract text content from TinaCMS props structure
const getTextContent = (props: any): string => {
  // TinaCMS structure: props.children.props.content is an array of {text: string} objects
  const content = props?.children?.props?.content;

  if (Array.isArray(content)) {
    return content.map((node) => (typeof node.text === "string" ? node.text : "")).join("");
  }

  // Fallback for standard React children
  if (typeof props.children === "string") return props.children;
  if (Array.isArray(props.children)) {
    return props.children.map((child) => (typeof child === "string" ? child : "")).join("");
  }

  return "";
};

const createHeading =
  (Tag: "h2" | "h3" | "h4", enableAnchors = false) =>
  (props: any) => {
    if (!enableAnchors) {
      return <Tag {...props} />;
    }

    const textContent = getTextContent(props);
    const id = toSlug(textContent);

    const iconSize = Tag === "h2" ? 24 : Tag === "h3" ? 20 : 16;

    return (
      <Tag id={id} className="group relative scroll-mt-24" {...props}>
        {props.children}
        <a
          href={`#${id}`}
          className="inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 no-underline"
          aria-label={`Link to ${textContent}`}
        >
          <LinkIcon size={iconSize} className="text-gray-400 hover:text-ssw-red" />
        </a>
      </Tag>
    );
  };

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

  if (lowerUrl.startsWith("http://") || lowerUrl.startsWith("https://")) {
    return "external";
  }

  return null;
}

const rewriteUploadsToAssets = (href?: string) => {
  const TINA_CLIENT_ID = process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "";
  const ALLOWED_EXTS = new Set(["pdf", "txt", "zip", "mp4", "mp3", "ics", "doc", "docx", "ppt", "pptx", "xls", "xlsx"]);

  if (!href || !TINA_CLIENT_ID || !href.startsWith("/uploads/rules/")) {
    return href;
  }
  const ext = href.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTS.has(ext)) return href;
  return `https://assets.tina.io/${TINA_CLIENT_ID}/${href.replace(/^\/uploads\//, "")}`;
};

export const getTypographyComponents = (enableAnchors = false) => ({
  p: (props: any) => <p className="mb-4" {...props} />,
  a: (props: any) => {
    let href = props?.url || props?.href || "";
    href = rewriteUploadsToAssets(href);
    const isInternal = typeof href === "string" && href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/_next");

    const iconType = href ? getIconType(href) : null;
    const iconSrc = iconType ? iconMap[iconType] : null;

    const linkContent = (
      <>
        {iconSrc && (
          <Image
            src={iconSrc}
            alt=""
            width={16}
            height={16}
            className="inline-block align-middle mr-1"
            style={{ margin: 0, padding: 0 }}
          />
        )}
        {props.children}
      </>
    );

    if (isInternal) {
      return (
        <Link href={href} className="underline hover:text-ssw-red inline-flex items-center">
          {linkContent}
        </Link>
      );
    }

    return (
      <a {...props} href={href} className="underline hover:text-ssw-red inline-flex items-center">
        {linkContent}
      </a>
    );
  },
  li: (props) => <li {...props} />,
  mark: (props: any) => <mark {...props} />,
  blockquote: (props: any) => <blockquote className="border-l-2 border-gray-900 my-4 pl-4 italic text-gray-600" {...props} />,
  code: (props: any) => <code className="bg-gray-100 py-1 px-2 rounded-sm" {...props} />,
  code_block: (props) => {
    if (!props) {
      return <></>;
    }
    return (
      <div className="[&_.prism-code]:p-4">
        <Prism lang={props.lang} value={props.value} />
      </div>
    );
  },
  h2: createHeading("h2", enableAnchors),
  h3: createHeading("h3", enableAnchors),
  h4: createHeading("h4", enableAnchors),
});

// Default export without anchors for backwards compatibility
export const typographyComponents = getTypographyComponents(false);
