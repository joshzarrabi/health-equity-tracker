import { DataFrame } from "data-forge";
import { getDataManager } from "../../utils/globals";
import { Breakdowns } from "../query/Breakdowns";
import { MetricQuery, MetricQueryResponse } from "../query/MetricQuery";
import { joinOnCols } from "../utils/datasetutils";
import AcsPopulationProvider from "./AcsPopulationProvider";
import VariableProvider from "./VariableProvider";

class VaccineProvider extends VariableProvider {
  private acsProvider: AcsPopulationProvider;

  constructor(acsProvider: AcsPopulationProvider) {
    super("vaccine_provider", [
      "vaccinated_pct_share",
      "vaccinated_share_of_known",
      "vaccinated_per_100k",
      "vaccine_population_pct",
    ]);
    this.acsProvider = acsProvider;
  }

  getDatasetId(breakdowns: Breakdowns): string {
    if (breakdowns.geography === "national") {
      return (
        "cdc_vaccination_national-" +
        breakdowns.getSoleDemographicBreakdown().columnName
      );
    } else if (
      breakdowns.geography === "state" &&
      breakdowns.getSoleDemographicBreakdown().columnName ===
        "race_and_ethnicity"
    ) {
      return "kff_vaccination-race_and_ethnicity";
    }

    return "";
  }

  async getDataInternal(
    metricQuery: MetricQuery
  ): Promise<MetricQueryResponse> {
    const breakdowns = metricQuery.breakdowns;

    const datasetId = this.getDatasetId(breakdowns);
    const vaxData = await getDataManager().loadDataset(datasetId);
    let df = vaxData.toDataFrame();

    const breakdownColumnName = breakdowns.getSoleDemographicBreakdown()
      .columnName;

    df = this.filterByGeo(df, breakdowns);
    df = this.renameGeoColumns(df, breakdowns);
    df = this.renameTotalToAll(df, breakdownColumnName);

    let acsBreakdowns = breakdowns.copy();
    acsBreakdowns.time = false;

    let consumedDatasetIds = [datasetId];

    const acsQueryResponse = await this.acsProvider.getData(
      new MetricQuery(["population", "population_pct"], acsBreakdowns)
    );

    consumedDatasetIds = consumedDatasetIds.concat(
      acsQueryResponse.consumedDatasetIds
    );

    const acs = new DataFrame(acsQueryResponse.data);
    df = joinOnCols(df, acs, ["fips", breakdownColumnName], "left");

    df = df.renameSeries({
      population_pct: "vaccine_population_pct",
    });

    if (breakdowns.geography === "national") {
      df = df.generateSeries({
        vaccinated_per_100k: (row) =>
          this.calculations.per100k(row.vaccinated_first_dose, row.population),
      });

      // Calculate any share_of_known metrics that may have been requested in the query
      if (this.allowsBreakdowns(breakdowns)) {
        df = this.calculations.calculatePctShare(
          df,
          "vaccinated_first_dose",
          "vaccinated_pct_share",
          breakdownColumnName,
          ["fips"]
        );

        df = this.calculations.calculatePctShareOfKnown(
          df,
          "vaccinated_first_dose",
          "vaccinated_share_of_known",
          breakdownColumnName
        );
      }
    } else if (breakdowns.geography === "state") {
      df = df.generateSeries({
        vaccinated_per_100k: (row) =>
          isNaN(row.vaccinated_pct) || row.vaccinated_pct == null
            ? null
            : row.vaccinated_pct * 1000 * 100,
      });

      df = df
        .generateSeries({
          vaccinated_pct_share: (row) =>
            row.vaccinated_pct_share == null || isNaN(row.vaccinated_pct_share)
              ? null
              : Math.round(row.vaccinated_pct_share * 100),
        })
        .resetIndex();

      df = df
        .generateSeries({
          vaccinated_share_of_known: (row) => row["vaccinated_pct_share"],
        })
        .resetIndex();
    }

    df = df.dropSeries(["population"]).resetIndex();

    df = this.applyDemographicBreakdownFilters(df, breakdowns);
    df = this.removeUnrequestedColumns(df, metricQuery);
    return new MetricQueryResponse(df.toArray(), consumedDatasetIds);
  }

  allowsBreakdowns(breakdowns: Breakdowns): boolean {
    const validDemographicBreakdownRequest =
      !breakdowns.time && breakdowns.hasExactlyOneDemographic();

    return (
      (breakdowns.geography === "national" ||
        (breakdowns.geography === "state" &&
          breakdowns.getSoleDemographicBreakdown().columnName ===
            "race_and_ethnicity")) &&
      validDemographicBreakdownRequest
    );
  }
}

export default VaccineProvider;
