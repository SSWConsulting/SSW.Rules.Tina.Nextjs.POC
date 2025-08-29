import { LatestRulesQueryQuery } from "@/tina/__generated__/types";

export type LatestRule = NonNullable<NonNullable<LatestRulesQueryQuery['ruleConnection']['edges']>[0]>['node'];