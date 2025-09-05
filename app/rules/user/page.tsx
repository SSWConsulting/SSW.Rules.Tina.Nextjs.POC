import Layout from '@/components/layout/layout';
import { Section } from '@/components/layout/section';
import UserRulesClientPage from './client-page';
import { Suspense } from "react";
import client from '@/tina/__generated__/client';

export const revalidate = 300;

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

export default async function UserRulesPage() {

  const latestRules = await fetchLatestRules()

  return (
    <Layout>
      <Section>
        <Suspense fallback={null}>
          <UserRulesClientPage latestRules={latestRules} />
        </Suspense>
      </Section>
    </Layout>
  );
}