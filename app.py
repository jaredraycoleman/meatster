import dash 
from dash.dependencies import State, Input, Output
import dash_bootstrap_components as dbc 
import dash_core_components as dcc 
import dash_html_components as html 

import pathlib
import itertools
import numpy as np

from functools import lru_cache
import pandas as pd
from datetime import datetime, timedelta
import os
import requests 

thisdir = pathlib.Path(__file__).resolve().parent
datapath = thisdir.joinpath('database.pickle')

cache = (None, None)
def get_all_data():
    global cache
    mtime = os.path.getmtime(str(datapath))
    last_time, res = cache
    if last_time is not None and res is not None:
        if mtime <= last_time:
            return res

    df = pd.read_pickle(str(thisdir.joinpath('database.pickle')))
    cache = (mtime, df)
    return df

def get_reports():
    reports = get_all_data()['Report'].unique()
    return reports

def get_types(report: str):
    df = get_all_data()
    types = df[df['Report'] == report]['Cut Type'].unique()
    return types 

def get_names(report: str, cut_type: str):
    df = get_all_data()
    names = df[(df['Report'] == report) & (df['Cut Type'] == cut_type)]['Item Description'].unique()
    return names 

def get_data(report: str, cut_type: str, name: str):
    df = get_all_data()
    df = df[(df['Report'] == report) & (df['Cut Type'] == cut_type) & (df['Item Description'] == name)]
    return df.dropna(how='all')

columns = [    
    'Weighted Average',
    'Price Range Low',
    'Price Range High',
    'Total Pounds',
    'Number of Trades',
]
def get_data_summary(report: str, cut_type: str, name: str,
                     start_date, end_date) -> pd.DataFrame:
    df = get_data(report, cut_type, name)

    if not start_date:
        start_date = df['Report Date'].min()
    if not end_date:
        end_date = df['Report Date'].max()
    df = df[(df['Report Date'] >= start_date) & (df['Report Date'] <= end_date)]

    round2 = lambda x: float(f'{x:.2f}')
    def stats(ser):
        try:
            mean = round2(ser.mean())
        except:
            mean = None 
        try:
            median = round2(ser.median())
        except:
            median = None 
        try:
            mode = ser.mode()[0]
        except: 
            mode = None 
        try:
            total = round2(ser.sum())
        except:
            total = None
        
        return [mean, median, mode, total]

    summary = pd.DataFrame.from_dict({
        name: stats(df[name])
        for name in columns
    })

    summary.index = ['Mean', 'Median', 'Mode (first)', 'Total']

    return df, summary

def to_options(elems):
    return [{'label': elem, 'value': elem} for elem in elems]

app = dash.Dash(__name__, external_stylesheets=[
    dbc.themes.JOURNAL,
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
])

price_up = html.I(className='fa fa-chevron-up fa-2x', style={'color': '#5cb85c'})
price_down = html.I(className='fa fa-chevron-down fa-2x', style={'color': '#d9534f'})


