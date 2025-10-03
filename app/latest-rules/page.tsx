import { Section } from '@/components/layout/section';
import LatestRuleClientPage from './client-page';
import { fetchRuleCount } from '@/lib/services/rules';
import { Suspense } from 'react';
import Spinner from '@/components/Spinner';

export const revalidate = 300;

interface LatestRulePageProps {
  searchParams: Promise<{ size?: string }>;
}

export default async function LatestRulePage({ searchParams }: LatestRulePageProps) {
  const { size: sizeStr } = await searchParams;

  const size = sizeStr ? parseInt(sizeStr, 10) : 5;

  const ruleCount = await fetchRuleCount();

  return (
      <Section>
        <Suspense fallback={<Spinner size="lg" />}>
          <LatestRuleClientPage
            ruleCount={ruleCount}
            initialSize={size}
          />
        </Suspense>
      </Section>
  );
}

export async function generateMetadata() {
  return {
    title: "Latest Rules | SSW.Rules",
  }
}