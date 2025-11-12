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

  // Update categories - only for update forms (not create, because rule doesn't exist yet)
  // For create forms, categories will be updated after the rule is created
  if (form.crudType !== "create" && values.categories && Array.isArray(values.categories) && values.categories.length > 0 && values.uri) {
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
          formType: "update",
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
  } else if (form.crudType === "create") {
    // For create forms, attempt to update categories
    // Note: This may fail if called before the rule file is created, but we'll try anyway
    // The API will construct the rule path from URI for new rules
    if (values.categories && Array.isArray(values.categories) && values.categories.length > 0 && values.uri) {
      try {
        console.log(`📝 Create form detected - attempting to update ${values.categories.length} category/categories for rule "${values.uri}"`);

        // Attempt to update categories - this may fail if rule doesn't exist yet
        // In that case, categories will need to be updated manually after rule creation
        const response = await fetch("/rules-beta/api/update-category", {
          method: "POST",
          headers: {
            ...getBearerAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categories: values.categories || [],
            ruleUri: values.uri,
            formType: "create",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.warn(
            `⚠️ Could not update categories for new rule "${values.uri}" - rule may not exist yet. ` +
              `Categories will need to be updated after the rule is created. Error:`,
            errorData
          );
        } else {
          const result = await response.json();
          console.log(`✅ Categories updated successfully for new rule:`, result);
        }
      } catch (error) {
        console.warn(`⚠️ Error updating categories for new rule "${values.uri}":`, error, `\nCategories will need to be updated after the rule is created.`);
        // Don't throw - allow form submission to continue
      }
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
