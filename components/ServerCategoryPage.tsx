import Link from "next/link";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import MarkdownComponentMapping from "@/components/tina-markdown/markdown-component-mapping";
import Breadcrumbs from "@/components/Breadcrumbs";
import { IconLink } from "@/components/ui";
import { ICON_SIZE } from "@/constants";
import { RiPencilLine, RiGithubLine } from "react-icons/ri";
import RuleList from "./rule-list/rule-list";

interface ServerCategoryPageProps {
  category: any;
  path?: string;
  includeArchived: boolean;
  view: 'titleOnly' | 'blurb' | 'all';
  page: number;
  perPage: number;
}

export default function ServerCategoryPage({
  category,
  path,
  includeArchived,
  view,
  page,
  perPage,
}: ServerCategoryPageProps) {
  const title = category?.title ?? '';
  const baseRules: any[] = Array.isArray(category?.index)
    ? category.index.flatMap((i: any) => i?.rule ? [i.rule] : [])
    : [];

  const activeRules = baseRules.filter((r) => r?.isArchived !== true);
  const archivedRules = baseRules.filter((r) => r?.isArchived === true);
  const finalRules = includeArchived ? [...activeRules, ...archivedRules] : activeRules;

  const sidebarRules = finalRules.map((r) => ({ guid: r.guid, uri: r.uri, title: r.title }));

  const sanitizedBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\/+/, '');

  return (
    <div>
      <Breadcrumbs isCategory breadcrumbText={includeArchived ? `Archived Rules - ${title}` : title} />
      <div className="flex">
        <div className="w-full lg:w-2/3 bg-white pt-4 p-6 border border-[#CCC] rounded shadow-lg">
          <h1 className="m-0 mb-2 text-ssw-red font-bold">
            {includeArchived ? `Archived Rules - ${title}` : title}
          </h1>

          <div className="flex gap-2 justify-center my-2 md:hidden">
            <IconLink
              href={`admin/index.html#/collections/edit/category/${path?.slice(0, -4)}`}
              title="Edit category"
              tooltipOpaque={true}
            >
              <RiPencilLine size={ICON_SIZE} />
            </IconLink>
            <IconLink
              href={`https://github.com/SSWConsulting/SSW.Rules.Content/blob/${process.env.NEXT_PUBLIC_TINA_BRANCH}/categories/${path}`}
              target="_blank"
              title="View category on GitHub"
              tooltipOpaque={true}
            >
              <RiGithubLine size={ICON_SIZE} className="rule-icon" />
            </IconLink>
          </div>

          <div className="text-md">
            <TinaMarkdown content={category?.body} components={MarkdownComponentMapping} />
          </div>

          {/* <RuleList
            categoryUri={path}
            rules={finalRules}
            view={view}
            page={page}
            perPage={perPage}
            includeArchived={includeArchived}
            showFilterControls={true}
          /> */}
        </div>

        <div className="hidden lg:block lg:w-1/3 p-6 pr-0">
          <ol className="border-l-3 border-gray-300 pl-6">
            {sidebarRules.map((rule, index) => (
              <li key={`sidebar-${rule.guid}-${index}`} className="py-1 ml-4">
                <Link href={`/${rule.uri}`} className="text-gray-700 hover:text-ssw-red">
                  {rule.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
