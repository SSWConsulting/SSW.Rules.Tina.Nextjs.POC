import React from "react";
import { Template } from "tinacms";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { CodeXml, Info } from "lucide-react";

import {
  ComponentWithFigure,
  withFigureEmbedTemplateFields,
} from "./componentWithFigure";

// -------------------- Types --------------------
type AsideVariant = "greybox" | "info" | "todo" | "china" | "codeauditor" | "highlight";

interface AsideEmbedProps {
  data: {
    variant?: AsideVariant;
    body: any;
    [key: string]: any;
  };
}

interface VariantConfig {
  containerClass: string;
  icon?: JSX.Element;
  textClass?: string;
}

// -------------------- Helpers --------------------
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="w-8 h-8 mr-4 flex items-center justify-center text-red-600">
    {children}
  </div>
);

const variantConfig: Record<AsideVariant, VariantConfig> = {
  greybox: {
    containerClass: "bg-gray-100 text-gray-800",
  },
  info: {
    containerClass: "bg-white border text-gray-800",
    icon: <IconWrapper><Info className="w-8 h-8" /></IconWrapper>,
  },
  todo: {
    containerClass: "bg-white border border-red-500 text-red-700 font-semibold",
    textClass: "text-red-600",
  },
  china: {
    containerClass: "bg-white border text-gray-800",
    icon: (
      <div
        className="w-7 h-6 mt-1 mr-4 flex-shrink-0 rounded"
        style={{
          backgroundImage:
            'url("https://raw.githubusercontent.com/SSWConsulting/SSW.Rules/main/static/assets/china-flag-icon.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    ),
  },
  codeauditor: {
    containerClass: "bg-white border text-gray-800",
    icon: <IconWrapper><CodeXml className="w-8 h-8" /></IconWrapper>,
  },
  highlight: {
    containerClass: "bg-yellow-200 text-yellow-900",
  },
};

// -------------------- Main Component --------------------
export function AsideEmbed({ data }: AsideEmbedProps) {
  const variant: AsideVariant = data.variant || "info";
  const config = variantConfig[variant];

  return (
    <ComponentWithFigure data={data}>
      <div className={`p-4 rounded-sm my-4 ${config.containerClass}`}>
        <div className="flex items-start">
          {config.icon}
          <div className={`prose prose-sm max-w-none text-base ${config.textClass ?? ""}`}>
            <TinaMarkdown content={data.body} />
          </div>
        </div>
      </div>
    </ComponentWithFigure>
  );
}

// -------------------- Template --------------------
export const asideEmbedTemplate: Template = withFigureEmbedTemplateFields({
  name: "asideEmbed",
  label: "Aside Box",
  ui: {
    defaultItem: {
      variant: "info",
      body: {
        type: "root",
        children: [
          {
            type: "p",
            children: [{ text: "This is a box." }],
          },
        ],
      },
    },
  },
  fields: [
    {
      name: "variant",
      label: "Variant",
      type: "string",
      options: [
        { value: "greybox", label: "Greybox" },
        { value: "info", label: "Info" },
        { value: "todo", label: "Todo" },
        { value: "china", label: "China" },
        { value: "codeauditor", label: "Codeauditor" },
        { value: "highlight", label: "Highlight" },
      ],
    },
    {
      name: "body",
      label: "Body",
      type: "rich-text",
    },
  ],
});

// -------------------- Component Mapping --------------------
export const asideEmbedComponent = {
  asideEmbed: (props: any) => <AsideEmbed data={props} />,
};
