
import pathlib 
import pandas as pd 
from datetime import datetime, timedelta

thisdir = pathlib.Path(__file__).resolve().parent
datapath = thisdir.joinpath('database.pickle')

baseurl = f''

def daterange(start_date, end_date):
    for n in range(int ((end_date - start_date).days)):
        yield start_date + timedelta(n)

def update_data():
    df = pd.read_pickle(str(datapath))
    for report in df['report'].unique():
        last_date = df[df['report'] == report]['date'].max()
        for date in daterange(last_date, datetime.today()):
            report_str = f'{report}{date.year}{str(date.month).zfill(2)}{str(date.day).zfill(2)}.TXT'
            print(report_str)

if __name__ == '__main__':
    update_data()