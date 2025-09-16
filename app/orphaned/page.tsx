import React from "react";
import { Section } from "@/components/layout/section";
import Breadcrumbs from "@/components/Breadcrumbs";
import { fetchOrphanedRulesData } from "@/lib/services/rules";
import OrphanedClientPage from "./client-page";

export const revalidate = 300;

export default async function OrphanedPage() {
  const orphanedRules = await fetchOrphanedRulesData();

  return (
    <Section>
      <Breadcrumbs breadcrumbText="Orphaned Rules" />
      <OrphanedClientPage orphanedRules={orphanedRules} />
    </Section>
  );
}

export async function generateMetadata() {
  return {
    title: "Orphaned Rules | SSW Rules",
    description: "Rules that have no parent category",
  };
}