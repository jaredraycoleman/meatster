import plotly.express as px
import pathlib
import json 
import pandas as pd 
import numpy as np
from predictor import *

thisdir = pathlib.Path(__file__).resolve().parent

def main():
    # path = pathlib.Path('/Users/Erik/Desktop/pythonprojects/meatster/2457/Lower\ 1-3\ Choice\ Items/data.json')
    path= thisdir.joinpath('2457', 'Lower 1-3 Choice Items', 'data.json')

    data = json.loads(path.read_text())

    columns = {
        "report_date": "date", 
        "item_description": str, 
        "number_trades": float, 
        "total_pounds": float, 
        "price_range_low": float, 
        "price_range_high": float,
        "weighted_average": float,
    }
    df = pd.DataFrame(
        [
            [res[col] for col in columns.keys()]
            for res in data["results"]
        ], 
        columns=columns.keys()
    )

    for col, dtype in columns.items():
        if dtype == "date":
            df[col] = pd.to_datetime(df[col])
        elif dtype == int or dtype == float:
            # df[col] = df[col].fillna(-1)
            df[col] = df[col].str.replace(',', '')
            df[col] = pd.to_numeric(df[col])
            # df[col] = df[col].replace(-1, np.nan)

    df["report_date"] = pd.to_datetime(df["report_date"])
    df = df.sort_values(["report_date"])
    inp='Ribeye'
    predictor(df, inp)
    # df = df.set_index("report_date").sort_index()
    # print(df)
    ribeye = df[df["item_description"] == "Rib, ribeye, bnls, heavy (112A  3)"]

    fig = px.line(ribeye, x="report_date", y="price_range_high")

    # fig.show()


if __name__ == "__main__":
    main()