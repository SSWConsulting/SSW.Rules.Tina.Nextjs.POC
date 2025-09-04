import client from "@/tina/__generated__/client";

export async function fetchLatestRules() {
  const res = await client.queries.latestRulesQuery({
    size: 5,
    sortOption: "lastUpdated",
  });

  return (
    res?.data?.ruleConnection?.edges
      ?.filter((edge: any) => edge && edge.node)
      .map((edge: any) => edge.node) || []
  );
}