import React, { useRef, useEffect } from "react";
import { VariableDisparityReport } from "./VariableDisparityReport";
import TwoVariableReport from "./TwoVariableReport";
import {
  MadLib,
  getMadLibWithUpdatedValue,
  DropdownVarId,
  MadLibId,
  getMadLibPhraseText,
} from "../utils/MadLibs";
import { Fips } from "../data/utils/Fips";
import {
  LinkWithStickyParams,
  DATA_CATALOG_PAGE_LINK,
  CONTACT_TAB_LINK,
  METHODOLOGY_TAB_LINK,
} from "../utils/urlutils";
import Button from "@material-ui/core/Button";
import ArrowForward from "@material-ui/icons/ArrowForward";
import styles from "./Report.module.scss";
import DisclaimerAlert from "./ui/DisclaimerAlert";
import { VACCINATED_DEF } from "../pages/DataCatalog/MethodologyTab";
import { METRIC_CONFIG } from "../data/config/MetricConfig";
import { Link } from "react-router-dom";
import FeedbackBox from "../pages/ui/FeedbackBox";
import ShareButtons from "./ui/ShareButtons";
import { Helmet } from "react-helmet-async";
import { urlMap } from "../utils/externalUrls";

export const SINGLE_COLUMN_WIDTH = 12;

function getPhraseValue(madLib: MadLib, segmentIndex: number): string {
  const segment = madLib.phrase[segmentIndex];
  return typeof segment === "string"
    ? segment
    : madLib.activeSelections[segmentIndex];
}

interface ReportProviderProps {
  isSingleColumn: boolean;
  madLib: MadLib;
  setMadLib: Function;
  doScrollToData?: boolean;
}

