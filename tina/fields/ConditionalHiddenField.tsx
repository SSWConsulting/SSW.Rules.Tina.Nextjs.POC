"use client";

import React, { useEffect, useRef, useState } from "react";
import { GroupListFieldPlugin, ImageField, MdxFieldPluginExtendible, ToggleFieldPlugin, wrapFieldsWithMeta } from "tinacms";

/**
 * Conditionally hides string, rich-text, boolean, image, and list fields (and their labels) on create mode,
 * except for 'title' and 'uri' fields.
 *
 * This component hides the field and its label when:
 * - crudType is "create"
 * - field type is "string", "rich-text", "boolean", "image", or has list: true
 * - field name is not "title" or "uri"
 *
 * Additionally, if a custom condition is provided via field.ui.hideCondition, it will be evaluated
 * to determine if the field should be hidden. The condition function receives form values and should return a boolean.
 *
 * Optionally, you can specify which fields to watch via field.ui.watchFields (array of field names).
 * If not provided, the component will watch all form inputs for changes.
 *
 * Example usage:
 * {
 *   ui: {
 *     component: ConditionalHiddenField,
 *     hideCondition: (values) => values?.someField !== true,
 *     watchFields: ["someField"] // Optional: specify which fields to watch
 *   }
 * }
 *
 * Uses a combination of returning null and CSS to ensure both field and label are hidden.
 */
