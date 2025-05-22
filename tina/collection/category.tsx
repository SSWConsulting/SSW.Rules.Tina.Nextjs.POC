import { generateGuid } from "@/utils/guidGenerationUtils";
import { Collection } from "tinacms";

const Category: Collection = {
  name: "category",
  label: "Categories",
  path: "categories",
  format: "md",
  ui: {
    filename: {
      readonly: true,
      slugify: (values) => {
        if (
          values?._template === "top_category" ||
          values?._template === "main"
        ) {
          return "index";
        } else {
          return `${values?.title
            ?.toLowerCase()
            .trim()
            .replace(/ /g, "-")
            .replace("?", "")}`;
        }
      },
      description:
        'If it is the main or top category, then the filename will be "index", otherwise the title will be used to create filename',
    },
  },
  templates: [
    // main category file that contains top categories
    {
      name: "main",
      label: "Main Category",
      fields: [
        {
          type: "string",
          label: "Title",
          name: "title",
          isTitle: true,
          required: true,
        },
        {
          type: "object",
          label: "Categories",
          name: "index",
          list: true,
          ui: {
            itemProps: (item) => {
              const name = item.category?.split("/");
              return {
                label: name ? name[1] : "Top category is not selected",
              };
            },
          },
          fields: [
            {
              type: "reference",
              label: "Category",
              name: "category",
              collections: ["category"],
              ui: {
                optionComponent: (props: { name: string }, _internalSys) => {
                  return _internalSys.path;
                },
              },
            },
          ],
        },
      ],
    },

    // top category that contains subcategories
    {
      name: "top_category",
      label: "Top Category",
      fields: [
        {
          type: "string",
          label: "Title",
          name: "title",
          isTitle: true,
          required: true,
        },
        {
          type: "object",
          label: "Categories",
          name: "index",
          list: true,
          ui: {
            itemProps: (item) => {
              const name = item.category?.split("/");
              return {
                label: name
                  ? name[name.length - 1].split(".")[0]
                  : "Category is not selected",
              };
            },
          },
          fields: [
            {
              type: "reference",
              label: "Category",
              name: "category",
              collections: ["category"],
              ui: {
                optionComponent: (props: { name: string }, _internalSys) => {
                  return _internalSys.path;
                },
              },
            },
          ],
        },
      ],
    },

    // subcategory that contains rules
    {
      name: "category",
      label: "Category",
      ui: {
        defaultItem: () => {
          return {
            guid: generateGuid(),
          };
        },
      },
      fields: [
        {
          type: "string",
          label: "Title",
          name: "title",
          isTitle: true,
          required: true,
        },
        {
          type: "string",
          name: "guid",
          label: "Guid",
          description:
            "If you see this field, contact a dev immediately 😳 (should be a hidden field generated in the background).",
          ui: {
            component: "hidden",
          },
        },
        {
          type: "string",
          name: "consulting",
          label: "Consulting link",
          description: "Add Consulting link here",
        },
        {
          type: "string",
          name: "experts",
          label: "Experts link",
          description: "Add Experts link here",
        },
        {
          type: "string",
          name: "redirects",
          label: "Redirects",
          list: true,
        },
        {
          type: "object",
          label: "Rules",
          name: "index",
          list: true,
          ui: {
            itemProps: (item) => {
              const name = item.rule?.split("/");
              return {
                label: name ? name[1] : "Rule is not selected",
              };
            },
          },
          fields: [
            {
              type: "reference",
              label: "Rule",
              name: "rule",
              collections: ["rule"],
              ui: {
                optionComponent: (props: { name: string }, _internalSys) => {
                  return props.name ?? _internalSys.path;
                },
              },
            },
          ],
        },
        {
          type: "rich-text",
          name: "body",
          label: "Body",
          isBody: true,
          description: "This is description of the category",
        },
      ],
    },
  ],
};

export default Category;
