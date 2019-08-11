
import pathlib 
import re 
import pandas as pd

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

def main():
    for path in csvdir.glob('*.csv'):
        m = re_report.match(path.stem)
        if not m:
            print(f'Error parsing {path}')
            continue 

        report, cut_type = m.groups()
        print(f'{report} {cut_type}')

        df = pd.read_csv(str(path))

        for col in df.columns:
            if col in numeric_cols:
                df[col] = pd.to_numeric(df[col].fillna('').astype(str).str.replace(',', ''))
            elif col in date_cols:
                df[col] = pd.to_datetime(df[col])

        # if 'Item Description' in df.columns:
        #     df = df.set_index(['Report Date', 'Item Description']).sort_index()
        # elif 'Primal Description' in df.columns:
        #     df = df.set_index(['Report Date', 'Primal Description']).sort_index()
        # else:
        #     df = df.set_index('Report Date').sort_index()

        df.to_pickle(f'{report}_{cut_type}.pickle')

def group_pickles():
    columns = {'Report Date', 'Item Description', 'Number of Trades', 'Total Pounds', 'Price Range Low', 'Price Range High', 'Weighted Average'}
    dfs = []
    for path in thisdir.joinpath('pickles').glob('*.pickle'):
        df = pd.read_pickle(str(path))

        report, cut_type = re_report.match(path.stem).groups()

        if set(df.columns) != columns:
            continue
        
        print(f'{report}, {cut_type}')
        df['Report'] = report 
        df['Cut Type'] = cut_type 
        dfs.append(df)
        
    df = pd.concat(dfs)

    df.to_pickle('database.pickle')
    
if __name__ == '__main__':
    group_pickles()