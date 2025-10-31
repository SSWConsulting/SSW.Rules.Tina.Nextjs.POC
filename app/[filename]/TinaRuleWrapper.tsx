"use client";

import { ServerRulePageProps } from "./ServerRulePage";
import { useTina } from "tinacms/dist/react";
import ServerRulePage from "./ServerRulePage";

export type TinaRuleProps = {  
  serverRulePageProps: ServerRulePageProps;
  tinaQueryProps: any;
};

export function TinaRuleWrapper({ serverRulePageProps, tinaQueryProps }: TinaRuleProps) {
  const { data } = useTina({
    query: tinaQueryProps.query,
    variables: tinaQueryProps.variables,
    data: tinaQueryProps.data,
  });

  return <ServerRulePage tinaProps={{ data }} serverRulePageProps={serverRulePageProps} />;
}