function ReportProvider(props: ReportProviderProps) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const definitionsRef = useRef<HTMLInputElement>(null);

  const reportWrapper = props.isSingleColumn
    ? styles.OneColumnReportWrapper
    : styles.TwoColumnReportWrapper;

  // internal page links
  function jumpToDefinitions() {
    if (definitionsRef.current) {
      definitionsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }
  function jumpToData() {
    if (fieldRef.current) {
      fieldRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }

  // handle incoming #missingDataLink link request, only on page load
  useEffect(() => {
    if (props.doScrollToData) {
      jumpToData();
      // remove hash from URL
      // eslint-disable-next-line no-restricted-globals
      history.pushState(
        "",
        document.title,
        window.location.pathname + window.location.search
      );
    }
  }, [props.doScrollToData]);

  function getReport() {
    // Each report has a unique key based on its props so it will create a
    // new instance and reset its state when the provided props change.
    switch (props.madLib.id as MadLibId) {
      case "disparity":
        const dropdownOption = getPhraseValue(props.madLib, 1);
        return (
          <VariableDisparityReport
            jumpToDefinitions={jumpToDefinitions}
            jumpToData={jumpToData}
            key={dropdownOption}
            dropdownVarId={dropdownOption as DropdownVarId}
            fips={new Fips(getPhraseValue(props.madLib, 3))}
            updateFipsCallback={(fips: Fips) =>
              props.setMadLib(
                getMadLibWithUpdatedValue(props.madLib, 3, fips.code)
              )
            }
          />
        );
      case "comparegeos":
        const compareDisparityVariable = getPhraseValue(props.madLib, 1);
        const fipsCode1 = getPhraseValue(props.madLib, 3);
        const fipsCode2 = getPhraseValue(props.madLib, 5);
        return (
          <TwoVariableReport
            jumpToDefinitions={jumpToDefinitions}
            jumpToData={jumpToData}
            key={compareDisparityVariable + fipsCode1 + fipsCode2}
            dropdownVarId1={compareDisparityVariable as DropdownVarId}
            dropdownVarId2={compareDisparityVariable as DropdownVarId}
            fips1={new Fips(fipsCode1)}
            fips2={new Fips(fipsCode2)}
            updateFips1Callback={(fips: Fips) =>
              props.setMadLib(
                getMadLibWithUpdatedValue(props.madLib, 3, fips.code)
              )
            }
            updateFips2Callback={(fips: Fips) =>
              props.setMadLib(
                getMadLibWithUpdatedValue(props.madLib, 5, fips.code)
              )
            }
          />
        );
      case "comparevars":
        const compareDisparityVariable1 = getPhraseValue(props.madLib, 1);
        const compareDisparityVariable2 = getPhraseValue(props.madLib, 3);
        const fipsCode = getPhraseValue(props.madLib, 5);
        const updateFips = (fips: Fips) =>
          props.setMadLib(
            getMadLibWithUpdatedValue(props.madLib, 5, fips.code)
          );
        return (
          <TwoVariableReport
            jumpToDefinitions={jumpToDefinitions}
            jumpToData={jumpToData}
            key={
              compareDisparityVariable1 + compareDisparityVariable2 + fipsCode
            }
            dropdownVarId1={compareDisparityVariable1 as DropdownVarId}
            dropdownVarId2={compareDisparityVariable2 as DropdownVarId}
            fips1={new Fips(fipsCode)}
            fips2={new Fips(fipsCode)}
            updateFips1Callback={updateFips}
            updateFips2Callback={updateFips}
          />
        );
      default:
        return <p>Report not found</p>;
    }
  }

  return (
    <>
      <Helmet>
        <title>
          {getMadLibPhraseText(props.madLib)} - Health Equity Tracker
        </title>
      </Helmet>
      <div className={reportWrapper}>
        <ShareButtons madLib={props.madLib} />
        <DisclaimerAlert jumpToData={jumpToData} />
        {getReport()}
      </div>
      <div className={styles.MissingDataContainer}>
        <aside
          id="missingDataInfo"
          ref={fieldRef}
          className={styles.MissingDataInfo}
        >
          <h3 className={styles.FootnoteLargeHeading}>
            What Data Are Missing?
          </h3>
          <p>Unfortunately there are crucial data missing in our sources.</p>
          <h4>Missing and Misidentified People</h4>
          <p>
            Currently, there are no required or standardized race and ethnicity
            categories for data collection across state and local jurisdictions.
            The most notable gaps exist for race and ethnic groups, physical and
            mental health status, and sex categories. Many states do not record
            data for <b>American Indian</b>, <b>Alaska Native</b>,{" "}
            <b>Native Hawaiian and Pacific Islander</b> racial categories,
            lumping these people into other groups. Individuals who identify as{" "}
            <b>Hispanic/Latino</b> may not be recorded in their respective race
            category. Neither disability nor mental health status is collected
            with the COVID-19 case data. Additionally, sex is recorded only as
            female, male, or other.
          </p>

          <h4>Missing and Suppressed COVID Data</h4>
          <p>
            For COVID-19 related reports, this tracker uses disaggregated,
            individual{" "}
            <a href={urlMap.cdcCovidDataInfo}>
              case level data reported by states, territories, and other
              jurisdictions to the CDC
            </a>
            . Many of these case records are insufficiently disaggregated,
            report an unknown hospitalization and/or death status, otherwise
            fail to provide a complete picture of COVID-19 and its overall
            impact. Due to the nature of surveillance data, we expect this data
            to become more complete over time and will use the Health Equity
            Tracker to record that progress.
          </p>
          <p>
            In accordance with our{" "}
            <Link to={METHODOLOGY_TAB_LINK}>methodology</Link>, we suppress this
            incomplete data and render some states grey for certain COVID-19
            data types, as outlined below:
          </p>
          <ul>
            <li>
              Cases, hospitalizations and deaths: <b>Louisiana</b>,{" "}
              <b>Mississippi</b>, <b>Texas</b>, <b>West Virginia</b>
            </li>
            <li>
              Hospitalizations and deaths: <b>Hawaii</b>, <b>Nebraska</b>,{" "}
              <b>South Dakota</b>
            </li>
            <li>
              Hospitalizations: <b>Rhode Island</b>
            </li>
            <li>
              Deaths: <b>Delaware</b>
            </li>
          </ul>
          <p>
            Note: The following states' case data for COVID-19 <i>are</i>{" "}
            included, but should be interpreted with caution since the cases
            reported may not be representative of the population at large.
          </p>
          <ul>
            <li>
              Cases (interpret with caution): <b>Connecticut</b>, <b>Florida</b>
              , <b>Kentucky</b>, <b>Michigan</b>, <b>Nebraska</b>, and{" "}
              <b>Ohio</b>.
            </li>
          </ul>

          <h4>Missing Vaccination Data</h4>
          <p>
            There is no county level vaccine demographic dataset, so we show
            county totals according to the CDC to provide context.
          </p>
          <h4>Missing Population Data</h4>
          <p>
            The census bureau does not release population data for the{" "}
            <b>Northern Mariana Islands</b>, <b>Guam</b>, or the{" "}
            <b>U.S. Virgin Islands</b> in their ACS five year estimates. The
            last reliable population numbers we could find for these territories
            is from the 2010 census, so we use those numbers when calculating
            the per 100k COVID-19 rates nationally and for all territory level
            rates.
          </p>
          <p>
            Because state reported population categories do not always coincide
            with the categories reported by the census, we rely on the Kaiser
            Family Foundation population tabulations for state reported
            population categories, which only include population numbers for{" "}
            <b>Black,</b> <b>White</b>, <b>Asian</b>, and <b>Hispanic</b>.
            Percent of vaccinated metrics for{" "}
            <b>Native Hawaiian and Pacific Islander</b>, and{" "}
            <b>American Indian and Alaska Native</b> are shown with a population
            comparison metric from the American Community Survey 5-year
            estimates, while <b>Some Other Race</b> is shown without any
            population comparison metric.
          </p>

          <p>
            There is no county level vaccine demographic dataset, so we show
            county totals according to the CDC to provide context.
          </p>
          <h4>Missing Population Data</h4>
          <p>
            The census bureau does not release population data for the{" "}
            <b>Northern Mariana Islands</b>, <b>Guam</b>, or the{" "}
            <b>U.S. Virgin Islands</b> in their ACS five year estimates. The
            last reliable population numbers we could find for these territories
            is from the 2010 census, so we use those numbers when calculating
            the per 100k COVID-19 rates nationally and for all territory level
            rates.
          </p>
          <p>
            Because state reported population categories do not always coincide
            with the categories reported by the census, we rely on the Kaiser
            Family Foundation population tabulations for state reported
            population categories, which only include population numbers for{" "}
            <b>Black,</b> <b>White</b>, <b>Asian</b>, and <b>Hispanic</b>.
            Percent of vaccinated metrics for{" "}
            <b>Native Hawaiian and Pacific Islander</b>, and{" "}
            <b>American Indian and Alaska Native</b> are shown with a population
            comparison metric from the American Community Survey 5-year
            estimates, while <b>Some Other Race</b> is shown without any
            population comparison metric.
          </p>

          <div className={styles.MissingDataContactUs}>
            <p>
              Do you have information on health outcomes at the state and local
              level that belong in the Health Equity Tracker?
              <br />
              <LinkWithStickyParams to={`${CONTACT_TAB_LINK}`}>
                We would love to hear from you!
              </LinkWithStickyParams>
            </p>
          </div>
          <a href={DATA_CATALOG_PAGE_LINK}>
            <Button color="primary" endIcon={<ArrowForward />}>
              See Our Data Sources
            </Button>
          </a>

          {/* DEFINITIONS */}
          <h3 ref={definitionsRef} className={styles.FootnoteLargeHeading}>
            Definitions
          </h3>

          <ul>
            <li>
              <b>{METRIC_CONFIG["vaccinations"][0].variableFullDisplayName}</b>
              {": "}
              {VACCINATED_DEF}
            </li>
          </ul>
        </aside>
      </div>

      <FeedbackBox />
    </>
  );
}

export default ReportProvider;
