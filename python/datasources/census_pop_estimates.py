from ingestion.standardized_columns import Race
from datasources.data_source import DataSource

from ingestion import gcs_to_bq_util
import ingestion.standardized_columns as std_col

import pandas as pd

BASE_POPULATION_URL = ('https://www2.census.gov/programs-surveys/popest/'
                       'datasets/2010-2019/counties/asrh/cc-est2019-alldata.csv')

RACES_MAP = {'NHWA': Race.WHITE_NH.value, 'NHBA': Race.BLACK_NH.value, 'NHIA': Race.AIAN_NH.value,
             'NHAA': Race.ASIAN_NH.value, 'NHNA': Race.NHPI_NH.value, 'H': Race.HISP.value}


AGES_MAP = {
    'All': (0, ), '0-9': (1, 2), '10-19': (3, 4), '20-29': (5, 6),
    '30-39': (7, 8), '40-49': (9, 10), '50-59': (11, 12),
    '60-69': (13, 14), '70-79': (15, 16), '80+': (17, 18)}

YEAR_2019 = 12


def total_race(row, race):
    return row['%s_MALE' % race] + row['%s_FEMALE' % race]


class CensusPopEstimates(DataSource):

    @staticmethod
    def get_id():
        return 'CENSUS_POP_ESTIMATES'

    @staticmethod
    def get_table_name():
        return 'census_pop_estimates'

    def upload_to_gcs(self, _, **attrs):
        raise NotImplementedError(
            'upload_to_gcs should not be called for CensusPopEstimates')

    def write_to_bq(self, dataset, gcs_bucket, **attrs):
        df = gcs_to_bq_util.load_csv_as_dataframe_from_web(BASE_POPULATION_URL, encoding="ISO-8859-1")
        df = generate_state_pop_data(df)

        column_types = {c: 'STRING' for c in df.columns}

        if std_col.RACE_INCLUDES_HISPANIC_COL in df.columns:
            column_types[std_col.RACE_INCLUDES_HISPANIC_COL] = 'BOOL'

        gcs_to_bq_util.add_dataframe_to_bq(
                df, dataset, "race_and_ethnicity", column_types=column_types)


def generate_state_pop_data(df):
    # Only get estimates from 2019
    df = df.loc[df['YEAR'] == YEAR_2019].reset_index(drop=True)

    groupby_cols = ['STATE', 'STNAME', 'AGEGRP']
    df = df.groupby(groupby_cols).sum().reset_index()

    needed_cols = groupby_cols

    for race in RACES_MAP:
        needed_cols.append(RACES_MAP[race])
        df[RACES_MAP[race]] = df.apply(total_race, axis=1, args=(race, ))

    df = df[needed_cols]
    new_df = []

    for std_age, census_age in AGES_MAP.items():
        age_df = df.loc[df['AGEGRP'].isin(census_age)]
        age_df = age_df.groupby(['STATE', 'STNAME']).sum().reset_index()
        age_df['age'] = std_age

        for state_fips in age_df['STATE'].drop_duplicates().to_list():
            state_name = age_df.loc[age_df['STATE'] == state_fips]['STNAME'].drop_duplicates().to_list()[0]

            for race in RACES_MAP.values():
                pop_row = {}
                pop_row[std_col.STATE_FIPS_COL] = state_fips
                pop_row[std_col.STATE_NAME_COL] = state_name
                pop_row[std_col.AGE_COL] = std_age
                pop_row[std_col.POPULATION_COL] = age_df.loc[age_df['STATE'] == state_fips][race].values[0]
                pop_row[std_col.RACE_CATEGORY_ID_COL] = race

                new_df.append(pop_row)

    new_df = pd.DataFrame(new_df)
    new_df = new_df.sort_values(['state_name', 'age']).reset_index(drop=True)
    std_col.add_race_columns_from_category_id(new_df)

    return new_df


def update_test_data():
    est_file = 'python/tests/data/census_pop_estimates/census_pop_estimates.csv'
    df = pd.read_csv(est_file, dtype={'STATE': str, 'STNAME': str})
    df = generate_state_pop_data(df)

    df.to_csv('python/tests/data/census_pop_estimates/census_pop_estimates-race_ethnicity_age_state.csv', index=False)
