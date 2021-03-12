from typing import Any, Dict
import dash 
from dash.dependencies import State, Input, Output
import dash_bootstrap_components as dbc 
import dash_core_components as dcc 
import dash_html_components as html 

import pandas as pd
from datetime import datetime, timedelta
import requests 
from dateutil.parser import parse as dateparse

import requests_cache

requests_cache.install_cache('demo_cache')

numeric = lambda ser: pd.to_numeric(ser.str.replace(',', ''))

URL = "https://mpr.datamart.ams.usda.gov/services/v1.1"
VALUES = {
    "report_date": pd.to_datetime,
    "number_trades": numeric,
    "total_pounds": numeric,
    "price_range_low": numeric,
    "price_range_high": numeric,
    "weighted_average": numeric
}
DEFAULT_COLS = {'price_range_low', 'price_range_high', 'weighted_average'}
SECTIONS = [
    "Upper 2-3 Choice Items",
    "Lower 1-3 Choice Items",
    "Branded Select",
    "Choice Cuts",
    "Select Cuts",
    "Choice/Select Cuts",
    "Ground Beef",
    "Blended Ground Beef",
    "Beef Trimmings"
]
NAME_KEYS = [
    "item_description",
    "primal_desc"
]


def try_wrap(fun, *args, **kwargs):
    try:
        return fun(*args, **kwargs)
    except:
        return None 
        
def get_name(result: Dict[str, Any]) -> str:
    for key in NAME_KEYS:
        if key in result:
            return result[key]

def get_reports():
    # reports = get_all_data()['Report'].unique()
    res = requests.get(f"{URL}/reports")
    reports = {
        report["slug_id"]: report["report_title"] for report in res.json() 
        if set(SECTIONS).intersection(report["sectionNames"])
    }
    return reports

def get_sections(slug_id: str):
    res = requests.get(f"{URL}/reports/{slug_id}")
    reports = {section: section for section in set(res.json()["reportSections"]).intersection(SECTIONS)}
    return reports 

def get_names(slug_id: str, section: str, start: str, end: str):
    str_start = start.strftime("%m/%d/%Y")
    str_end = end.strftime("%m/%d/%Y")
    res = requests.get(f"{URL}/reports/{slug_id}/{section}?q=published_date={str_start}:{str_end}")
    names = {}
    for result in res.json()["results"]:
        name = get_name(result)
        if name is None:
            continue
        names[name] = name
    return names 

def get_data(slug_id: str, section: str, name: str, start: datetime, end: datetime):
    str_start = start.strftime("%m/%d/%Y")
    str_end = end.strftime("%m/%d/%Y")
    res = requests.get(f"{URL}/reports/{slug_id}/{section}?q=published_date={str_start}:{str_end}")
    rows = []
    for data in res.json()["results"]:
        if data["item_description"] == name:
            rows.append([data.get(k) for k in VALUES.keys()])
    
    df = pd.DataFrame(rows, columns=list(VALUES.keys()))
    for col in df.columns:
        df[col] = VALUES[col](df[col])
    
    return df.sort_values(["report_date"])

def get_data_summary(report: str, section: str, name: str,
                     start_date: datetime = datetime.today() - timedelta(days=365), 
                     end_date: datetime = datetime.today()) -> pd.DataFrame:
    df = get_data(report, section, name, start_date, end_date)

    round2 = lambda x: float(f'{x:.2f}')

    fun_map = [
        ('mean',    lambda ser: round2(ser.mean())),
        ('median',  lambda ser: round2(ser.median())),
        ('min',     lambda ser: ser.min()),
        ('max',     lambda ser: ser.max()),
        ('total',   lambda ser: round2(ser.sum())),
        ('mode',    lambda ser: ser.mode()[0]),
    ]
    index, funs = zip(*fun_map)

    summary = pd.DataFrame.from_dict(
        {
            name: [try_wrap(fun, df[name]) for fun in funs]
            for name, _type in VALUES.items()
            if _type == numeric
        }
    )
    summary.index = index

    return df, summary

def to_options(elems):
    return [{'label': v, 'value': k} for k, v in elems.items()]

