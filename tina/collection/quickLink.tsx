import { Collection, Form, TinaCMS } from "tinacms";

const QuickLink: Collection = {
  label: "Quick Links",
  name: "quickLinks",
  path: "content",
  format: "json",
  templates: [
    {
      name: "quickLinks",
      label: "Quick Links",
      fields: [
        {
          type: "object",
          list: true,
          name: "links",
          label: "Links",
          fields: [
            { type: "string", name: "linkText", label: "Link Text" },
            { type: "string", name: "uri", label: "URI" },
          ],
        },
      ],
    },
  ]
};

export default QuickLink;