def card_wrap(body, title=None):
    if title is None:
        title = html.Div(style={'display': 'none'})
    elif isinstance(title, str):
        title = dbc.CardHeader(html.H3(title, className='text-left'))
    else:
        title = dbc.CardHeader(title)

    return dbc.Card(
        [
            title,
            dbc.CardBody(body)
        ],  
        className='mb-3'
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

init_reports = get_reports()
init_types = get_types(init_reports[0])
init_names = get_names(init_reports[0], init_types[0])

inputs = {
    'Report': dcc.Dropdown(options=to_options(init_reports), 
                           value=init_reports[0], 
                           id=f'dropdown-report',
                           clearable=False,
    ),
    'Type': dcc.Dropdown(options=to_options(init_types), 
                         value=init_types[0], id=f'dropdown-type',
                         clearable=False,
    ),
    'Name': dcc.Dropdown(options=to_options(init_names), 
                         value=init_names[0], id=f'dropdown-name',
                         clearable=False,
    ),
}

input_form = [
    dbc.Row([
        dbc.Col(html.H5(label, className='text-right'), width=2),
        dbc.Col(form),
    ], className='mb-2 align-items-center')
    for label, form in inputs.items()
] 

info_panel = dbc.Col(
    [
        dbc.Row([
            html.H5('Date Range'),
            dcc.DatePickerRange(id='date-range', className='ml-3'),
        ], className='mb-4 align-items-center'),
        dcc.Loading(
            dbc.Row(html.Div(id='info-table')),
            type='dot'
        ),
    ]
)

body = dbc.Container([dbc.Row([
    dbc.Col([ # Left Column
        card_wrap(input_form, title='Input'),
        card_wrap(
            html.Pre(id='report-text', style={'height': '40vh'}), 
            title=dbc.Row([
                dbc.Col(html.H3('Report', className='text-left'), className='align-self-center'),
                dbc.Col(dcc.DatePickerSingle(id='date-picker', className='text-right float-right')),
            ])
        ),
    ], width=5),
    dbc.Col(
        [ # Right Column
            card_wrap(
                dbc.Col(
                    [
                        info_panel, 
                        dcc.Loading(dcc.Graph(id='plot'), type='dot')
                    ],
                    className='overflow-hidden'
                )
            )
        ]
    )
])], className='mt-4', fluid=True)

app.layout = html.Div([navbar, body])
server = app.server 

default_cols = {'Price Range Low', 'Price Range High', 'Weighted Average'}

@app.callback(
    [Output('plot', 'figure'), Output('info-table', 'children')], 
    [Input('dropdown-name', 'value'),
     Input('date-range', 'start_date'),
     Input('date-range', 'end_date')],
    [State('dropdown-report', 'value'),
     State('dropdown-type', 'value'),]
)
@lru_cache(maxsize=32)
def plot_callback(name, start_date, end_date, report, cut_type):
    if start_date:
        year, month, day = start_date.split('-')
        start_date = datetime(year=int(year), month=int(month), day=int(day))
    if end_date:
        year, month, day = end_date.split('-')
        end_date = datetime(year=int(year), month=int(month), day=int(day))
               
    df, summary = get_data_summary(report, cut_type, name, start_date, end_date)

    plots = [
        dict(
            x=df['Report Date'],
            y=df[name],
            name=name,
            visible=True if name in default_cols else 'legendonly'
        )
        for name in columns
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

    return [{'data': plots}, summary_table]

@app.callback(
    [Output('dropdown-type', 'options'),
     Output('dropdown-type', 'value')],
    [Input('dropdown-report', 'value')]
)
def update_dropdown_type(report):
    if not report:
        return []
    types = get_types(report)
    return to_options(types), types[0]

@app.callback(
    [Output('dropdown-name', 'options'),
     Output('dropdown-name', 'value')],
    [Input('dropdown-type', 'value')],
    [State('dropdown-report', 'value')]
)
def update_dropdown_name(cut_type, report):
    if not report or not cut_type:
        return []
    names = get_names(report, cut_type)
    return to_options(names), names[0]

@app.callback(
    Output('date-picker', 'date'),
    [Input('dropdown-name', 'value')],
    [State('dropdown-report', 'value'),
     State('dropdown-type', 'value')]
)
def default_date_callback(name, report, cut_type):
    df = get_data(report, cut_type, name)
    last = df['Report Date'].max()
    return last

@app.callback(
    [Output('date-range', 'start_date'),
     Output('date-range', 'end_date')],
    [Input('dropdown-name', 'value')],
    [State('dropdown-report', 'value'),
     State('dropdown-type', 'value')]
)
def default_date_range_callback(name, report, cut_type):
    df = get_data(report, cut_type, name)
    end = df['Report Date'].max()
    start = end - timedelta(days=30)
    return start, end

base_url = 'https://search.ams.usda.gov/mndms'
@app.callback(
    Output('report-text', 'children'),
    [Input('dropdown-report', 'value'),
     Input('date-picker', 'date')]
)
@lru_cache(maxsize=32)
def update_report_text(report, date):
    date = datetime.strptime(date[:10], '%Y-%m-%d')
    year, month, day = date.year, str(date.month).zfill(2), str(date.day).zfill(2)
    url = f'{base_url}/{year}/{month}/{report}{year}{month}{day}.TXT'

    res = requests.get(url)
    if res.status_code == 200:
        return res.text
    else:
        return f'No report found for {date}'

if __name__ == '__main__':
    app.run_server(debug=True)