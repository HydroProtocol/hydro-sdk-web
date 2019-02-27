import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { loadAccount, loadAccountBalance } from '../actions/account';
import abi from './abi';
import env from './env';

export let web3, Contract;
const accountWatchers = new Map();

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'verifyingContract', type: 'address' }
];

const Order = [
  { name: 'trader', type: 'address' },
  { name: 'relayer', type: 'address' },
  { name: 'baseToken', type: 'address' },
  { name: 'quoteToken', type: 'address' },
  { name: 'baseTokenAmount', type: 'uint256' },
  { name: 'quoteTokenAmount', type: 'uint256' },
  { name: 'gasTokenAmount', type: 'uint256' },
  { name: 'data', type: 'bytes32' }
];

const domain = {
  name: 'Hydro Protocol',
  version: '1',
  verifyingContract: env.HYDRO_CONTRACT_ADDRESS
};

const getEIP712Data = order => {
  return JSON.stringify({
    types: {
      EIP712Domain,
      Order
    },
    domain,
    primaryType: 'Order',
    message: order
  });
};

export const getTokenBalance = (tokenAddress, accountAddress) => {
  const contract = Contract.at(tokenAddress);
  return new Promise((resolve, reject) => {
    contract.balanceOf(accountAddress, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(new BigNumber(result));
    });
  });
};

export const getAllowance = async (tokenAddress, accountAddress) => {
  const contract = Contract.at(tokenAddress);
  return new Promise((resolve, reject) => {
    contract.allowance(accountAddress, env.HYDRO_PROXY_ADDRESS, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(new BigNumber(result));
    });
  });
};

export const signOrder = async (address, order) => {
  const data = getEIP712Data(order);
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        method: 'eth_signTypedData_v3',
        params: [address, data],
        from: address
      },
      function(err, result) {
        if (err) {
          return reject(err);
        } else if (!result) {
          return reject(new Error('No Result'));
        } else if (result.error && result.error.message) {
          return reject(new Error(result.error.message));
        }

        return resolve(result.result);
      }
    );
  });
};

export const personalSign = (message, address) => {
  return new Promise((resolve, reject) => {
    web3.personal.sign(web3.toHex(message), address, (err, signature) => {
      if (err) {
        return reject(err);
      }
      resolve(signature);
    });
  });
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
      const transactionId = await new Promise((resolve, reject) => {
        web3.eth.sendTransaction(params, (err, txId) => {
          if (err) {
            reject(err);
          }

          resolve(txId);
        });
      });

      alert(`${status} ${symbol} request submitted`);
      return transactionId;
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
  };
};

const loadMetamask = () => {
  if (typeof window.ethereum !== 'undefined') {
    web3 = new Web3(window.ethereum);
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
