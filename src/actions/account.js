import { personalSign } from '../lib/web3';
import { saveLoginData } from '../lib/session';
import BigNumber from 'bignumber.js';
import axios from 'axios';

export const loadAccount = address => {
  return (dispatch, getState) => {
    return dispatch({
      type: 'LOAD_ACCOUNT',
      payload: { address }
    });
  };
};

export const loadAccountBalance = (account, balance) => {
  return (dispatch, getState) => {
    dispatch({
      type: 'LOAD_BALANCE',
      payload: { balance }
    });
  };
};

export const loginRequest = address => {
  return async (dispatch, getState) => {
    const message = `Signing this message proves your ownership of your Ethereum wallet address to DDEX without giving DDEX access to any sensitive information. Message ID: @${Date.now()}.`;
    const signature = await personalSign(message, address);
    if (!signature) {
      return;
    }

    const res = await axios.post(`https://api.ddex.io/v3/account/jwt`, null, {
      headers: {
        'Hydro-Authentication': address + '#' + message + '#' + signature
      }
    });

    if (res.data.status === 0) {
      const jwt = res.data.data.jwt;
      return dispatch(login(address, jwt));
    }
  };
};

export const login = (address, jwt) => {
  return async (dispatch, getState) => {
    address = address.toLowerCase();
    saveLoginData(address, jwt);
    await dispatch(loadAccountLockedBalance());
    dispatch({ type: 'LOGIN' });
  };
};

export const loadAccountLockedBalance = () => {
  return async (dispatch, getState) => {
    const res = await axios.get(`https://api.ddex.io/v3/account/lockedBalances`);
    const lockedBalances = {};
    if (res.data.status === 0) {
      res.data.data.lockedBalances.forEach(x => {
        lockedBalances[x.symbol] = x.amount;
      });
      dispatch(updateTokenLockedBalances(lockedBalances));
    }
  };
};

export const updateTokenLockedBalances = lockedBalances => {
  Object.keys(lockedBalances).forEach((key, index) => {
    lockedBalances[key] = new BigNumber(lockedBalances[key]);
  });

  return {
    type: 'UPDATE_TOKEN_LOCKED_BALANCES',
    payload: lockedBalances
  };
};
