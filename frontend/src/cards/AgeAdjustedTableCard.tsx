import React from "react";
import { AgeAdjustedTableChart } from "../charts/AgeAdjustedTableChart";
import CardWrapper from "./CardWrapper";
import { MetricQuery } from "../data/query/MetricQuery";
import { Fips } from "../data/utils/Fips";
import {
  Breakdowns,
  BREAKDOWN_VAR_DISPLAY_NAMES,
} from "../data/query/Breakdowns";
import { CardContent } from "@material-ui/core";
import {
  MetricConfig,
  MetricId,
  VariableConfig,
  getAgeAdjustedRatioMetric,
  DropdownVarId,
  METRIC_CONFIG,
} from "../data/config/MetricConfig";
import { exclude } from "../data/query/BreakdownFilter";
import {
  NON_HISPANIC,
  RACE,
  UNKNOWN,
  UNKNOWN_RACE,
  UNKNOWN_ETHNICITY,
  ALL,
} from "../data/utils/Constants";
import { Row } from "../data/utils/DatasetTypes";
import Alert from "@material-ui/lab/Alert";
import Divider from "@material-ui/core/Divider";
import styles from "./Card.module.scss";
import MissingDataAlert from "./ui/MissingDataAlert";
import {
  COVID_DEATHS_US_SETTING,
  COVID_HOSP_US_SETTING,
} from "../utils/urlutils";

type DataTypeLink = {
  dataType: string;
  url: string;
};

export const ageAdjustedDataTypeMap: Record<string, DataTypeLink[]> = {
  covid: [
    { dataType: "COVID-19 Hospitalizations", url: COVID_HOSP_US_SETTING },
    { dataType: "COVID-19 Deaths", url: COVID_DEATHS_US_SETTING },
  ],
};

/* minimize layout shift */
const PRELOAD_HEIGHT = 800;

export interface AgeAdjustedTableCardProps {
  fips: Fips;
  variableConfig: VariableConfig;
  dropdownVarId?: DropdownVarId;
  setVariableConfigWithParam?: Function;
}

export function AgeAdjustedTableCard(props: AgeAdjustedTableCardProps) {
  const metrics = getAgeAdjustedRatioMetric(props.variableConfig);

  // choose demographic groups to exclude from the table
  const exclusionList = [ALL, NON_HISPANIC];

  const breakdowns = Breakdowns.forFips(props.fips).addBreakdown(
    RACE,
    exclude(...exclusionList)
  );

  let metricConfigs: Record<string, MetricConfig> = {};
  metrics.forEach((metricConfig) => {
    metricConfigs[metricConfig.metricId] = metricConfig;
  });

  const metricIds = Object.keys(metricConfigs) as MetricId[];
  const query = new MetricQuery(metricIds as MetricId[], breakdowns);
  const ratioId = metricIds[0];

  const cardTitle = (
    <>{`Age-Adjusted Ratio of ${
      props.variableConfig.variableFullDisplayName
    } in ${props.fips.getFullDisplayName()}`}</>
  );

  return (
    <CardWrapper minHeight={PRELOAD_HEIGHT} queries={[query]} title={cardTitle}>
      {([queryResponse]) => {
        let dataWithoutUnknowns = queryResponse.data.filter((row: Row) => {
          return (
            row[RACE] !== UNKNOWN &&
            row[RACE] !== UNKNOWN_RACE &&
            row[RACE] !== UNKNOWN_ETHNICITY
          );
        });
        const noRatios = dataWithoutUnknowns.every(
          (row) => row[ratioId] === undefined
        );
        return (
          <>
            <CardContent>
              {/* Always show info on what age-adj is */}
              <Alert severity="info" role="note">
                Age-adjustment is a technique to remove the effect of
                differences in the underlying age distribution of two
                populations (in our case, racial groups compared to White,
                Non-Hispanic individuals) when comparing rates of incidence.
                This is extremely important for conditions where age is a large
                risk factor, e.g. the risk of dying with Covid increases
                non-linearly with age. Age-adjustment allows us to compute rates
                that are normalized for age, painting a more accurate picture of
                health inequities.{" "}
                <a href="https://healthequitytracker.org">
                  Learn how we calculated these age-adjusted ratios
                </a>
              </Alert>
            </CardContent>

            <Divider />

            {/*  Values are null; implying they could be age-adjusted but aren't  */}
            {queryResponse.shouldShowMissingDataMessage(
              metricIds as MetricId[]
            ) && (
              <CardContent>
                <MissingDataAlert
                  dataName={
                    props.variableConfig.metrics.age_adjusted_ratio
                      .fullCardTitleName + " "
                  }
                  breakdownString={BREAKDOWN_VAR_DISPLAY_NAMES[RACE]}
                  fips={props.fips}
                />
              </CardContent>
            )}

            {/* Values are intentionally undefined; implying they can't/won't be age-adjusted */}
            {!queryResponse.shouldShowMissingDataMessage(
              metricIds as MetricId[]
            ) &&
              noRatios && (
                <CardContent>
                  <Alert severity="warning" role="note">
                    Because outcomes for{" "}
                    <b>{props.variableConfig.variableFullDisplayName}</b> are
                    not heavily influenced by age, we do not provide
                    age-adjusted numbers.{" "}
                    <AgeAdjustedDataTypeLinksMessage
                      setVariableConfigWithParam={
                        props.setVariableConfigWithParam
                      }
                      links={ageAdjustedDataTypeMap[props.dropdownVarId!]}
                    />
                  </Alert>
                </CardContent>
              )}

            {/* values are present or partially null, implying we have at least some age-adjustments */}
            {!queryResponse.dataIsMissing() && !noRatios && (
              <div className={styles.TableChart}>
                <AgeAdjustedTableChart
                  data={dataWithoutUnknowns}
                  metrics={Object.values(metricConfigs)}
                />
              </div>
            )}
          </>
        );
      }}
    </CardWrapper>
  );
}

interface AgeAdjustedDataTypeLinksMessageProps {
  links: DataTypeLink[];
  setVariableConfigWithParam?: any;
}

function AgeAdjustedDataTypeLinksMessage(
  props: AgeAdjustedDataTypeLinksMessageProps
) {
  if (!props.links || props.links?.length === 0) return <></>;

  return (
    <>
      Age-adjusted ratios are currently only available for the following data
      types:{" "}
      {props.links.map((link, i) => (
        <>
          <button
            onClick={() =>
              props.setVariableConfigWithParam(METRIC_CONFIG["covid"][2])
            }
          >
            {" "}
            <b>{link.dataType}</b>
          </button>
          {i < props.links.length - 1 && ", "}
        </>
      ))}
    </>
  );
}
