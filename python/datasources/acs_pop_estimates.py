from ingestion.standardized_columns import Race

import pandas as pd

ALL_COUNTY_POP_FILE = 'all-pop.csv'

RACES_MAP = {'NHWA': Race.WHITE_NH.value, 'WA': Race.WHITE.value, 'BA': Race.BLACK.value,
             'IA': Race.AIAN.value, 'AA': Race.ASIAN.value, 'NA': Race.NHPI.value}


AGES_MAP = {
    '0-9': (1, 2), '10-19': (3, 4), '20-29': (5, 6),
    '30-34': (7, ), '35-44': (8, 9), '45-54': (10, 11),
    '55-64': (12, 13), '65-74': (14, 15), '75-84': (16, 17), '85+': (18, )}


def total_race(row, race):
    return row['%s_MALE' % race] + row['%s_FEMALE' % race]


def generate_state_pop_data():
    df = pd.read_csv(ALL_COUNTY_POP_FILE, encoding="ISO-8859-1")

    # Only get estimates from 2019
    df = df.loc[df['YEAR'] == 12]

    groupby_cols = ['STATE', 'STNAME', 'AGEGRP']
    df = df.groupby(groupby_cols).sum().reset_index()

    needed_cols = ['STATE', 'STNAME', 'AGEGRP', 'TOT_POP']

    races = []
    for race in RACES_MAP:
        races.append(RACES_MAP[race])

        df[RACES_MAP[race]] = df.apply(total_race, axis=1, args=(race, ))

    needed_cols.extend(races)

    df = df[needed_cols]

    new_df = []

    for std_age, census_age in AGES_MAP.items():
        age_df = df.loc[df['AGEGRP'].isin(census_age)]

        age_df = age_df.groupby(['STATE', 'STNAME']).sum().reset_index()
        age_df['age'] = std_age

        new_df.append(age_df)

    return pd.concat(new_df)


def compare_to_estimate():
    estimate_df = pd.read_json("all-states.json", dtype={'state_fips': str})
    df = generate_state_pop_data()

    all_differences = []
    states = estimate_df['state_fips'].drop_duplicates().to_list()
    states.remove('72')

    for state_fips in states:
        for age in df['age'].drop_duplicates().to_list():
            for race in RACES_MAP.values():
                differences = {}

                est = int(estimate_df.loc[(estimate_df['race_category_id'] == race)
                                          & (estimate_df['state_fips'] == state_fips)
                                          & (estimate_df['age'] == age)]['population'].values[0])

                new_est = int(df.loc[(df['STATE'] == int(state_fips))
                                     & (df['age'] == age)][race].values[0])

                differences['state_fips'] = state_fips
                differences['age'] = age
                differences['race'] = race
                differences['acs_estimate_pop'] = est
                differences['other_estimate_pop'] = new_est
                if est == 0:
                    continue
                differences['diff'] = float(new_est) / float(est)
                all_differences.append(differences)

    return pd.DataFrame(all_differences)


def write_it():
    compare_to_estimate().sort_values(by=['state_fips', 'age']).to_csv("differences2222.csv", index=False)
