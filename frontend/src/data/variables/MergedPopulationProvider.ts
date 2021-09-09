import { IDataFrame } from "data-forge";
import { getDataManager } from "../../utils/globals";
import { Breakdowns } from "../query/Breakdowns";
import { MetricQuery, MetricQueryResponse } from "../query/MetricQuery";
import VariableProvider from "./VariableProvider";
import { USA_DISPLAY_NAME, USA_FIPS } from "../utils/Fips";

function createNationalTotalWithoutStates(
  dataFrame: IDataFrame,
  breakdown: string,
  statesToIgnore: string[]
) {
  dataFrame = dataFrame.where((row) => !statesToIgnore.includes(row.fips));

  console.log(dataFrame.toArray());

  return dataFrame
    .pivot(breakdown, {
      fips: (series) => USA_FIPS,
      fips_name: (series) => USA_DISPLAY_NAME,
      population: (series) => series.sum(),
    })
    .resetIndex();
}

class MergedPopulationProvider extends VariableProvider {
  private statesToIgnore: string[];

  constructor(statesToIgnore: string[]) {
    super("merged_pop_provider", ["population", "population_pct"]);
    this.statesToIgnore = statesToIgnore;
  }

  // ALERT! KEEP IN SYNC! Make sure you update DataSourceMetadata if you update dataset IDs
  getDatasetId(breakdowns: Breakdowns): string {
    if (breakdowns.hasOnlyRace()) {
      return "merged_population_data-by_race_state";
    }

    if (breakdowns.hasOnlySex()) {
      return "merged_population_data-by_sex_state";
    }

    if (breakdowns.hasOnlyAge()) {
      return "merged_population_data-by_age_state";
    }
    throw new Error("Not implemented");
  }

  async getDataInternal(
    metricQuery: MetricQuery
  ): Promise<MetricQueryResponse> {
    const breakdowns = metricQuery.breakdowns;
    let df = await this.getDataInternalWithoutPercents(breakdowns);

    // Calculate population_pct based on total for breakdown
    // Exactly one breakdown should be enabled per allowsBreakdowns()
    const breakdownColumnName = breakdowns.getSoleDemographicBreakdown()
      .columnName;

    df = this.renameTotalToAll(df, breakdownColumnName);

    df = this.calculations.calculatePctShare(
      df,
      "population",
      "population_pct",
      breakdownColumnName,
      ["fips"]
    );

    df = this.applyDemographicBreakdownFilters(df, breakdowns);
    df = this.removeUnrequestedColumns(df, metricQuery);
    return new MetricQueryResponse(df.toArray(), [
      this.getDatasetId(breakdowns),
    ]);
  }

  private async getDataInternalWithoutPercents(
    breakdowns: Breakdowns
  ): Promise<IDataFrame> {
    const mergedPopDataset = await getDataManager().loadDataset(
      this.getDatasetId(breakdowns)
    );
    let mergedPopDataFrame = mergedPopDataset.toDataFrame();

    // If requested, filter geography by state or county level
    // We apply the geo filter right away to reduce subsequent calculation times
    mergedPopDataFrame = this.filterByGeo(mergedPopDataFrame, breakdowns);
    mergedPopDataFrame = this.renameGeoColumns(mergedPopDataFrame, breakdowns);

    return breakdowns.geography === "national"
      ? createNationalTotalWithoutStates(
          mergedPopDataFrame,
          breakdowns.getSoleDemographicBreakdown().columnName,
          this.statesToIgnore
        )
      : mergedPopDataFrame;
  }

  allowsBreakdowns(breakdowns: Breakdowns): boolean {
    return !breakdowns.time && breakdowns.hasExactlyOneDemographic();
  }
}

export default MergedPopulationProvider;
