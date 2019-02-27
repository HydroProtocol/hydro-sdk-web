import { personalSign } from '../lib/web3';
import { saveLoginData, loadAccountJwt } from '../lib/session';
import env from '../lib/env';
import BigNumber from 'bignumber.js';
import axios from 'axios';

export const loadAccount = address => {
  return (dispatch, getState) => {
    const jwt = loadAccountJwt(address);
    if (jwt) {
      dispatch(login(address, jwt));
    }
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

export const enableMetamask = () => {
  return async dispatch => {
    if (!window.ethereum) {
      return;
    }

    window.ethereum.enable().then(accounts => {
      if (accounts[0]) {
        dispatch(loadAccount(accounts[0]));
      }
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
    const res = await axios.post(`${env.API_ADDRESS}/v3/account/jwt`, null, {
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
    saveLoginData(address, jwt);
    await dispatch(loadAccountLockedBalance());
    dispatch({ type: 'LOGIN' });
  };
};

export const loadAccountLockedBalance = () => {
  return async (dispatch, getState) => {
    const res = await axios.get(`${env.API_ADDRESS}/v3/account/lockedBalances`);
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
