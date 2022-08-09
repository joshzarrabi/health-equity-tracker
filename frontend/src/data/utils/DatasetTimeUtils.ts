import { MetricId } from "../config/MetricConfig";
import { BreakdownVar } from "../query/Breakdowns";
import { DemographicGroup, TIME_PERIOD } from "./Constants";
import { Row } from "./DatasetTypes";
import { shortenNH } from "./datasetutils";

const MONTHLY_LENGTH = 7;
const YEARLY_LENGTH = 4;

/*

Nesting table data into time-series data needed by D3:

Currently BigQuery data is stored in json "rows" where every "column" name is present as a key to that location's value

D3 requires the data in a different format, as a series of nested arrays, per demographic group, per time_period

Before (Table / Vega) Example:

[
  {
    "sex": "male",
    "jail_per_100k": 3000,
    "time_period": "2020"
  },
  {
    "sex": "male",
    "jail_per_100k": 2000,
    "time_period": "2021"
  },
  {
    "sex": "female",
    "jail_per_100k": 300,
    "time_period": "2020"
  },
  {
    "sex": "female",
    "jail_per_100k": 200,
    "time_period": "2021"
  }
]

After (Time-Series / D3) Example:

[
  ["male", [["2020", 3000],["2021", 2000]]],
  ["female", [["2020", 300],["2021", 200]]1]
]

*/

export function generateConsecutivePeriods(data: Row[]): string[] {
  // scan dataset for earliest and latest time_period
  const shippedTimePeriods = data.map((row) => row.time_period).sort();
  const minPeriod = shippedTimePeriods[0];
  const maxPeriod = shippedTimePeriods[shippedTimePeriods.length - 1];
  let consecutivePeriods = [];

  // can only plot based on the least specific time periods.
  // However, all "time_periods" should already be same TimeUnit from backend
  const leastPeriodChars = Math.min(
    ...(shippedTimePeriods.map((period) => period.length) as number[])
  );

  if (leastPeriodChars === MONTHLY_LENGTH) {
    let currentPeriod = minPeriod;
    while (currentPeriod <= maxPeriod) {
      consecutivePeriods.push(currentPeriod);
      let [yyyy, mm]: string[] = currentPeriod.split("-");
      let nextMonth: number = +mm + 1;
      if (+nextMonth === 13) {
        yyyy = (+yyyy + 1).toString();
        mm = "01";
      } else mm = nextMonth.toString().padStart(2, "0");
      currentPeriod = `${yyyy}-${mm}`;
    }
  } else if (leastPeriodChars === YEARLY_LENGTH) {
    let currentPeriod = minPeriod;
    while (currentPeriod <= maxPeriod) {
      consecutivePeriods.push(currentPeriod);
      currentPeriod = (+currentPeriod + 1).toString();
    }
  }

  return consecutivePeriods;
}

export type TimeSeries = [Date, number][];
export type GroupTrendData = [DemographicGroup, TimeSeries][];
export type TrendsData = GroupTrendData[];
export type UnknownTrendData = TimeSeries;

// Some datasets are missing data points at certain time periods
// This function rebuilds the dataset ensuring a row for every time period
// between the earliest and latest date, interpolating nulls as needed
// At this point, data has already been filtered to a single demographic group in a single Fips location and those fields are irrelevant
export function interpolateTimePeriods(data: Row[]) {
  const consecutivePeriods = generateConsecutivePeriods(data);
  const interpolatedData = [];

  for (const timePeriod of consecutivePeriods) {
    const shippedRow = data.find((row) => row.time_period === timePeriod);

    if (shippedRow) interpolatedData.push(shippedRow);
    else interpolatedData.push({ time_period: timePeriod });
  }

  return interpolatedData;
}

export function getNestedRates(
  data: Row[],
  demographicGroups: DemographicGroup[],
  currentBreakdown: BreakdownVar,
  metricId: MetricId
): TrendsData {
  if (!data.some((row) => row[TIME_PERIOD])) return [];

  const nestedRates = demographicGroups.map((group) => {
    let groupRows = data.filter((row) => row[currentBreakdown] === group);
    groupRows = interpolateTimePeriods(groupRows);

    const groupTimeSeries = groupRows.map((row) => [
      row[TIME_PERIOD],
      row[metricId] != null ? row[metricId] : null,
    ]);

    // TODO: switch "(Non-Hispanic)" to "NH" on backend and remove this fn
    return [shortenNH(group), groupTimeSeries] as GroupTrendData;
  });

  return nestedRates;
}

export function getNestedUndueShares(
  data: Row[],
  demographicGroups: DemographicGroup[],
  currentBreakdown: BreakdownVar,
  conditionPctShareId: MetricId,
  popPctShareId: MetricId
): TrendsData {
  if (!data.some((row) => row[TIME_PERIOD])) return [];

  const nestedPctUndue = demographicGroups.map((group) => {
    let groupRows = data.filter((row) => row[currentBreakdown] === group);
    groupRows = interpolateTimePeriods(groupRows);

    const groupTimeSeries = groupRows.map((row) => {
      let diff = null;
      if (row[conditionPctShareId] != null && row[popPctShareId] != null) {
        diff = row[conditionPctShareId] / row[popPctShareId];
      }
      return [row[TIME_PERIOD], diff];
    });
    return [shortenNH(group), groupTimeSeries] as GroupTrendData;
  });

  console.log(nestedPctUndue);

  return nestedPctUndue;
}

export function getNestedUnknowns(
  unknownsData: Row[],
  metricId: MetricId
): UnknownTrendData {
  if (!unknownsData.some((row) => row[TIME_PERIOD])) return [];
  unknownsData = interpolateTimePeriods(unknownsData);
  return unknownsData.map((row) => [row[TIME_PERIOD], row[metricId]]);
}
