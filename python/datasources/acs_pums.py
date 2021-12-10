import requests
import json
from ingestion.gcs_to_bq_util import values_json_to_dataframe
from ingestion.standardized_columns import Race

import pandas as pd


NOT_HISPANIC_IDENTIFIER = "01"
RACE_IDENTIFIERS = {
    Race.WHITE_NH.value: (1, ),
    Race.BLACK_NH.value: (2, ),
    Race.AIAN_NH.value: (3, 4, 5),
    Race.ASIAN_NH.value: (6, ),
    Race.NHPI_NH.value: (7, ),
    Race.MULTI_OR_OTHER_STANDARD_NH.value: (8, 9),
    Race.WHITE.value: (1, ),
    Race.BLACK.value: (2, ),
    Race.AIAN.value: (3, 4, 5),
    Race.ASIAN.value: (6, ),
    Race.NHPI.value: (7, ),
    Race.MULTI_OR_OTHER_STANDARD.value: (8, 9),
}


AGE_RANGES = ["0:9", "10:19", "20:29", "30:39", "45:54", "55:64", "65:74", "75:84", "85:120"]

BASE_ACS_URL = "https://api.census.gov/data/2019/acs/acs5/pums"


def get_state_population_data():
    dfs = {}

    for age_range in AGE_RANGES:
        jsn = requests.get(generate_url(age_range))
        jsn = json.loads(jsn.content)

        jsn[0] = [str(item) for item in jsn[0]]
        dfs[age_range] = values_json_to_dataframe(json.dumps(jsn))

    return dfs


def generate_url(age_range):
    return "%s?tabulate=weight(PWGTP)&col+RAC1P&row+HISP&row+ucgid&ucgid=0400000US04&AGEP=%s" % (
            BASE_ACS_URL, age_range)


def get_race_keys(races):
    keys = []
    for race in races:
        for pum_num in RACE_IDENTIFIERS[race]:
            keys.append(str({"RAC1P": str(pum_num)}))

    return list(set(keys))


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


def translate_age(age_range):
    if age_range == "85:120":
        return "85+"
    return age_range.replace(':', '-')


def get_all_population_data():
    populations_by_age = []
    dfs = get_state_population_data()

    for ages, df in dfs.items():
        for race in RACE_IDENTIFIERS:
            if "NH" in race:
                populations = {}
                populations['race'] = race
                populations['population'] = get_non_hispanic_population_for_race(df, race)
                populations['age'] = translate_age(ages)
                populations_by_age.append(populations)

            else:
                populations = {}
                populations['race'] = race
                populations['population'] = get_total_population_for_race(df, race)
                populations['age'] = translate_age(ages)
                populations_by_age.append(populations)

        populations = {}
        populations['race'] = Race.HISP.value
        populations['population'] = get_hispanic_population(df)
        populations['age'] = translate_age(ages)

        populations_by_age.append(populations)

    return pd.DataFrame(populations_by_age)


def compare_to_estimate():
    estimate_df = pd.read_json("az.json")
    df = get_all_population_data()

    all_differences = []
    for ages in AGE_RANGES:
        age_range = translate_age(ages)

        estimate_df_age = estimate_df.loc[estimate_df['age'] == age_range]
        df_age = df.loc[df['age'] == age_range]

        for race in RACE_IDENTIFIERS.keys() + [Race.HISP.value]:
            differences = {}

            if len(estimate_df_age.loc[estimate_df_age['race_category_id'] == race]) > 0:

                est = int(estimate_df_age.loc[estimate_df_age['race_category_id'] == race]['population'].values[0])
                pums_val = int(df_age.loc[df_age['race'] == race]['population'].values[0])

                differences['race'] = race
                differences['age'] = age_range
                differences['diff'] = float(pums_val) / float(est)
                all_differences.append(differences)

    return pd.DataFrame(all_differences)
