import React from "react";
import { Section } from "@/components/layout/section";
import client from "@/tina/__generated__/client";
import Layout from "@/components/layout/layout";
import SearchBar from "@/components/SearchBar";
import HomeClientPage from "./client-page";

export const revalidate = 300;

async function fetchAllCategories() {
  let hasNextPage = true;
  let after: string | null = null;
  const allCategories: any[] = [];

  while (hasNextPage) {
    const res = await client.queries.homepageCategoriesQuery({
      first: 50,
      after,
    });

    const edges = res?.data?.categoryConnection?.edges || [];

    allCategories.push(
      ...edges
        .filter((edge: any) => edge && edge.node)
        .map((edge: any) => edge.node)
    );

    hasNextPage = res?.data?.categoryConnection?.pageInfo?.hasNextPage;
    after = res?.data?.categoryConnection?.pageInfo?.endCursor;
  }

  return allCategories;
}

async function fetchLatestRules() {
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

async function fetchRuleCount() {
  const res = await client.queries.ruleConnection({
    first: 0,
  });

  return res?.data?.ruleConnection?.totalCount || 0;
}

export default async function Home() {
  const [categories, latestRules, ruleCount] = await Promise.all([
    fetchAllCategories(),
    fetchLatestRules(),
    fetchRuleCount(),
  ]);

  const layout = await Layout({
    children: (
      <Section>
        <HomeClientPage categories={categories} latestRules={latestRules} ruleCount={ruleCount} />
      </Section>
    ),
  });

  return layout;
}
