import React from "react";

export type FigurePreset = "default" | "badExample" | "okExample" | "goodExample";

export function getPrefix(preset?: FigurePreset): string {
  switch (preset) {
    case "badExample":
      return "❌ Figure: ";
    case "okExample":
      return "😐 Figure: ";
    case "goodExample":
      return "✅ Figure: ";
    case "default":
    default:
      return "Figure: ";
  }
}

export function Figure({ preset = "default", text, className }: { preset?: FigurePreset; text?: string; className?: string }) {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const prefix = getPrefix(preset);
  return (
    <p className={`font-bold mt-1 ${className ?? ""}`.trim()}>
      {prefix}
      {trimmed}
    </p>
  );
}

export const figureEmbedFields = {
  name: "figureEmbed",
  label: "Figure",
  type: "object",
  fields: [
    {
      name: "preset",
      label: "Preset",
      type: "string",
      required: true,
      options: [
        {
          value: "default",
          label: "Default",
        },
        {
          value: "badExample",
          label: "Bad Example",
        },
        {
          value: "okExample",
          label: "OK Example",
        },
        {
          value: "goodExample",
          label: "Good Example",
        },
      ],
    },
    { name: "figure", label: "Figure", type: "string", required: true },
  ],
};

export const inlineFigureFields = [
  {
    name: "figurePreset",
    label: "Figure Preset",
    type: "string",
    options: [
      { value: "default", label: "Default" },
      { value: "badExample", label: "Bad Example" },
      { value: "okExample", label: "OK Example" },
      { value: "goodExample", label: "Good Example" },
    ],
  },
  { name: "figureText", label: "Figure Text", type: "string" },
] as const;

export const inlineFigureDefaultItem = {
  figurePreset: "default",
  figureText: "",
};
