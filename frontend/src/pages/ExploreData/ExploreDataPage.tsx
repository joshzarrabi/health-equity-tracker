import { Grid } from "@material-ui/core";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import React, { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { STATUS } from "react-joyride";
import Carousel from "react-material-ui-carousel";
import { Fips } from "../../data/utils/Fips";
import ReportProvider from "../../reports/ReportProvider";
import {
  getMadLibWithUpdatedValue,
  MadLib,
  MADLIB_LIST,
  PhraseSegment,
} from "../../utils/MadLibs";
import {
  getParameter,
  MADLIB_PHRASE_PARAM,
  MADLIB_SELECTIONS_PARAM,
  parseMls,
  psSubscribe,
  setParameter,
  setParameters,
  SHOW_ONBOARDING_PARAM,
  stringifyMls,
  useSearchParams,
} from "../../utils/urlutils";
import styles from "./ExploreDataPage.module.scss";
import { Onboarding } from "./Onboarding";
import OptionsSelector from "./OptionsSelector";

const EXPLORE_DATA_ID = "main";

function ExploreDataPage() {
  const params = useSearchParams();

  // Set up inital mad lib values based on defaults and query params
  const foundIndex = MADLIB_LIST.findIndex(
    (madlib) => madlib.id === params[MADLIB_PHRASE_PARAM]
  );
  const initalIndex = foundIndex !== -1 ? foundIndex : 0;
  let defaultValuesWithOverrides = MADLIB_LIST[initalIndex].defaultSelections;
  if (params[MADLIB_SELECTIONS_PARAM]) {
    params[MADLIB_SELECTIONS_PARAM].split(",").forEach((override) => {
      const [phraseSegmentIndex, value] = override.split(":");
      let phraseSegments: PhraseSegment[] = MADLIB_LIST[initalIndex].phrase;
      if (
        Object.keys(phraseSegments).includes(phraseSegmentIndex) &&
        Object.keys(phraseSegments[Number(phraseSegmentIndex)]).includes(value)
      ) {
        defaultValuesWithOverrides[Number(phraseSegmentIndex)] = value;
      }
    });
  }

  const [madLib, setMadLib] = useState<MadLib>({
    ...MADLIB_LIST[initalIndex],
    activeSelections: defaultValuesWithOverrides,
  });

  useEffect(() => {
    const readParams = () => {
      let index = getParameter(MADLIB_PHRASE_PARAM, 0, (str) => {
        return MADLIB_LIST.findIndex((ele) => ele.id === str);
      });
      let selection = getParameter(
        MADLIB_SELECTIONS_PARAM,
        MADLIB_LIST[index].defaultSelections,
        parseMls
      );

      setMadLib({
        ...MADLIB_LIST[index],
        activeSelections: selection,
      });
    };
    const psSub = psSubscribe(readParams, "explore");

    readParams();

    return () => {
      if (psSub) {
        psSub.unsubscribe();
      }
    };
  }, []);

  const setMadLibWithParam = (ml: MadLib) => {
    setParameter(MADLIB_SELECTIONS_PARAM, stringifyMls(ml.activeSelections));
    setMadLib(ml);
  };

  // Set up warm welcome onboarding behaviors
  const [cookies, setCookie] = useCookies();
  let showOnboarding = cookies.skipOnboarding !== "true";
  if (params[SHOW_ONBOARDING_PARAM] === "true") {
    showOnboarding = true;
  }
  if (params[SHOW_ONBOARDING_PARAM] === "false") {
    showOnboarding = false;
  }
  const [activelyOnboarding, setActivelyOnboarding] = useState<boolean>(
    showOnboarding
  );
  const onboardingCallback = (data: any) => {
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(data.status)) {
      setActivelyOnboarding(false);
      const expirationDate = new Date();
      // Expiration date set for a year from now
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      setCookie("skipOnboarding", true, { path: "/", expires: expirationDate });
    }
  };

  // Set up sticky madlib behavior
  const [sticking, setSticking] = useState<boolean>(false);
  useEffect(() => {
    if (activelyOnboarding) {
      return;
    }
    const header = document.getElementById(EXPLORE_DATA_ID);
    const stickyBarOffsetFromTop: number = header ? header.offsetTop : 1;
    const scrollCallBack: any = window.addEventListener("scroll", () => {
      if (window.pageYOffset > stickyBarOffsetFromTop) {
        if (header) {
          header.classList.add(styles.Sticky);
        }
        setSticking(true);
      } else {
        if (header) {
          header.classList.remove(styles.Sticky);
        }
        setSticking(false);
      }
    });
    return () => {
      window.removeEventListener("scroll", scrollCallBack);
    };
  }, [activelyOnboarding]);

  return (
    <>
      <Onboarding
        callback={onboardingCallback}
        activelyOnboarding={activelyOnboarding}
      />
      <title>Explore the Data - Health Equity Tracker</title>
      <h1 className={styles.ScreenreaderTitleHeader}>Explore the Data</h1>
      <div id={EXPLORE_DATA_ID} tabIndex={-1} className={styles.ExploreData}>
        <div
          className={styles.CarouselContainer}
          id="onboarding-start-your-search"
        >
          <Carousel
            className={styles.Carousel}
            NextIcon={<NavigateNextIcon id="onboarding-madlib-arrow" />}
            timeout={200}
            autoPlay={false}
            indicators={!sticking}
            animation="slide"
            navButtonsAlwaysVisible={true}
            index={initalIndex}
            onChange={(index: number) => {
              let newState = {
                ...MADLIB_LIST[index],
                activeSelections: {
                  ...MADLIB_LIST[index].defaultSelections,
                },
              };
              setMadLib(newState);
              setParameters([
                {
                  name: MADLIB_SELECTIONS_PARAM,
                  value: stringifyMls(newState.activeSelections),
                },
                { name: MADLIB_PHRASE_PARAM, value: MADLIB_LIST[index].id },
              ]);
            }}
          >
            {MADLIB_LIST.map((madlib: MadLib, i) => (
              <CarouselMadLib
                madLib={madLib}
                setMadLib={setMadLibWithParam}
                key={i}
              />
            ))}
          </Carousel>
        </div>
        <div className={styles.ReportContainer}>
          <ReportProvider madLib={madLib} setMadLib={setMadLibWithParam} />
        </div>
      </div>
    </>
  );
}

