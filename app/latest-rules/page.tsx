import Layout from '@/components/layout/layout';
import { Section } from '@/components/layout/section';
import LatestRuleClientPage from './client-page';
import { fetchLatestRules, fetchRuleCount } from '@/lib/services/rules';

export const revalidate = 300;

export default async function LatestRulePage() {
  const [latestRules, ruleCount] = await Promise.all([
    fetchLatestRules(),
    fetchRuleCount(),
  ]);

  return (
    <Layout>
      <Section>
        <LatestRuleClientPage 
          ruleCount={ruleCount}
          latestRules={latestRules}
        />
      </Section>
    </Layout>
  );
}
