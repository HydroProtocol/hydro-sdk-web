import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { loadAccount, loadAccountBalance } from '../actions/account';

export let web3;
const accountWatchers = new Map();

export const personalSign = (message, account) => {
  return new Promise((resolve, reject) => {
    const callback = (err, signature) => {
      if (err) {
        return reject(err);
      }
      resolve(signature);
    };
    web3.personal.sign(web3.toHex(message), account, callback);
  });
};

export const initWatchers = () => {
  return async dispatch => {
    loadMetamask();
    dispatch(startAccountWatchers());
  };
};

const loadMetamask = () => {
  if (typeof window.ethereum !== 'undefined') {
    web3 = new Web3(window.ethereum);
  }
};

const startAccountWatchers = () => {
  return async dispatch => {
    const watchAccount = async (timer = 0) => {
      const timerKey = 'account';
      if (timer && accountWatchers.get(timerKey) && timer !== accountWatchers.get(timerKey)) {
        return;
      }

      await dispatch(loadWalletAccount());

      const nextTimer = setTimeout(() => watchAccount(nextTimer), 3000);
      accountWatchers.set(timerKey, nextTimer);
    };

    const watchBalance = async (timer = 0) => {
      const timerKey = 'balance';
      if (timer && accountWatchers.get(timerKey) && timer !== accountWatchers.get(timerKey)) {
        return;
      }

      await dispatch(loadWalletAccountBalance());

      const nextTimer = setTimeout(() => watchBalance(nextTimer), 3000);
      accountWatchers.set(timerKey, nextTimer);
    };

    return Promise.all([watchAccount(), watchBalance()]);
  };
};

const loadWalletAccount = () => {
  return async (dispatch, getState) => {
    let address;

    try {
      address = (await callPromise(web3.eth.getAccounts))[0].toLowerCase();
    } catch (e) {
      address = null;
    }

    await dispatch(loadAccount(address));
  };
};

const loadWalletAccountBalance = () => {
  return async (dispatch, getState) => {
    let address = getState().account.get('address');

    if (!address) {
      return;
    }
    try {
      let balance = new BigNumber(0);
      const accountBalance = await callPromise(web3.eth.getBalance, address);
      balance = new BigNumber(accountBalance.toString());
      await dispatch(loadAccountBalance(address, balance));
    } catch (e) {}
  };
};

const callPromise = (fn, ...args) => {
  return new Promise((resolve, reject) => {
    fn(...args, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
};
