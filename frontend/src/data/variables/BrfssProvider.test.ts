import BrfssProvider from "./BrfssProvider";
import AcsPopulationProvider from "./AcsPopulationProvider";
import { Breakdowns } from "../query/Breakdowns";
import { Fips } from "../utils/Fips";
import { FakeDatasetMetadataMap } from "../config/FakeDatasetMetadata";
import {
  autoInitGlobals,
  getDataFetcher,
  resetCacheDebug,
} from "../../utils/globals";
import FakeDataFetcher from "../../testing/FakeDataFetcher";
import {
  createWithAndWithoutAllEvaluator,
  FipsSpec,
  NC,
  AL,
  USA,
} from "./TestUtils";
import { WHITE_NH, ASIAN_NH, ALL, RACE } from "../utils/Constants";

autoInitGlobals();
const dataFetcher = getDataFetcher() as FakeDataFetcher;

function finalRow(
  fips: FipsSpec,
  breakdownName: string,
  breakdownValue: string,
  diabetes_count: number,
  diabetes_per_100k: number
) {
  return {
    [breakdownName]: breakdownValue,
    fips: fips.code,
    fips_name: fips.name,
    diabetes_count: diabetes_count,
    diabetes_per_100k: diabetes_per_100k,
  };
}

function stateRow(
  fips: FipsSpec,
  breakdownName: string,
  breakdownValue: string,
  copd_count: number,
  copd_no: number,
  diabetes_count: number,
  diabetes_no: number,
  population: number
) {
  return [
    {
      [breakdownName]: breakdownValue,
      state_fips: fips.code,
      state_name: fips.name,
      copd_count: copd_count,
      copd_no: copd_no,
      diabetes_count: diabetes_count,
      diabetes_no: diabetes_no,
    },
    {
      state_fips: fips.code,
      state_name: fips.name,
      race_and_ethnicity: breakdownValue,
      population: population,
    },
  ];
}

const acsProvider = new AcsPopulationProvider();
const evaluateDiabetesCountAndPer100kWithAndWithoutAll = createWithAndWithoutAllEvaluator(
  /*metricIds=*/ ["diabetes_count", "diabetes_per_100k"],
  dataFetcher,
  new BrfssProvider(acsProvider)
);

describe("BrfssProvider", () => {
  beforeEach(() => {
    resetCacheDebug();
    dataFetcher.resetState();
    dataFetcher.setFakeMetadataLoaded(FakeDatasetMetadataMap);
  });

  test("State and Race Breakdown", async () => {
    // Create raw rows with copd_count, copd_no, diabetes_count & diabetes_no

    const [AL_ASIAN_ROW, AL_ACS_ASIAN_ROW] = stateRow(
      AL,
      RACE,
      ASIAN_NH,
      100,
      900,
      200,
      800,
      5000
    );

    const [NC_ASIAN_ROW, NC_ACS_ASIAN_ROW] = stateRow(
      NC,
      RACE,
      ASIAN_NH,
      100,
      900,
      400,
      600,
      5000
    );

    const [NC_WHITE_ROW, NC_ACS_WHITE_ROW] = stateRow(
      NC,
      RACE,
      WHITE_NH,
      500,
      500,
      600,
      400,
      5000
    );

    const rawData = [AL_ASIAN_ROW, NC_ASIAN_ROW, NC_WHITE_ROW];

    const rawAcsData = [AL_ACS_ASIAN_ROW, NC_ACS_ASIAN_ROW, NC_ACS_WHITE_ROW];

    // Create final rows with diabetes_count & diabetes_per_100k
    const NC_ASIAN_FINAL = finalRow(NC, RACE, ASIAN_NH, 400, 40000);
    const NC_WHITE_FINAL = finalRow(NC, RACE, WHITE_NH, 600, 60000);
    const NC_ALL_FINAL = finalRow(NC, RACE, ALL, 1000, 50000);

    await evaluateDiabetesCountAndPer100kWithAndWithoutAll(
      "brfss",
      rawData,
      Breakdowns.forFips(new Fips("37")),
      RACE,
      [NC_ASIAN_FINAL, NC_WHITE_FINAL],
      [NC_ALL_FINAL, NC_ASIAN_FINAL, NC_WHITE_FINAL]
    );
  });

  // test("National and Race Breakdown", async () => {
  //   // Create raw rows with copd_count, copd_no, diabetes_count & diabetes_no
  //   const rawData = [
  //     stateRow(AL, RACE, ASIAN_NH, 100, 900, 200, 800),
  //     stateRow(NC, RACE, ASIAN_NH, 100, 900, 400, 600),
  //     stateRow(NC, RACE, WHITE_NH, 500, 500, 600, 400),
  //   ];

  //   // Create final rows with diabetes_count & diabetes_per_100k
  //   const ASIAN_FINAL = finalRow(USA, RACE, ASIAN_NH, 600, 30000);
  //   const WHITE_FINAL = finalRow(USA, RACE, WHITE_NH, 600, 60000);
  //   const ALL_FINAL = finalRow(USA, RACE, ALL, 1200, 40000);

  //   await evaluateDiabetesCountAndPer100kWithAndWithoutAll(
  //     "brfss",
  //     rawData,
  //     Breakdowns.national(),
  //     RACE,
  //     [ASIAN_FINAL, WHITE_FINAL],
  //     [ALL_FINAL, ASIAN_FINAL, WHITE_FINAL]
  //   );
  // });
});