function CarouselMadLib(props: {
  madLib: MadLib;
  setMadLib: (updatedMadLib: MadLib) => void;
}) {
  // TODO - this isn't efficient, these should be stored in an ordered way
  function getOptionsFromPhraseSegement(
    phraseSegment: PhraseSegment
  ): Fips[] | string[][] {
    // TODO -don't use this hack to figure out if its a FIPS or not
    return Object.keys(phraseSegment).length > 20
      ? Object.keys(phraseSegment)
          .sort((a: string, b: string) => {
            if (a.length === b.length) {
              return a.localeCompare(b);
            }
            return b.length > a.length ? -1 : 1;
          })
          .map((fipsCode) => new Fips(fipsCode))
      : Object.entries(phraseSegment).sort((a, b) => a[0].localeCompare(b[0]));
  }

  return (
    <Grid
      container
      spacing={1}
      justify="center"
      className={styles.CarouselItem}
    >
      {props.madLib.phrase.map(
        (phraseSegment: PhraseSegment, index: number) => (
          <React.Fragment key={index}>
            {typeof phraseSegment === "string" ? (
              <Grid item>{phraseSegment}</Grid>
            ) : (
              <Grid item>
                <OptionsSelector
                  key={index}
                  value={props.madLib.activeSelections[index]}
                  onOptionUpdate={(fipsCode: string) =>
                    props.setMadLib(
                      getMadLibWithUpdatedValue(props.madLib, index, fipsCode)
                    )
                  }
                  options={getOptionsFromPhraseSegement(phraseSegment)}
                />
              </Grid>
            )}
          </React.Fragment>
        )
      )}
    </Grid>
  );
}

export default ExploreDataPage;
