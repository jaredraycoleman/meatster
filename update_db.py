
import pathlib 
import pandas as pd 
from datetime import datetime, timedelta
from io import StringIO
import re
import requests 
from functools import lru_cache
import shutil
import uuid 

from parse_csvs import clean_df

thisdir = pathlib.Path(__file__).resolve().parent
datapath = thisdir.joinpath('database.pickle')

def daterange(start_date, end_date):
    for n in range(int ((end_date - start_date).days)):
        yield start_date + timedelta(n)

report_sections = {
    'LM_XB452': {
        'Upper 2/3 Choice Items': 'Upper 2/3 Choice Items', 
        'Lower 1/3 Choice Items': 'Lower 1/3 Choice Items', 
        'Branded Select Items': 'Branded Select Items',
    },
    'LM_XB403': {
        'Choice Cuts': 'Choice Cuts', 
        'Select Cuts': 'Select Cuts', 
        'CHOICE, SELECT & UNGRADED CUTS': 'Choice and Select Cuts',
        'GB - STEER/HEIFER SOURCE': 'Ground Beef',
        'BLENDED GB': 'Blended Ground Beef',
        'BEEF TRIMMINGS': 'Beef Trimmings',
    },
}

base_url = 'https://search.ams.usda.gov/mndms'

re_section = re.compile(r'--+(.+?)--+(.*?)(?=--+)', re.DOTALL)

def load_database():
    return pd.read_pickle(datapath)

columns = ['Item Description', 'Number of Trades', 'Total Pounds',
           'Price Range Low', 'Price Range High', 'Weighted Average']
def update_db():
    database = load_database()

    updates = set() 
    for report in report_sections.keys():
        last_date = database[database['Report'] == report]['Report Date'].max()

        for date in daterange(last_date + timedelta(days=1), datetime.today() + timedelta(days=1)):
            year, month, day = date.year, str(date.month).zfill(2), str(date.day).zfill(2)
            res = requests.get(f'{base_url}/{year}/{month}/{report}{year}{month}{day}.TXT')
            if res.status_code != 200:
                continue

            print(f'Fetching Data for {report}: {date}')

            sections = []
            for m in re_section.finditer(res.text):
                section, content = m.groups()
                content = content.strip()
                lines = len(content.splitlines())
                for section_str, name in report_sections[report].items():
                    if section.strip().startswith(section_str):
                        sections.append((name, content, lines))
                        break

            all_content_str = '\n'.join((content for _, content, _ in sections))
            df = pd.read_fwf(StringIO(all_content_str), header=None)
            if len(df.columns) > len(columns):
                desc_cols = (len(df.columns) - len(columns)) + 1
                desc = df[df.columns[:desc_cols]].apply(
                    lambda x: ' '.join(map(str, x)), 
                    axis=1
                )
                df = df[df.columns[desc_cols:]]
                df.insert(0, 'Item Description', desc)

            df.columns = columns

            df['Report'] = report
            df['Cut Type'] = None
            df['Report Date'] = date

            start = 0
            for name, content, lines in sections:
                df['Cut Type'].iloc[start:start+lines] = name
                start += lines

            updates.add(f'{report}: {date}')
            database = database.append(clean_df(df), ignore_index=True, sort=False)

    if updates:
        print('Adding: ')
        print('\t' + '\n\t'.join(updates))
        database = database.drop_duplicates().sort_values(by=['Report Date'])
        temp_datapath = datapath.parent.joinpath(f'database-{uuid.uuid4()}.pickle')
        database.to_pickle(temp_datapath)

        shutil.move(str(temp_datapath), str(datapath))
    else:
        print('No updates')

import time 
if __name__ == '__main__':
    while True:
        update_db()
        time.sleep(60 * 10)