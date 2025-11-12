import { Form, TinaCMS, TinaField } from "tinacms";
import { getBearerAuthHeader } from "@/utils/tina/get-bearer-auth-header";

export const historyFields: TinaField[] = [
  {
    type: "datetime",
    name: "created",
    description: "If you see this field, contact a dev immediately 😳 (should be a hidden field generated in the background).",
    label: "Created",
    ui: {
      component: "hidden",
    },
  },
  {
    type: "string",
    name: "createdBy",
    label: "Created By",
    description: "If you see this field, contact a dev immediately 😳 (should be a hidden field generated in the background).",
    ui: {
      component: "hidden",
    },
  },
  {
    type: "string",
    name: "createdByEmail",
    label: "Created By Email",
    description: "If you see this field, contact a dev immediately 😳 (should be a hidden field generated in the background).",
    ui: {
      component: "hidden",
    },
  },
  {
    type: "datetime",
    name: "lastUpdated",
    description: "If you see this field, contact a dev immediately 😳 (should be a hidden field generated in the background).",
    label: "Last Updated",
    ui: {
      component: "hidden",
    },
  },
  {
    type: "string",
    name: "lastUpdatedBy",
    label: "Last Updated By",
    description: "If you see this field, contact a dev immediately 😳 (should be a hidden field generated in the background).",
    ui: {
      component: "hidden",
    },
  },
  {
    type: "string",
    name: "lastUpdatedByEmail",
    label: "Last Updated By Email",
    description: "If you see this field, contact a dev immediately 😳 (should be a hidden field generated in the background).",
    ui: {
      component: "hidden",
    },
  },
  {
    type: "boolean",
    name: "isArchived",
    label: "Archived",
    description: "Mark this rule as archived.",
  },
  {
    type: "string",
    name: "archivedreason",
    label: "Archived Reason",
    description: "If this rule has been archived, summarise why here. Only required if 'Archived' is checked.",
    ui: {
      validate: (value, allValue) => {
        if (!allValue.archived && value?.length) {
          return "You cannot provide an archived reason if the rule is not archived.";
        }

        if (allValue.archived && !value?.length) {
          return "Please provide a reason when archiving this rule.";
        }
      },
    },
  },
];

export const historyBeforeSubmit = async ({ form, cms, values }: { form: Form; cms: TinaCMS; values: Record<string, any> }) => {
  let userEmail: string | undefined;
  let userName: string | undefined;

  // Update categories - only if categories exist and URI is available
  if (values.categories && Array.isArray(values.categories) && values.categories.length > 0 && values.uri) {
    try {
      const response = await fetch("/rules-beta/api/update-category", {
        method: "POST",
        headers: {
          ...getBearerAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categories: values.categories || [],
          ruleUri: values.uri,
          formType: form.crudType === "create" ? "create" : "update",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to update categories:", errorData);
      } else {
        const result = await response.json();
        console.log("Categories updated successfully:", result);
      }
    } catch (error) {
      console.error("Error updating categories:", error);
      // Don't throw - allow form submission to continue even if category update fails
    }
  }
  try {
    const user = await cms.api.tina?.authProvider?.getUser();
    if (user) {
      userEmail = user.email;
      userName = user.fullName;
    }
  } catch (err) {
    console.error("Auth error:", err);
    userEmail = undefined;
    userName = undefined;
  }

  if (form.crudType === "create") {
    return {
      ...values,
      created: new Date().toISOString(),
      createdBy: userName ?? "",
      createdByEmail: userEmail ?? "",
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: userName ?? "",
      lastUpdatedByEmail: userEmail ?? "",
    };
  }

  return {
    ...values,
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: userName ?? "",
    lastUpdatedByEmail: userEmail ?? "",
  };
};
