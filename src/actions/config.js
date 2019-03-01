import api from '../lib/api';

export const loadWETH = () => {
  return async dispatch => {
    const response = await api.get('/tokens/WETH');
    dispatch(setConfigs({ WETH: response.data.data.token }));
  };
};

export const setConfigs = configs => {
  return {
    type: 'SET_CONFIGS',
    payload: configs
  };
};