app = dash.Dash(__name__, external_stylesheets=[
    dbc.themes.JOURNAL,
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
])

price_up = html.I(className='fa fa-chevron-up fa-2x', style={'color': '#5cb85c'})
price_down = html.I(className='fa fa-chevron-down fa-2x', style={'color': '#d9534f'})


body = dbc.Container(
    children=[
        dbc.Row(
            className="mt-2",
            children=[
                dbc.Col([
                    dbc.Form([
                        dbc.FormGroup([
                            dbc.Label("Report"), 
                            dcc.Dropdown(id="dropdown-report", clearable=False)
                        ]),
                        dbc.FormGroup([
                            dbc.Label("Section"), 
                            dcc.Dropdown(id="dropdown-section", clearable=False)
                        ]),
                        dbc.FormGroup([
                            dbc.Label("Cut"), 
                            dcc.Dropdown(id="dropdown-name", clearable=False)
                        ]),
                        dbc.FormGroup([
                            dbc.Label("Date Range"), 
                            dcc.DatePickerRange(id='date-range', className='ml-3')
                        ])

                    ])
                ]),
                dbc.Col([
                    dcc.Loading(
                        dbc.Row(html.Div(id='info-table')),
                        type='dot'
                    ),
                ])
            ],
        ),
        dbc.Row([
            dbc.Col([
                dcc.Loading(dcc.Graph(id='plot'), type='dot')
            ])
        ]),
    ],
    fluid=True
)

navbar = dbc.NavbarSimple(
    children=[
        dbc.NavItem(dbc.NavLink('Source', href='#')),
    ],
    brand='Meatster',
    brand_href='#',
    sticky='top',
    fluid=True,
)

app.layout = html.Div([dcc.Location(id='url', refresh=False), navbar, body])
server = app.server

@app.callback([Output('dropdown-report', 'options'), 
               Output('date-range', 'start_date'), 
               Output('date-range', 'end_date')],
              [Input('url', 'pathname')])
def cb_reports(pathname):
    return to_options(get_reports()), datetime.today() - timedelta(days=365), datetime.today()

@app.callback(Output('dropdown-section', 'options'),
              [Input("dropdown-report", "value")])
def cb_sections(report):
    if not report:
        return []
    return to_options(get_sections(report))

@app.callback(Output('dropdown-name', 'options'),
              [Input("dropdown-report", "value"), 
               Input("dropdown-section", "value"),
               Input('date-range', 'start_date'),
               Input('date-range', 'end_date')])
def cb_names(report, section, start, end):
    if not report or not section or not start or not end:
        return []

    if start:
        start_date = dateparse(start)
    if end:
        end_date = dateparse(end)

    return to_options(get_names(report, section, start_date, end_date))

@app.callback(Output('dropdown-name', 'value'),
              [Input('dropdown-report', 'value'),
               Input('dropdown-section', 'value')])
def cb_name_clear(report, section):
    return None

@app.callback(Output('dropdown-section', 'value'),
              [Input('dropdown-report', 'value')])
def cb_name_clear(report):
    return None

@app.callback([Output('plot', 'figure'), 
               Output('info-table', 'children')],
              [Input("dropdown-report", "value"), 
               Input("dropdown-section", "value"), 
               Input("dropdown-name", "value"),
               Input('date-range', 'start_date'),
               Input('date-range', 'end_date')])
def cb_plot(report, section, name, start, end): #metric, start, end):
    if not report or not section or not name or not start or not end:
        return {'data': []}, None

    if start:
        start_date = dateparse(start)
    if end:
        end_date = dateparse(end)

    df, summary = get_data_summary(report, section, name, start_date, end_date)

    plots = [
        dict(
            x=df['report_date'],
            y=df[name],
            name=name,
            visible=True if name in DEFAULT_COLS else 'legendonly'
        )
        for name, dtype in VALUES.items()
        if dtype == numeric
    ] 

    summary_table = dbc.Table.from_dataframe(
        summary,
        index=True,
        index_label='',
        bordered=True,
        # responsive=True,
        striped=True,
        hover=True,
    )

    return {'data': plots}, summary_table


def main():
    app.run_server(debug=True)

if __name__ == "__main__":
    main()