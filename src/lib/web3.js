import BigNumber from 'bignumber.js';
import { loadAccount, loadAccountBalance, watchToken } from '../actions/account';
import { loadWeb3NetworkID } from '../actions/config';
import abi from './abi';
import env from './env';
import { callPromise, isTokenApproved, isZeroAddress } from './utils';
import depositProxyABI from './depositProxyABI';

export let web3, Contract;
const accountWatchers = new Map();

export const getTokenBalance = (tokenAddress, accountAddress) => {
  const contract = Contract.at(tokenAddress);
  return callPromise(contract.balanceOf, accountAddress);
};

export const getAllowance = async (tokenAddress, accountAddress) => {
  const contract = Contract.at(tokenAddress);
  return callPromise(contract.allowance, accountAddress, env.HYDRO_PROXY_ADDRESS);
};

// for deposit mode
export const getTokenDepositBalance = async (tokenAddress, accountAddress) => {
  const contract = web3.eth.contract(depositProxyABI).at(env.HYDRO_PROXY_ADDRESS);
  return callPromise(contract.balanceOf, tokenAddress, accountAddress);
};

// for deposit mode
export const depositToken = (tokenAddress, amount) => {
  return async (dispatch, getState) => {
    const state = getState();
    const accountAddress = state.account.get('address');
    const tokensInfo = state.account.get('tokensInfo');
    let symbol;
    let decimals;
    let balance;
    let allowance;

    for (let tokenItem of tokensInfo.toArray()) {
      console.log('tokenItem: ', tokenItem);
      const [token, info] = tokenItem;
      const tokenInfo = info.toJS();
      if (tokenInfo.address === tokenAddress) {
        symbol = token;
        decimals = tokenInfo.decimals;
        balance = tokenInfo.balance;
        allowance = tokenInfo.allowance;
        break;
      }
    }

    const value = new BigNumber(amount).multipliedBy(Math.pow(10, decimals));
    if (value.gt(balance)) {
      alert('Balance is not enough!');
      return;
    }

    const isApproved = isTokenApproved(allowance || new BigNumber('0'));
    if (!isApproved) {
      let transactionID = await dispatch(
        approve(tokenAddress, symbol, '0xf000000000000000000000000000000000000000000000000000000000000000', 'Approve')
      );
      if (!transactionID) {
        return;
      }
    }

    const contract = web3.eth.contract(depositProxyABI).at(env.HYDRO_PROXY_ADDRESS);

    let params = {
      from: accountAddress,
      to: env.HYDRO_PROXY_ADDRESS,
      data: contract.depositToken.getData(tokenAddress, value.toString()),
      value: 0,
      gas: 100000
    };

    try {
      const transactionID = await callPromise(web3.eth.sendTransaction, params);

      const status = 'deposit';
      alert(`${status} ${symbol} request submitted`);
      watchTransactionStatus(transactionID, async success => {
        if (success) {
          dispatch(watchToken(tokenAddress, symbol));
          alert(`${status} ${symbol} Successfully`);
        } else {
          alert(`${status} ${symbol} Failed`);
        }
      });
      return transactionID;
    } catch (e) {
      alert(e);
    }
    return null;
  };
};

// for deposit mode
export const depositEther = (tokenAddress, amount) => {
  return async (dispatch, getState) => {
    const state = getState();
    const accountAddress = state.account.get('address');
    const balance = state.account.get('ethBalance');

    const value = new BigNumber(amount).multipliedBy(Math.pow(10, 18));
    if (value.gt(balance)) {
      alert('Balance is not enough!');
      return;
    }

    let params = {
      from: accountAddress,
      to: env.HYDRO_PROXY_ADDRESS,
      data: web3.sha3('deposit()').slice(0, 10),
      value: value.toString(),
      gas: 80000
    };

    try {
      const transactionID = await callPromise(web3.eth.sendTransaction, params);

      const status = 'deposit';
      const symbol = 'ETH';
      alert(`${status} ${symbol} request submitted`);
      watchTransactionStatus(transactionID, async success => {
        if (success) {
          dispatch(watchToken(tokenAddress, symbol));
          alert(`${status} ${symbol} Successfully`);
        } else {
          alert(`${status} ${symbol} Failed`);
        }
      });
      return transactionID;
    } catch (e) {
      alert(e);
    }
    return null;
  };
};

// for deposit mode
export const deposit = (tokenAddress, amount) => {
  if (isZeroAddress(tokenAddress)) {
    return depositEther(tokenAddress, amount);
  }
  return depositToken(tokenAddress, amount);
};

// for deposit mode
export const withdraw = (tokenAddress, amount) => {
  return async (dispatch, getState) => {
    const state = getState();
    const accountAddress = state.account.get('address');
    const tokensInfo = state.account.get('tokensInfo');
    let symbol;
    let decimals;
    let depositBalance;

    for (let tokenItem of tokensInfo.toArray()) {
      const [token, info] = tokenItem;
      const tokenInfo = info.toJS();
      if (tokenInfo.address === tokenAddress) {
        symbol = token;
        decimals = tokenInfo.decimals;
        depositBalance = tokenInfo.depositBalance;
        break;
      }
    }

    const value = new BigNumber(amount).multipliedBy(Math.pow(10, decimals));
    if (value.gt(depositBalance)) {
      alert('Deposit balance is not enough!');
      return;
    }

    const contract = web3.eth.contract(depositProxyABI).at(env.HYDRO_PROXY_ADDRESS);

    let params = {
      from: accountAddress,
      to: env.HYDRO_PROXY_ADDRESS,
      data: contract.withdraw.getData(tokenAddress, value.toString()),
      value: 0,
      gas: 100000
    };

    try {
      const transactionID = await callPromise(web3.eth.sendTransaction, params);

      const status = 'withdraw';
      if (isZeroAddress(tokenAddress)) {
        symbol = 'ETH';
      }
      alert(`${status} ${symbol} request submitted`);
      watchTransactionStatus(transactionID, async success => {
        if (success) {
          dispatch(watchToken(tokenAddress, symbol));
          alert(`${status} ${symbol} Successfully`);
        } else {
          alert(`${status} ${symbol} Failed`);
        }
      });
      return transactionID;
    } catch (e) {
      alert(e);
    }
    return null;
  };
};

