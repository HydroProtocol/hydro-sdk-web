import { setConfigs } from './config';
import { getTokenBalance } from '../lib/web3';
import env from '../lib/env';
import axios from 'axios';

export let hotDiscountRules = [];

export const loadHotDiscountRules = async () => {
  const res = await axios.get(`${env.API_ADDRESS}/v3/fees/discountRules`);
  if (res.data.data) {
    hotDiscountRules = res.data.data;
  }
};

export const getHotTokenAmount = () => {
  return async (dispatch, getState) => {
    const hotContract = env.HOT_CONTRACT_ADDRESS;
    if (!hotContract) {
      return;
    }

    const address = getState().account.get('address');
    if (!address) {
      return;
    }
    const hotTokenAmount = await getTokenBalance(hotContract, address);
    dispatch(setConfigs({ hotTokenAmount }));
  };
};
