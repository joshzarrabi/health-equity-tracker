import requests
import json
from ingestion.gcs_to_bq_util import values_json_to_dataframe
from ingestion.standardized_columns import Race


NOT_HISPANIC_IDENTIFIER = "01"
RACE_IDENTIFIERS = {
    Race.WHITE_NH.value: (1, ),
    Race.BLACK_NH.value: (2, ),
    Race.AIAN_NH.value: (3, 4, 5),
    Race.ASIAN_NH.value: (6, ),
    Race.NHPI_NH.value: (7, ),
    Race.MULTI_OR_OTHER_STANDARD_NH.value: (8, 9),
}

RACES = [
    Race.WHITE_NH.value,
    Race.BLACK_NH.value,
    Race.AIAN_NH.value,
    Race.ASIAN_NH.value,
    Race.NHPI_NH.value,
    Race.MULTI_OR_OTHER_STANDARD_NH.value,
]

AGE_RANGES = ["0:9", "10:19", "20:29", "30:39", "40:49", "50:59", "60:69", "70:79", "80:120"]

BASE_ACS_URL = "https://api.census.gov/data/2019/acs/acs5/pums"


def get_state_population_data():
    url = ("https://api.census.gov/data/2019/acs/acs5/pums?"
           "tabulate=weight(PWGTP)&col+RAC1P&row+HISP&row+ucgid&ucgid=0400000US04&AGEP=10:20")

    jsn = requests.get(url)
    jsn = json.loads(jsn.content)
    jsn[0] = [str(item) for item in jsn[0]]

    df = values_json_to_dataframe(json.dumps(jsn))

    return df


def generate_params(state, age_range):
    params = {}
    params["tabluate"] = "weight(PWGTP)&col+RAC1P&row+HISP&row+ucgid"
    params["ucgid"] = "0400000US04"
    params["AGEP"] = age_range


def get_race_keys(races):
    keys = []
    for race in races:
        for pum_num in RACE_IDENTIFIERS[race]:
            keys.append(str({"RAC1P": str(pum_num)}))

    return keys


def get_non_hispanic_population_for_race(df, race):
    keys = get_race_keys([race])
    df = df[keys].loc[df["HISP"] == NOT_HISPANIC_IDENTIFIER].reset_index(drop=True)
    return int(df.sum(axis=1))


def get_total_population_for_race(df, race):
    keys = get_race_keys([race])
    return int(df[keys].sum().sum())


def get_hispanic_population(df):
    all_race_keys = get_race_keys(RACE_IDENTIFIERS.keys())
    df = df[all_race_keys].loc[df["HISP"] != NOT_HISPANIC_IDENTIFIER].reset_index(drop=True)
    return int(df.sum().sum())


def get_all_population_data():
    populations = {}
    df = get_state_population_data()

    for race in RACE_IDENTIFIERS:
        populations[race] = get_non_hispanic_population_for_race(df, race)

    populations[Race.HISP.value] = get_hispanic_population(df)

    return populations