export const personalSign = (message, address) => {
  return callPromise(web3.personal.sign, web3.toHex(message), address);
};

export const wrapETH = amount => {
  return async (dispatch, getState) => {
    const state = getState();
    const address = state.account.get('address');
    const WETH = state.config.get('WETH');
    const value = new BigNumber(amount).multipliedBy(Math.pow(10, WETH.decimals)).toString();

    let params = {
      from: address,
      to: WETH.address,
      data: web3.sha3('deposit()').slice(0, 10),
      value,
      gas: 80000
    };

    try {
      const transactionID = await callPromise(web3.eth.sendTransaction, params);

      alert(`Wrap ETH request submitted`);
      watchTransactionStatus(transactionID, async success => {
        if (success) {
          dispatch(watchToken(WETH.address, WETH.symbol));
          alert('Wrap ETH Successfully');
        } else {
          alert('Wrap ETH Failed');
        }
      });
      return transactionID;
    } catch (e) {
      alert(e);
    }
    return null;
  };
};

export const unwrapWETH = amount => {
  return async (dispatch, getState) => {
    const state = getState();
    const address = state.account.get('address');
    const WETH = state.config.get('WETH');
    const value = new BigNumber(amount).multipliedBy(Math.pow(10, WETH.decimals)).toString();
    const contract = Contract.at(WETH.address);

    let params = {
      from: address,
      to: WETH.address,
      data: contract.withdraw.getData(value),
      value: 0,
      gas: 80000
    };

    try {
      const transactionID = await callPromise(web3.eth.sendTransaction, params);

      alert(`Unwrap WETH request submitted`);
      watchTransactionStatus(transactionID, async success => {
        if (success) {
          dispatch(watchToken(WETH.address, WETH.symbol));
          alert('Wrap ETH Successfully');
        } else {
          alert('Wrap ETH Failed');
        }
      });
      return transactionID;
    } catch (e) {
      alert(e);
    }
    return null;
  };
};

export const enable = (address, symbol) => {
  return async (dispatch, getState) => {
    let transactionID = await dispatch(
      approve(address, symbol, '0xf000000000000000000000000000000000000000000000000000000000000000', 'Approve')
    );
    return transactionID;
  };
};

export const disable = (address, symbol) => {
  return async (dispatch, getState) => {
    let transactionID = await dispatch(
      approve(address, symbol, '0x0000000000000000000000000000000000000000000000000000000000000000', 'Disapprove')
    );
    return transactionID;
  };
};

export const approve = (tokenAddress, symbol, allowance, action) => {
  return async (dispatch, getState) => {
    const state = getState();
    const isApprove = action === 'Approve';
    let status = isApprove ? 'Enable' : 'Disable';
    const accountAddress = state.account.get('address');
    const contract = Contract.at(tokenAddress);

    let params = {
      from: accountAddress,
      to: tokenAddress,
      data: contract.approve.getData(env.HYDRO_PROXY_ADDRESS, allowance),
      value: 0,
      gas: 80000
    };

    try {
      const transactionID = await callPromise(web3.eth.sendTransaction, params);

      alert(`${status} ${symbol} request submitted`);
      watchTransactionStatus(transactionID, async success => {
        if (success) {
          dispatch(watchToken(tokenAddress, symbol));
          alert(`${status} ${symbol} Successfully`);
        } else {
          alert(`${status} ${symbol} Failed`);
        }
      });
      return transactionID;
    } catch (e) {
      alert(e);
    }
    return null;
  };
};

export const initWatchers = () => {
  return async dispatch => {
    loadMetamask();
    dispatch(startAccountWatchers());
    startNetworkWatcher(dispatch);
  };
};

const watchTransactionStatus = (txID, callback) => {
  const getTransaction = () => {
    web3.eth.getTransactionReceipt(txID, (err, result) => {
      if (!result) {
        window.setTimeout(getTransaction(txID), 3000);
      } else if (callback) {
        callback(result.status === '0x1');
      } else {
        alert('success');
      }
    });
  };
  window.setTimeout(getTransaction(txID), 3000);
};

const loadMetamask = () => {
  if (typeof window.web3 !== 'undefined') {
    web3 = window.web3;
    Contract = web3.eth.contract(abi);
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

const startNetworkWatcher = dispatch => {
  const watcher = () => {
    const networkId = web3.version.network;
    if (!!networkId) {
      dispatch(loadWeb3NetworkID(networkId));
    } else {
      web3.version.getNetwork((err, web3NetworkID) => {
        dispatch(loadWeb3NetworkID(web3NetworkID));
      });
    }

    setTimeout(watcher, 3000);
  };

  watcher();
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
      await dispatch(loadAccountBalance(balance));
    } catch (e) {
      console.log(e);
    }
  };
};
