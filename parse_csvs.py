
import pathlib 
import re 
import pandas as pd
from datetime import datetime, timedelta

re_report = re.compile(r'.*(LM_XB\d\d\d)[-_]([^_]*).*')

thisdir = pathlib.Path(__file__).resolve().parent
csvdir = thisdir.joinpath('csvs')

date_cols = {
    'Report Date'
}

numeric_cols = {
    'Number of Trades',
    'Total Pounds',
    'Price Range Low',
    'Price Range High',
    'Weighted Average',
    'Choice 600-900',
    'Choice 600-750',
    'Choice 750-900',
    'Select 600-900',
    'Select 600-750',
    'Select 750-900',
    'Upper 2/3 Volume in Loads',
    'Upper 2/3 Volume in Pounds',
    'Lower 1/3 Volume in Loads',
    'Lower 1/3 Volume in Pounds',
    'Branded Select in Loads',
    'Branded Select in Pounds',
}

re_desc = re.compile(r'(?:\d\d\d[A-Z]?)?\s+(?:\d)?\s(?:.+)')

def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    for col in df.columns:
        if col in numeric_cols:
            df[col] = pd.to_numeric(df[col].fillna('').astype(str).str.replace(',', ''))
        elif col in date_cols:
            df[col] = pd.to_datetime(df[col], format='%m/%d/%Y')
        else:
            df[col] = df[col].astype(str).str.strip()
    
    def repl(m):
        start, imps, fl = m.groups()
        if imps is None and fl is None:
            return m.group(0)
        return start

    re_id = r'(^|\()\s*(\d\d\d[A-Z]?)?\s*(\d)?\s*'

    df['Item Description'] = df['Item Description'].str.replace(re_id, repl)
    df['Item Description'] = df['Item Description'].str.replace(r'\(\s*?\)', '')
    df['Item Description'] = df['Item Description'].str.replace(r'\(\s*IM\s*\)', '')
    df['Item Description'] = df['Item Description'].str.strip()
    return df

def parse_csvs():    
    columns = {'Report Date', 'Item Description', 'Number of Trades', 'Total Pounds', 'Price Range Low', 'Price Range High', 'Weighted Average'}
    dfs = []
    for path in csvdir.glob('*.csv'):
        m = re_report.match(path.stem)
        if not m:
            print(f'Error parsing {path}')
            continue 

        report, cut_type = m.groups()
        df = pd.read_csv(str(path))
        if set(df.columns) != columns:
            continue

        print(f'{report}, {cut_type}')
        
        df = clean_df(df)
        df['Report'] = report 
        df['Cut Type'] = cut_type 
        dfs.append(df)
       
    return pd.concat(dfs)

if __name__ == '__main__':
    df = parse_csvs()
    df = df[df['Report Date'] <= (datetime.today())]
    df.to_pickle('database.pickle')