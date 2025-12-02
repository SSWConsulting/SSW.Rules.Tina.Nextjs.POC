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

export const inlineFigureFields = [
  {
    name: "captionStyle",
    label: "Caption Style",
    type: "string",
    options: [
      { value: "default", label: "Default" },
      { value: "badExample", label: "Bad Example" },
      { value: "okExample", label: "OK Example" },
      { value: "goodExample", label: "Good Example" },
    ],
  },
  { name: "captionText", label: "Caption Text", type: "string" },
] as const;

export const inlineFigureDefaultItem = {
  captionStyle: "default",
  captionText: "",
};
