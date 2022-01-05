from google.cloud import bigquery

import ingestion.standardized_columns as std_col
import pandas as pd

# plan for age adjustment
# 1. do a race_and_age type situation
# 2. age adjust based off of that
# 3. profit
REFERENCE_POPULATION = std_col.Race.WHITE_NH.value
RACE_ETH_COL = 'race_category_id'


# def get_population_df():
#     bqclient = bigquery.Client()

#     query_string = """
# SELECT *
# FROM `jzarrabi-het-infra-test-f4.acs_population.by_age_race_county_decade_buckets`
# """
#     return bqclient.query(query_string).result().to_dataframe()


def per_100k(rate):
    return rate * 1000 * 100


def get_true_death_rate(row):
    return per_100k(float(row['death_y']) / float(row['population']))


def age_adjust(race_and_age_df, population_df):

    def get_expected_death_rate(row):
        ref_pop_size = df.loc[(df[std_col.RACE_CATEGORY_ID_COL] == REFERENCE_POPULATION) & (df[std_col.AGE_COL] == row[std_col.AGE_COL])]

    on_cols = [std_col.STATE_FIPS_COL, std_col.STATE_NAME_COL, std_col.AGE_COL]
    on_cols.extend(std_col.RACE_COLUMNS)

    df = pd.merge(race_and_age_df, population_df, how='left', on=on_cols)
    df['true_death_rate'] = df.apply(get_true_death_rate, axis=1)

    df.to_json('hello.json', orient="records")

    # fips_codes = race_and_age_df['state_fips'].drop_duplicates().to_list()

    # for fips_code in fips_codes:
    #     geo_area = race_and_age_df.loc[race_and_age_df[GEO_TO_FIPS_COL[geo]] == fips_code]
    #     races = geo_area['race_category_id'].drop_duplicates().to_list()
    # return race_and_age_df

