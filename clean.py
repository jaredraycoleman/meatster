

import pandas as pd 

def main():
    df = pd.read_pickle('database.pickle')

    new_df = pd.DataFrame()

    new_df[['imps', 'name', 'type', 'report', 'date']] = df[['imps', 'name', 'type', 'report', 'date']]

    for col in ['fl', 'num_trades', 'total_pounds', 'price_min', 'price_max', 'price_avg']:
        new_df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', ''), errors='coerce')

    new_df.to_pickle('database2.pickle')

if __name__ == '__main__':
    main()