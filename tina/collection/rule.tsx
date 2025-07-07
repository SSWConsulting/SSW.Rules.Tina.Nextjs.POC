import { embedTemplates } from "@/components/embeds";
import { generateGuid } from "@/utils/guidGenerationUtils";
import { Collection, Form, TinaCMS } from "tinacms";
import { historyBeforeSubmit, historyFields } from "./shared/historyFields";

const Rule: Collection = {
  name: "rule",
  label: "Rules",
  path: "public/uploads/rules",
  format: "mdx",
  defaultItem() {
    return {
      guid: generateGuid(),
      filename: "rule",
    };
  },
  ui: {
    filename: {
      readonly: true,
    },
    router: ({ document }) => {
      return document._sys.relativePath.split("/")[0];
    },
    beforeSubmit: historyBeforeSubmit,
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
      type: "image",
      label: "Rule thumbnail",
      name: "thumbnail",
      description: "Use a JPG or PNG image that is at least 175 x 175px",
    },
    {
      type: "string",
      name: "uri",
      label: "Uri",
      description: "The URI of the rule - this defines the slug and refereces.",
      required: true,
    },
    {
      type: "object",
      name: "authors",
      label: "Authors",
      description: "The list of contributors for this rule.",
      list: true,
      ui: {
        itemProps: (item) => {
          return { label: "👤 " + (item?.title ?? "Author") };
        },
      },
      fields: [
        {
          type: "string",
          name: "title",
          description:
            "The full name of the contributor, as it should appear on the rule.",
          label: "Name",
        },
        {
          type: "string",
          description:
            "The SSW People link for the contributor - e.g. https://ssw.com.au/people/sebastien-boissiere",
          name: "url",
          label: "Url",
        },
      ],
    },
    {
      type: "string",
      label: "Related Rules",
      name: "related",
      description:
        "The URIs of rules that should be suggested based on the content of this rule.",
      list: true,
    },
    {
      type: "string",
      name: "redirects",
      label: "Redirects",
      list: true,
    },
    {
      type: "boolean",
      name: "archived",
      label: "Archived",
      description:
        "If this rule is no longer relevant, you can archive it. Archived rules will not appear in the list of rules.",
    },
    {
      type: "string",
      name: "archivedreason",
      label: "Archived Reason",
      description: "If this rule has been archived, summarise why here.",
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
      name: "seoDescription",
      label: "SEO Description",
      description:
        "A summary of the page content, used for SEO purposes. This can be generated automatically with AI.",
    },
    {
      type: "rich-text",
      name: "body",
      label: "Body",
      isBody: true,
      templates: embedTemplates,
    },
    ...historyFields
  ],
};

export default Rule;