export const ConditionalHiddenField = wrapFieldsWithMeta((props: any) => {
  const { field, tinaForm, input, form, meta } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if this is a root-level title or uri field that should remain visible
  const isRootLevelTitle = field.name === "title" && field.isTitle === true;
  const isRootLevelUri = field.name === "uri" && !input.name.includes("."); // Root level fields don't have dots in their path

  // Check if this is a list field
  const isListField = field.list === true;

  // Check custom condition if provided
  const customCondition = field.ui?.hideCondition;
  const watchFields = field.ui?.watchFields as string[] | undefined; // Optional: specific fields to watch
  const [customShouldHide, setCustomShouldHide] = useState<boolean>(() => {
    if (customCondition && typeof customCondition === "function" && form) {
      try {
        // Try multiple ways to access form values
        const formValues = form.values || form.getState?.()?.values || {};
        return customCondition(formValues);
      } catch (error) {
        console.error("Error evaluating hideCondition:", error);
        return false;
      }
    }
    return false;
  });

  // Watch form values when custom condition is present
  useEffect(() => {
    if (!customCondition || typeof customCondition !== "function" || !form) {
      return;
    }

    const checkCondition = () => {
      try {
        // Try multiple ways to access form values
        let formValues = form.values || form.getState?.()?.values || {};
        
        // Fallback: read values directly from DOM for specified watch fields if not in form values
        if (watchFields && Array.isArray(watchFields)) {
          const domValues: Record<string, any> = {};
          watchFields.forEach((fieldName) => {
            if (formValues[fieldName] === undefined) {
              // Try to find the input element for this field
              const input = document.querySelector(`input[name="${fieldName}"], select[name="${fieldName}"], textarea[name="${fieldName}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
              if (input) {
                if (input.type === "checkbox") {
                  domValues[fieldName] = (input as HTMLInputElement).checked;
                } else {
                  domValues[fieldName] = input.value;
                }
              }
            }
          });
          if (Object.keys(domValues).length > 0) {
            formValues = { ...formValues, ...domValues };
          }
        }
        
        const result = customCondition(formValues);
        setCustomShouldHide(result);
      } catch (error) {
        console.error("Error evaluating hideCondition:", error);
      }
    };

    // Check immediately
    checkCondition();

    // Set up interval to check for changes (TinaCMS may not expose a proper watch API)
    const interval = setInterval(checkCondition, 150);

    // Watch specific fields if provided, otherwise watch all form inputs
    const watchFieldsForChanges = () => {
      const handleChange = () => {
        // Small delay to ensure form values are updated
        setTimeout(checkCondition, 100);
      };

      const elements: HTMLElement[] = [];

      if (watchFields && Array.isArray(watchFields) && watchFields.length > 0) {
        // Watch only specified fields
        watchFields.forEach((fieldName) => {
          const selectors = [
            `input[name="${fieldName}"]`,
            `input[type="checkbox"][name*="${fieldName}"]`,
            `select[name="${fieldName}"]`,
            `textarea[name="${fieldName}"]`,
            `[data-tina-field*="${fieldName}"] input`,
            `[data-tina-field*="${fieldName}"] button`,
            `[data-tina-field*="${fieldName}"] select`,
          ];

          selectors.forEach((selector) => {
            const element = document.querySelector(selector);
            if (element && !elements.includes(element as HTMLElement)) {
              elements.push(element as HTMLElement);
            }
          });
        });
      } else {
        // Watch all form inputs as fallback
        document.querySelectorAll('input, select, textarea').forEach((el) => {
          if (!elements.includes(el as HTMLElement)) {
            elements.push(el as HTMLElement);
          }
        });
      }

      elements.forEach((element) => {
        element.addEventListener("change", handleChange);
        element.addEventListener("click", handleChange);
        element.addEventListener("input", handleChange);
      });

      return () => {
        elements.forEach((element) => {
          element.removeEventListener("change", handleChange);
          element.removeEventListener("click", handleChange);
          element.removeEventListener("input", handleChange);
        });
      };
    };

    const cleanup = watchFieldsForChanges();

    return () => {
      clearInterval(interval);
      if (cleanup) cleanup();
    };
  }, [customCondition, form, watchFields]);

  // Check if we should hide this field (supports string, rich-text, boolean, image, and list types)
  const shouldHideByDefault =
    tinaForm?.crudType === "create" &&
    (field.type === "string" || field.type === "rich-text" || field.type === "boolean" || field.type === "image" || isListField) &&
    !isRootLevelTitle &&
    !isRootLevelUri;

  // If a custom condition is provided, use only that. Otherwise, use the default behavior.
  const shouldHide = customCondition ? customShouldHide : shouldHideByDefault;

  // Hide the entire field wrapper (including label) using CSS
  useEffect(() => {
    if (containerRef.current) {
      // Traverse up the DOM to find the field wrapper that contains the label
      let element: HTMLElement | null = containerRef.current;
      for (let i = 0; i < 5 && element; i++) {
        element = element.parentElement;
        if (element) {
          // Hide or show the parent that likely contains both label and field
          // This is a common pattern in form libraries
          const hasLabel = element.querySelector("label") || element.querySelector('[class*="label"]') || element.getAttribute("data-tina-field");
          if (hasLabel || i >= 2) {
            element.style.display = shouldHide ? "none" : "";
            break;
          }
        }
      }
    }

    // For image, rich-text, boolean, and list fields, hide the outer label added by wrapFieldsWithMeta
    // since ImageField, MdxFieldPluginExtendible.Component, ToggleFieldPlugin, and GroupListFieldPlugin already have their own labels
    if ((field.type === "image" || field.type === "rich-text" || field.type === "boolean" || isListField) && !shouldHide && containerRef.current) {
      // Find the field wrapper that contains both the outer label and our component
      let element: HTMLElement | null = containerRef.current;
      // Traverse up to find the field wrapper
      for (let i = 0; i < 6 && element; i++) {
        element = element.parentElement;
        if (element) {
          // Look for labels that are direct children (these are usually from wrapFieldsWithMeta)
          // ImageField's, MdxFieldPluginExtendible's, ToggleFieldPlugin's, and GroupListFieldPlugin's labels will be nested deeper inside
          const directChildLabels = Array.from(element.children).filter((child) => child.tagName === "LABEL" || child.querySelector("label"));
          if (directChildLabels.length > 0) {
            // Hide the direct child label (outer label from wrapFieldsWithMeta)
            const labelToHide = directChildLabels[0].tagName === "LABEL" ? directChildLabels[0] : directChildLabels[0].querySelector("label");
            if (labelToHide) {
              (labelToHide as HTMLElement).style.display = "none";
            }
            break;
          }
          // Alternative: Look for label elements and hide the one that's not inside our containerRef
          const allLabels = element.querySelectorAll("label");
          if (allLabels.length > 0) {
            // Find the label that's not a descendant of our containerRef
            for (const label of Array.from(allLabels)) {
              if (!containerRef.current?.contains(label)) {
                (label as HTMLElement).style.display = "none";
                break;
              }
            }
          }
        }
      }
    }
  }, [shouldHide, field.type, isListField]);

  // Return null to hide the field input itself
  if (shouldHide) {
    return <div ref={containerRef} style={{ display: "none" }} />;
  }

  // For boolean fields, use Tina's ToggleFieldPlugin component
  if (field.type === "boolean") {
    return (
      <div ref={containerRef}>
        <ToggleFieldPlugin.Component {...props} />
      </div>
    );
  }

  if (field.type === "image") {
    // Wrap ImageField in a div with ref so we can find and hide the outer label
    return (
      <div ref={containerRef}>
        <ImageField {...props} />
      </div>
    );
  }

  if (field.type === "rich-text") {
    // Wrap MdxFieldPluginExtendible.Component in a div with ref so we can find and hide the outer label
    return (
      <div ref={containerRef}>
        <MdxFieldPluginExtendible.Component {...props} />
      </div>
    );
  }

  if (isListField) {
    // Wrap ListFieldPlugin in a div with ref so we can find and hide the outer label
    return (
      <div ref={containerRef}>
        <GroupListFieldPlugin.Component {...props} />
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
