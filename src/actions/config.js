import axios from 'axios';
import env from '../lib/env';

export const loadWETH = () => {
  return async dispatch => {
    const response = await axios.get(`${env.API_ADDRESS}/v3/tokens/WETH`);
    dispatch(setConfigs({ WETH: response.data.data.token }));
  };
};

export const setConfigs = configs => {
  return {
    type: 'SET_CONFIGS',
    payload: configs
  };
};
