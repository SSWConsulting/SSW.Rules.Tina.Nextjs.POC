import React from "react";
import { Template } from "tinacms";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { typographyComponents } from "@/components/typography-components";

function toChildren(val: any): any[] {
  const toArray = (v: any) =>
    Array.isArray(v)
      ? v
      : v && typeof v === "object" && Array.isArray(v.children)
      ? v.children
      : [];

  const flattenRoot = (nodes: any[]): any[] => {
    const out: any[] = [];
    for (const n of nodes || []) {
      if (n && typeof n === "object" && n.type === "root" && Array.isArray(n.children)) {
        out.push(...flattenRoot(n.children));
      } else {
        out.push(n);
      }
    }
    return out;
  };

  return flattenRoot(toArray(val));
}


const IntroInnerMarkdownComponents = {
  ...typographyComponents,
  p: (props: any) => {
    const content = props?.children?.props?.content;
    if (Array.isArray(content)) {
      const fullText = content
        .map((n: any) => (typeof n.text === "string" ? n.text : ""))
        .join("");
      if (fullText.includes("==") || fullText.includes("<mark>")) {
        return <p>{fullText}</p>;
      }
    }
    return <p {...props} />;
  },
  introYoutube: (props: any) => <IntroYoutube {...props} />,
};

function IntroYoutube({
  url = "",
  description = "",
}: {
  url?: string;
  description?: string;
}) {
  const extractId = (s: string) => {
    const v = (s || "").trim();
    if (!v) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const m = v.match(/(?:youtube\.com\/(?:.*v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };
  const id = extractId(url);

  if (!id) {
    return (
      <div className="my-4 rounded-lg border-2 border-dashed p-4 text-sm text-gray-500">
        Please add <strong>Video URL/ID</strong>
      </div>
    );
  }
  return (
    <div className="my-4 space-y-2">
      <div className="relative w-full aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title={description || "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute left-0 top-0 h-full w-full border-0"
        />
      </div>
      {description ? <div className="text-base font-bold">{description}</div> : null}
    </div>
  );
}

export function IntroEmbed({ body }: { body: any }) {
  const children = toChildren(body);
  if (!children.length) return null;

  return (
    <section>
      <div>
        <TinaMarkdown content={children} components={IntroInnerMarkdownComponents as any} />
      </div>
    </section>
  );
}

const introYoutubeTemplate: Template = {
  name: "introYoutube",
  label: "YouTube",
  ui: { defaultItem: { url: "", description: "" } },
  fields: [
    { name: "url", label: "Video URL/ID", type: "string" },
    { name: "description", label: "Description", type: "string" },
  ],
};

export const introEmbedTemplate: Template = {
  name: "introEmbed",
  label: "Introduction",
  fields: [
    {
      name: "body",
      label: "Body",
      type: "rich-text",
      templates: [introYoutubeTemplate],
    },
  ],
  ui: {
    defaultItem: {
      body: {
        type: "root",
        children: [{ type: "p", children: [{ text: "Write an introduction…" }] }],
      },
    },
  },
};

export const introEmbedComponent = {
  introEmbed: (props: any) => <IntroEmbed {...props} />,
};
