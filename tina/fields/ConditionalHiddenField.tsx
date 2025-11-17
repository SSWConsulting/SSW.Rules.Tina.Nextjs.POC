"use client";

import React, { useEffect, useRef } from "react";
import { wrapFieldsWithMeta } from "tinacms";

/**
 * Conditionally hides string and rich-text fields (and their labels) on create mode,
 * except for 'title' and 'uri' fields.
 *
 * This component hides the field and its label when:
 * - crudType is "create"
 * - field type is "string" or "rich-text"
 * - field name is not "title" or "uri"
 *
 * For rich-text fields that should be visible, it renders Tina's default rich-text editor.
 * Uses a combination of returning null and CSS to ensure both field and label are hidden.
 */
export const ConditionalHiddenField = wrapFieldsWithMeta((props: any) => {
  const { field, tinaForm, input, form, meta } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if this is a root-level title or uri field that should remain visible
  const isRootLevelTitle = field.name === "title" && field.isTitle === true;
  const isRootLevelUri = field.name === "uri" && !input.name.includes("."); // Root level fields don't have dots in their path

  // Check if we should hide this field (supports both string and rich-text types)
  const shouldHide = tinaForm?.crudType === "create" && (field.type === "string" || field.type === "rich-text") && !isRootLevelTitle && !isRootLevelUri;

  // Hide the entire field wrapper (including label) using CSS
  useEffect(() => {
    if (shouldHide && containerRef.current) {
      // Traverse up the DOM to find the field wrapper that contains the label
      let element: HTMLElement | null = containerRef.current;
      for (let i = 0; i < 5 && element; i++) {
        element = element.parentElement;
        if (element) {
          // Hide the parent that likely contains both label and field
          // This is a common pattern in form libraries
          const hasLabel = element.querySelector("label") || element.querySelector('[class*="label"]') || element.getAttribute("data-tina-field");
          if (hasLabel || i >= 2) {
            element.style.display = "none";
            break;
          }
        }
      }
    }
  }, [shouldHide]);

  // Return null to hide the field input itself
  if (shouldHide) {
    return <div ref={containerRef} style={{ display: "none" }} />;
  }

  // For string fields, render the default string input
  return (
    <div ref={containerRef}>
      <input
        type="text"
        id={input.name}
        {...input}
        className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      />
    </div>
  );
});
