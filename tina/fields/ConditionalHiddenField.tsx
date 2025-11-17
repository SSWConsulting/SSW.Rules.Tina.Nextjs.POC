"use client";

import React, { useEffect, useRef } from "react";
import { wrapFieldsWithMeta } from "tinacms";

/**
 * Conditionally hides string, rich-text, and boolean fields (and their labels) on create mode,
 * except for 'title' and 'uri' fields.
 *
 * This component hides the field and its label when:
 * - crudType is "create"
 * - field type is "string", "rich-text", or "boolean"
 * - field name is not "title" or "uri"
 *
 * Uses a combination of returning null and CSS to ensure both field and label are hidden.
 */
export const ConditionalHiddenField = wrapFieldsWithMeta((props: any) => {
  const { field, tinaForm, input, form, meta } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if this is a root-level title or uri field that should remain visible
  const isRootLevelTitle = field.name === "title" && field.isTitle === true;
  const isRootLevelUri = field.name === "uri" && !input.name.includes("."); // Root level fields don't have dots in their path

  // Check if we should hide this field (supports string, rich-text, and boolean types)
  const shouldHide = tinaForm?.crudType === "create" && (field.type === "string" || field.type === "rich-text" || field.type === "boolean") && !isRootLevelTitle && !isRootLevelUri;

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

  // For boolean fields, render a toggle button
  if (field.type === "boolean") {
    const isChecked = input.value || false;
    return (
      <div ref={containerRef} className="flex items-center">
        <button
          type="button"
          id={input.name}
          onClick={() => input.onChange(!isChecked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isChecked ? "bg-blue-600" : "bg-gray-300"
          }`}
          role="switch"
          aria-checked={isChecked}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isChecked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        {field.label && (
          <label htmlFor={input.name} className="ml-3 text-sm text-gray-700 cursor-pointer" onClick={() => input.onChange(!isChecked)}>
            {field.label}
          </label>
        )}
      </div>
    );
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
