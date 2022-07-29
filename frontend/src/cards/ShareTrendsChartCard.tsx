import React from "react";
import { CardContent } from "@material-ui/core";
import { Fips } from "../data/utils/Fips";
import {
  Breakdowns,
  BreakdownVar,
  BREAKDOWN_VAR_DISPLAY_NAMES,
} from "../data/query/Breakdowns";
import { MetricQuery } from "../data/query/MetricQuery";
import {
  // isPctType,
  MetricId,
  VariableConfig,
} from "../data/config/MetricConfig";
import CardWrapper from "./CardWrapper";
import { exclude } from "../data/query/BreakdownFilter";
import { LONGITUDINAL, NON_HISPANIC } from "../data/utils/Constants";
import MissingDataAlert from "./ui/MissingDataAlert";
import {
  getNestedUndueShares,
  getNestedUnknowns,
  splitIntoKnownsAndUnknowns,
} from "../data/utils/datasetutils";

/* minimize layout shift */
const PRELOAD_HEIGHT = 668;

export interface ShareTrendsChartCardProps {
  key?: string;
  breakdownVar: BreakdownVar;
  variableConfig: VariableConfig;
  fips: Fips;
}

// Intentionally removed key wrapper found in other cards as 2N prefers card not re-render
// and instead D3 will handle updates to the data
export function ShareTrendsChartCard(props: ShareTrendsChartCardProps) {
  const metricConfig = props.variableConfig.metrics["pct_share"];

  const metricIdsToFetch: MetricId[] = [metricConfig.metricId];

  if (metricConfig.populationComparisonMetric?.metricId)
    metricIdsToFetch.push(metricConfig.populationComparisonMetric.metricId);

  const breakdowns = Breakdowns.forFips(props.fips).addBreakdown(
    props.breakdownVar,
    exclude(NON_HISPANIC)
  );

  const query = new MetricQuery(metricIdsToFetch, breakdowns, LONGITUDINAL);

  function getTitleText() {
    return `${metricConfig.trendsCardTitleName} by ${
      BREAKDOWN_VAR_DISPLAY_NAMES[props.breakdownVar]
    } in ${props.fips.getSentenceDisplayName()}`;
  }
  function CardTitle() {
    return <>{getTitleText()}</>;
  }

  return (
    <CardWrapper
      queries={[query]}
      title={<CardTitle />}
      minHeight={PRELOAD_HEIGHT}
    >
      {([queryResponse]) => {
        const data = queryResponse.getValidRowsForField(metricConfig.metricId);
        const [knownData, unknownData] = splitIntoKnownsAndUnknowns(
          data,
          props.breakdownVar
        );

        console.log(metricConfig.populationComparisonMetric?.metricId);

        // TODO - can we make populationComparisonMetric a required field?
        const nestedData = getNestedUndueShares(
          knownData,
          props.breakdownVar,
          metricConfig.metricId,
          metricConfig.populationComparisonMetric!.metricId
        );
        const nestedUnknowns = getNestedUnknowns(
          unknownData,
          metricConfig.metricId
        );

        return (
          <CardContent>
            {queryResponse.shouldShowMissingDataMessage([
              metricConfig.metricId,
            ]) ? (
              <>
                <MissingDataAlert
                  dataName={metricConfig.fullCardTitleName}
                  breakdownString={
                    BREAKDOWN_VAR_DISPLAY_NAMES[props.breakdownVar]
                  }
                  fips={props.fips}
                />
              </>
            ) : (
              <div>
                {/* 2N INCIDENCE RATE TRENDS VIZ COMPONENT HERE */}
                {/* {console.log("KNOWN PCT SHARES", knownData)}

                {console.log("UNKNOWN PCT SHARE", unknownData)} */}

                <b>Undue Share of Condition</b>
                {nestedData.map((group) => {
                  return (
                    <>
                      <pre>{JSON.stringify(group)}</pre>
                    </>
                  );
                })}
                <b>Unknowns</b>
                <pre>{JSON.stringify(nestedUnknowns)}</pre>
              </div>
            )}
          </CardContent>
        );
      }}
    </CardWrapper>
  );
}
