import { client } from '../lib/hydro';
import BigNumber from 'bignumber.js';
import axios from 'axios';

const baseUrl = client.apiHandler.getApiUrl();

export const listMarkets = () => {
  return async (dispatch, getState) => {
    const url = new URL('markets/status', baseUrl);
    const res = await axios.get(url.toString());
    const marketStatus = res.data.data.status;
    return dispatch({
      type: 'LOAD_MARKET_STATUS',
      payload: { marketStatus }
    });
  };
};

export const updateCurrentMarket = currentMarket => {
  return async dispatch => {
    return dispatch({
      type: 'UPDATE_CURRENT_MARKET',
      payload: { currentMarket }
    });
  };
};

export const loadMarkets = () => {
  return async (dispatch, getState) => {
    const url = new URL('markets', baseUrl);
    const res = await axios.get(url.toString());
    if (res.data.status === 0) {
      const markets = res.data.data.markets;

      markets.forEach(formatMarket);

      return dispatch({
        type: 'LOAD_MARKETS',
        payload: { markets }
      });
    }
  };
};

export const loadTradeHistory = marketId => {
  return async (dispatch, getState) => {
    const res = await axios.get(`https://api.ddex.io/v3/markets/${marketId}/trades`);
    const currentMarket = getState().market.getIn(['markets', 'currentMarket']);
    if (currentMarket.id === marketId) {
      return dispatch({
        type: 'LOAD_TRADE_HISTORY',
        payload: res.data.data.trades
      });
    }
  };
};

const formatMarket = market => {
  market.gasFeeAmount = new BigNumber(market.gasFeeAmount);
  market.asMakerFeeRate = new BigNumber(market.asMakerFeeRate);
  market.asTakerFeeRate = new BigNumber(market.asTakerFeeRate);
  market.marketOrderMaxSlippage = new BigNumber(market.marketOrderMaxSlippage);
};
