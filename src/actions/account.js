import { personalSign, getAllowance, getTokenBalance } from '../lib/web3';
import { saveLoginData, loadAccountJwt } from '../lib/session';
import env from '../lib/env';
import BigNumber from 'bignumber.js';
import axios from 'axios';

export const loadAccount = address => {
  return (dispatch, getState) => {
    dispatch({
      type: 'LOAD_ACCOUNT',
      payload: { address }
    });
    const isLoggedIn = getState().account.get('isLoggedIn');
    const jwt = loadAccountJwt(address);
    if (jwt && !isLoggedIn) {
      dispatch(login(address, jwt));
    }
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
  return (dispatch, getState) => {
    saveLoginData(address, jwt);
    dispatch(loadAccountLockedBalance());
    dispatch({ type: 'LOGIN' });
  };
};

export const loadAccountLockedBalance = () => {
  return async (dispatch, getState) => {
    const address = getState().account.get('address');
    const jwt = loadAccountJwt(address);
    const res = await axios.get(`${env.API_ADDRESS}/v3/account/lockedBalances`, {
      headers: {
        'Jwt-Authentication': jwt
      }
    });
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

export const loadToken = (tokenAddress, symbol) => {
  return async (dispatch, getState) => {
    const accountAddress = getState().account.get('address');
    if (!accountAddress) {
      return;
    }

    const [balance, allowance] = await Promise.all([
      getTokenBalance(tokenAddress, accountAddress),
      getAllowance(tokenAddress, accountAddress)
    ]);

    await dispatch({
      type: 'LOAD_TOKEN',
      payload: {
        symbol,
        balance,
        allowance
      }
    });
  };
};
