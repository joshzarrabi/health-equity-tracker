import { FIPS_MAP, USA_FIPS } from "../data/utils/Fips";

// Map of phrase segment index to its selected value
export type PhraseSelections = Record<number, string>;

// Map of phrase selection ID to the display value
export type PhraseSelector = Record<string, string>;

// Each phrase segment of the mad lib is either a string of text
// or a map of IDs to string options that can fill in a blank

export type PhraseSegment = string | PhraseSelector;

export type MadLibId = "disparity" | "comparegeos" | "comparevars";

export interface MadLib {
  readonly id: MadLibId;
  readonly phrase: PhraseSegment[];
  readonly defaultSelections: PhraseSelections;
  readonly activeSelections: PhraseSelections;
}

function getMadLibPhraseText(madLib: MadLib): string {
  let madLibText = "";
  madLib.phrase.forEach((phraseSegment, index) => {
    if (typeof phraseSegment === "string") {
      madLibText += phraseSegment;
    } else {
      const phraseSelector = phraseSegment as PhraseSelector;
      let selectionKey: string = madLib.activeSelections[index]
        ? madLib.activeSelections[index]
        : madLib.defaultSelections[index];
      madLibText += " " + phraseSelector[selectionKey] + " ";
    }
  });
  return madLibText;
}

/* Returns a copy of the MadLib with with an updated value in the given phrase segment index */
export function getMadLibWithUpdatedValue(
  originalMadLib: MadLib,
  phraseSegementIndex: number,
  newValue: string
) {
  let updatePhraseSelections: PhraseSelections = {
    ...originalMadLib.activeSelections,
  };
  updatePhraseSelections[phraseSegementIndex] = newValue;
  return {
    ...originalMadLib,
    activeSelections: updatePhraseSelections,
  };
}

export type DropdownVarId =
  | "covid"
  | "diabetes"
  //  | "obesity"
  //  | "asthma"
  | "copd"
  | "health_insurance"
  | "poverty";

const DROPDOWN_VAR: Record<DropdownVarId, string> = {
  covid: "COVID-19",
  diabetes: "Diabetes",
  //  obesity: "[coming soon] obesity",
  //  asthma: "[coming soon] asthma",
  copd: "COPD",
  health_insurance: "Uninsured Individuals",
  poverty: "Poverty",
};

const MADLIB_LIST: MadLib[] = [
  {
    id: "disparity",
    phrase: ["Investigate rates of", DROPDOWN_VAR, "in", FIPS_MAP],
    defaultSelections: { 1: "covid", 3: USA_FIPS },
    activeSelections: { 1: "covid", 3: USA_FIPS },
  },
  {
    id: "comparegeos",
    phrase: [
      "Compare rates of",
      DROPDOWN_VAR,
      " between ",
      FIPS_MAP,
      " and ",
      FIPS_MAP,
    ],
    defaultSelections: { 1: "covid", 3: "13", 5: USA_FIPS }, // 13 is Georgia
    activeSelections: { 1: "covid", 3: "13", 5: USA_FIPS }, // 13 is Georgia
  },
  {
    id: "comparevars",
    phrase: [
      "Explore relationships between",
      DROPDOWN_VAR,
      " and ",
      DROPDOWN_VAR,
      " in ",
      FIPS_MAP,
    ],
    defaultSelections: { 1: "diabetes", 3: "covid", 5: USA_FIPS }, // 13 is Georgia
    activeSelections: { 1: "diabetes", 3: "covid", 5: USA_FIPS }, // 13 is Georgia
  },
];

export { MADLIB_LIST, getMadLibPhraseText };
