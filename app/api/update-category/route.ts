//import { TinaGraphQLClient } from "@/src/utils/tina/tina-graphql-client";
import { type NextRequest, NextResponse } from "next/server";
// import { generateMdxFiles } from "./generate-mdx-files";
// import type { GroupApiData } from "./types";

const isDev = process.env.NODE_ENV === "development";

export async function POST(request: NextRequest) {
  try {
    const { categories, rule } = await request.json();
    const authHeader = request.headers.get("authorization");

    if (!isDev && (!authHeader || !authHeader.startsWith("Bearer "))) {
      return NextResponse.json(
        { error: "Missing Authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader?.replace("Bearer ", "");
    // const client = new TinaGraphQLClient(token || "");
    console.log("✌️ category", categories);
    console.log("✌️rule", rule);

    if (!Array.isArray(categories) || !rule) {
      return NextResponse.json(
        { error: "Invalid data format - expected categories array and rule" },
        { status: 400 }
      );
    }

    const allCreatedFiles: string[] = [];
    const allSkippedFiles: string[] = [];
    for (const category of categories) {
        console.log("category", category);
        console.log("rule", rule);
    //   if (item._template === "apiTab") {
    //     // Process API groups within this tab
    //     for (const group of item.supermenuGroup || []) {
    //       if (group._template === "groupOfApiReferences" && group.apiGroup) {
    //         try {
    //           // Parse the group data
    //           const groupData: GroupApiData =
    //             typeof group.apiGroup === "string"
    //               ? JSON.parse(group.apiGroup)
    //               : group.apiGroup;

    //           // Generate files for this group
    //           const { createdFiles, skippedFiles } = await generateMdxFiles(
    //             groupData,
    //             client
    //           );
    //           allCreatedFiles.push(...createdFiles);
    //           allSkippedFiles.push(...skippedFiles);
    //         } catch (error) {
    //           // Continue processing other groups
    //         }
    //       }
    //     }
    //   }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${categories.length} categories`,
      totalFilesCreated: allCreatedFiles.length,
      createdFiles: allCreatedFiles,
      skippedFiles: allSkippedFiles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process navigation API groups",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
