/* External Imports */
import React, { Fragment } from "react";
import { timeFormat, descending, max, min } from "d3";

/* Local Imports */

/* Styles */
import styles from "./Trends.module.scss";

/* Components */

/* Constants */
import { TrendsData, ColorScale, GroupData, GroupValues } from "./types";
import { TYPES } from "./constants";

/* Helpers */

/* Define type interface */
export interface TooltipProps {
  data: TrendsData;
  selectedDate: string;
  selectedGroups: string[];
  colors: ColorScale;
  type: string;
}

/* Render component */
export function Tooltip({
  data,
  selectedDate,
  selectedGroups,
  colors,
  type,
}: TooltipProps) {
  function getMaxNumber() {
    const numbers = data.flatMap(([group, d]) =>
      d.map(([date, number]) => Math.abs(number))
    );
    // console.log(numbers)
    console.log(max(numbers));
    return max(numbers);
  }

  function getDeltaByDate(d: GroupValues) {
    const [, delta] = d.find(([date]) => date === selectedDate) || [0, 0];
    return delta;
  }

  function sortDataDescending(d: TrendsData) {
    return (
      d.sort(([, aData]: GroupData, [group, bData]: GroupData) =>
        descending(getDeltaByDate(aData), getDeltaByDate(bData))
      ) || d
    );
  }

  const codeDictionary = {
    "Native Hawaiian and Pacific Islander (Non-Hispanic)": "NHPI",
    "Hispanic or Latino": "HISP",
    All: "ALL",
    "American Indian and Alaska Native (Non-Hispanic)": "AIAN",
    "Black or African American (Non-Hispanic)": "BLACK",
    "Two or more races & Unrepresented race (Non-Hispanic)": "MORE",
    "White (Non-Hispanic)": "WHITE",
    "Asian (Non-Hispanic)": "ASIAN",
  };

  const TYPE_CONFIG = {
    [TYPES.HUNDRED_K]: {
      UNIT: " per 100k",
      width: (d) => (getDeltaByDate(d) / (getMaxNumber() || 1)) * 100,
      translate_x: (d) => 0,
    },
    [TYPES.PERCENT_SHARE]: {
      UNIT: " %",
      width: (d) => {
        console.log(Math.abs(getDeltaByDate(d)) / (getMaxNumber() || 1));
        console.log((Math.abs(getDeltaByDate(d)) / (getMaxNumber() || 1)) * 50);
        return (Math.abs(getDeltaByDate(d)) / (getMaxNumber() || 1)) * 50;
      },
      translate_x: (d) =>
        getDeltaByDate(d) > 0
          ? 50
          : 50 + (getDeltaByDate(d) / (getMaxNumber() || 1)) * 50,
    },
  };

  return (
    <div className={styles.Tooltip}>
      {/* Date title */}
      <div className={styles.title}>
        {timeFormat("%B %e, %Y")(new Date(selectedDate))}
      </div>
      <div className={styles.grid}>
        {data &&
          sortDataDescending(data).map(([group, d]: GroupData) => (
            <Fragment key={`tooltipRow-${group}`}>
              <div>{codeDictionary[group]}</div>
              <div
                style={{
                  backgroundColor: colors(group),
                  width: TYPE_CONFIG[type]?.width(d),
                  transform: `translateX(${TYPE_CONFIG[type]?.translate_x(
                    d
                  )}px)`,
                }}
                className={styles.bar}
              />
              <div className={styles.label}>
                {getDeltaByDate(d)?.toFixed(2)}
                <span>{TYPE_CONFIG[type]?.UNIT}</span>
              </div>
            </Fragment>
          ))}
      </div>
    </div>
  );
}
