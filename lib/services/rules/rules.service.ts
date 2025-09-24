import client from "@/tina/__generated__/client";
import ruleToCategories from "../../../rule-to-categories.json";
import { Rule } from "@/models/Rule";
import { QueryResult } from "@/models/QueryResult";

export async function fetchLatestRules(
  size: number = 5, 
  sortOption: "lastUpdated" | "created" = "lastUpdated"
) {
  const res = await client.queries.latestRulesQuery({
    size,
    sortOption,
  });

  return (
    res?.data?.ruleConnection?.edges
      ?.filter((edge: any) => edge && edge.node)
      .map((edge: any) => edge.node) || []
  );
}

export async function fetchRuleCount() {
  return Object.keys(ruleToCategories).length;
}


export async function fetchArchivedRules(variables: { first?: number; after?: string } = {}): Promise<QueryResult<Rule>> {
  const result = await client.queries.archivedRulesQuery(variables);
  
  const archivedRules = result.data.ruleConnection?.edges
    ? result.data.ruleConnection.edges.map((edge: any) => edge.node)
    : [];
  
  return {
    data: archivedRules as Rule[],
    pageInfo: result.data.ruleConnection?.pageInfo || { hasNextPage: false, endCursor: '' }
  };
}

export async function fetchArchivedRulesData(variables: { first?: number; after?: string } = {}): Promise<Rule[]> {
  const result = await fetchArchivedRules(variables);
  return result.data;
}