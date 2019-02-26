import axios from 'axios';

export const loadBaseCurrencyToken = () => {
  return async dispatch => {
    const response = await axios.get('https://api.ddex.io/v3/tokens/WETH');
    dispatch(setConfigs({ baseCurrencyToken: response.data.data.token }));
  };
};

export const setConfigs = configs => {
  return {
    type: 'SET_CONFIGS',
    payload: configs
  };
};
