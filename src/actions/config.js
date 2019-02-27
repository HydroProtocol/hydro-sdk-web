import axios from 'axios';
import env from '../lib/env';

export const loadBaseCurrencyToken = () => {
  return async dispatch => {
    const response = await axios.get(`${env.API_ADDRESS}/v3/tokens/WETH`);
    dispatch(setConfigs({ baseCurrencyToken: response.data.data.token }));
  };
};

export const setConfigs = configs => {
  return {
    type: 'SET_CONFIGS',
    payload: configs
  };
};
