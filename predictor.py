import numpy as np
import pandas as pd 
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn import neighbors
from sklearn.model_selection import GridSearchCV
from sklearn.preprocessing import MinMaxScaler
scaler = MinMaxScaler(feature_range=(0, 1))
from pmdarima.arima import auto_arima
from fbprophet import Prophet
# %matplotlib inline
# from forecast_tools import utils

def predictor(df, u_in):
    if u_in== 'Ribeye':
        ribeye = df[df["item_description"] == "Rib, ribeye, bnls, heavy (112A  3)"]
        # print(ribeye)
    
    # sns.heatmap(df.corr(), annot = True, cmap = 'magma')
    # plt.savefig('heatmap.png')
    # plt.show()
    
    df = df.dropna()
    df['report_date'] = pd.to_datetime(df.report_date,format='%Y-%m-%d')
    data = df.sort_values(by='report_date', ascending=True)
    # data['price_range_high'] = data['price_range_high'].astype('int64')
    print(data)

    new_data=data[['price_range_high', 'report_date']].copy()
    new_data.reset_index(inplace=True)
    print(new_data)

    #creating dataframe
    # new_data = pd.DataFrame(index=range(0,len(data)),columns=['report_date', 'price_range_high'])


    #preparing data
    new_data.rename(columns={'price_range_high': 'y', 'report_date': 'ds'}, inplace=True)

    #train and validation
    train = new_data[:4273]
    valid = new_data[4273:]

    #fit the model
    model = Prophet()
    model.fit(train)

    #predictions
    close_prices = model.make_future_dataframe(periods=len(valid))
    forecast = model.predict(close_prices)

    #rmse
    forecast_valid = forecast['yhat'][216:]
    rms=np.sqrt(np.mean(np.power((np.array(valid['y'])-np.array(forecast_valid)),2)))
    print(rms)

    #plot
    valid['Predictions'] = 0
    valid['Predictions'] = forecast_valid.values

    plt.plot(train['y'])
    plt.plot(valid[['y', 'Predictions']])
    plt.show()

    #autoarima
    # train = new_data[:4273]
    # valid = new_data[4273:]
    # print('\n Shape of training set:')
    # print(train.shape)
    # print('\n Shape of validation set:')
    # print(valid.shape)

    # training = train['price_range_high']
    # validation = valid['price_range_high']

    # model = auto_arima(training, start_p=1, start_q=1,max_p=3, max_q=3, m=12,start_P=0, seasonal=True,d=1, D=1, trace=True,error_action='ignore',suppress_warnings=True)
    # model.fit(training)

    # forecast = model.predict(n_periods=1069)
    # forecast = pd.DataFrame(forecast,index = valid.index,columns=['Prediction'])

    # rms=np.sqrt(np.mean(np.power((np.array(valid['price_range_high'])-np.array(forecast['Prediction'])),2)))
    # print(rms)

    # #plot
    # plt.plot(train['price_range_high'])
    # plt.plot(valid['price_range_high'])
    # plt.plot(forecast['Prediction'])
    # plt.show()


    # x_train = train.drop('price_range_high', axis=1)
    # y_train = train['price_range_high']
    # x_valid = valid.drop('price_range_high', axis=1)
    # y_valid = valid['price_range_high']

    #     #scaling data
    # x_train_scaled = scaler.fit_transform(x_train)
    # x_train = pd.DataFrame(x_train_scaled)
    # x_valid_scaled = scaler.fit_transform(x_valid)
    # x_valid = pd.DataFrame(x_valid_scaled)

    # #using gridsearch to find the best parameter
    # params = {'n_neighbors':[2,3,4,5,6,7,8,9]}
    # knn = neighbors.KNeighborsRegressor()
    # model = GridSearchCV(knn, params, cv=5)

    # #fit the model and make predictions
    # model.fit(x_train,y_train)
    # preds = model.predict(x_valid)

    # #rmse
    # rms=np.sqrt(np.mean(np.power((np.array(y_valid)-np.array(preds)),2)))
    # print(rms)

    # #plot
    # valid['Predictions'] = 0
    # valid['Predictions'] = preds
    # plt.plot(valid[['price_range_high', 'Predictions']])
    # plt.plot(train['price_range_high'])
    # plt.show()

    # model = LinearRegression()
    # model.fit(x_train,y_train)

    # preds = model.predict(x_valid)
    # rms=np.sqrt(np.mean(np.power((np.array(y_valid)-np.array(preds)),2)))
    # print(rms)

    #     #plot
    # valid['Predictions'] = 0
    # valid['Predictions'] = preds

    # valid.index = new_data[4273:].index
    # train.index = new_data[:4273].index

    # plt.plot(train['price_range_high'])
    # plt.plot(valid[['price_range_high', 'Predictions']])
    # plt.show()


def main():
    pass

if __name__== "__main__":
    main()


