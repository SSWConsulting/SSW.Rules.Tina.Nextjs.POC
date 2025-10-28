import { Card } from "@/components/ui/card";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getMarkdownComponentMapping } from "@/components/tina-markdown/markdown-component-mapping";
import { formatDateLong, timeAgo } from "@/lib/dateUtils";
import Discussion from "@/components/Discussion";
import { IconLink } from "@/components/ui";
import { RiGithubLine, RiHistoryLine, RiPencilLine } from "react-icons/ri";
import { ICON_SIZE } from "@/constants";
import Acknowledgements from "./Acknowledgements";
import HelpCard from "./HelpCard";
import Bookmark from "./Bookmark";

export interface ServerRulePageProps {
  rule: any;
  ruleCategoriesMapping: { title: string; uri: string }[];
  relatedRulesMapping: { uri: string; title: string }[];
  sanitizedBasePath: string;
}

export type ServerRulePagePropsWithTinaProps = {
  serverRulePageProps: ServerRulePageProps;
  tinaProps: any;
}

export default function ServerRulePage({
  serverRulePageProps,
  tinaProps,
}: ServerRulePagePropsWithTinaProps) {
  const { rule, ruleCategoriesMapping, relatedRulesMapping, sanitizedBasePath } = serverRulePageProps;

  const relativeTime = rule?.lastUpdated ? timeAgo(rule.lastUpdated) : "";
  const created = rule?.created ? formatDateLong(rule.created) : "Unknown";
  const updated = rule?.lastUpdated ? formatDateLong(rule.lastUpdated) : "Unknown";
  const historyTooltip = `Created ${created}\nLast Updated ${updated}`;
  const relatedRules = relatedRulesMapping || [];

  const primaryCategory = ruleCategoriesMapping?.[0];
  const breadcrumbCategories = primaryCategory
    ? [{ title: primaryCategory.title, link: `/${primaryCategory.uri}` }]
    : undefined;

  return (
    <>
      <Breadcrumbs categories={breadcrumbCategories} breadcrumbText="This rule" />

      <div className="layout-two-columns">
        <Card dropShadow className="layout-main-section p-6">
          <div className="flex border-b-2 pb-3">
            {rule?.thumbnail && (
              <div className="w-[175px] h-[175px] relative mr-4">
                <Image
                  src={rule.thumbnail}
                  alt="thumbnail image for the rule"
                  fill
                  className="object-cover object-center"
                />
              </div>
            )}
            <div className="flex flex-col flex-1 justify-between">
              <h1 className="text-ssw-red text-4xl leading-[1.2] my-0 b-4 font-semibold">
                {rule?.title}
              </h1>

              <div className="flex justify-between">
                <p className="mt-4 text-sm font-light">
                  Updated by <b>{rule?.lastUpdatedBy || "Unknown"}</b> {relativeTime}.{" "}
                  <a
                    href={`https://github.com/SSWConsulting/SSW.Rules.Content/commits/main/rules/${rule?.uri}/rule.md`}
                    target="_blank"
                    title={historyTooltip}
                    className="inline-flex items-center gap-1 font-semibold underline"
                  >
                    See history <RiHistoryLine />
                  </a>
                </p>

                <div className="flex items-center gap-4 text-2xl">
                  <Suspense fallback={<span className="opacity-50">...</span>}>
                    <Bookmark ruleGuid={rule?.guid || ''} />
                  </Suspense>
                  <IconLink
                    href={`/admin#/~/${sanitizedBasePath}/${rule?.uri}`}
                    title="Edit rule"
                    tooltipOpaque={true}
                  >
                    <RiPencilLine size={ICON_SIZE} />
                  </IconLink>
                  <IconLink
                    href={`https://github.com/SSWConsulting/SSW.Rules.Content/blob/main/rules/${rule?.uri}/rule.md`}
                    target="_blank"
                    title="View rule on GitHub"
                    tooltipOpaque={true}
                  >
                    <RiGithubLine size={ICON_SIZE} className="rule-icon" />
                  </IconLink>
                </div>
              </div>
            </div>
          </div>

          {rule?.isArchived && rule?.archivedreason && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-[var(--ssw-red)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[var(--ssw-red)] m-0 mb-1">
                    This rule has been archived
                  </h3>
                  <div className="text-sm text-[var(--ssw-red)] m-0"
                    dangerouslySetInnerHTML={{
                      __html: rule.archivedreason
                        ?.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--ssw-red)] underline hover:opacity-80">$1</a>')
                        ?.replace(/https?:\/\/[^\s]+/g, '<a href="$&" class="text-[var(--ssw-red)] underline hover:opacity-80">$&</a>')
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <TinaMarkdown content={rule?.body} components={getMarkdownComponentMapping(true)} />
          </div>

          <div className="hidden md:block">
            <hr className="my-6 mx-0" />
            <Discussion ruleGuid={rule?.guid || ""} />
          </div>
        </Card>

        <div className="layout-sidebar">
          <Card title="Categories">
            <div className="flex flex-wrap gap-4">
              {ruleCategoriesMapping?.map((category) => (
                <Link
                  key={category.uri}
                  href={`/${category.uri}`}
                  className="border-2 no-underline border-ssw-red text-ssw-red py-1 px-2 rounded-xs font-semibold hover:text-white hover:bg-ssw-red transition-colors duration-200"
                >
                  {category.title.replace(/^Rules to better\s*/i, "")}
                </Link>
              ))}
            </div>
          </Card>
          <Card title="Acknowledgements">
            <Acknowledgements authors={rule.authors} />
          </Card>
          <Card title="Related rules">
            {relatedRules.length > 0 ? (
              <ul className="pl-4">
                {relatedRules.map((r) => (
                  <li key={r.uri} className="not-last:mb-2">
                    <Link
                      href={`/${r.uri}`}
                      className="no-underline">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">No related rules.</div>
            )}
          </Card>
          <HelpCard />
          <div className="block md:hidden">
            <Discussion ruleGuid={rule?.guid || ''} />
          </div>
        </div>
      </div>
    </>
  );
}