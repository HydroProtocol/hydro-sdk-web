import BigNumber from 'bignumber.js';
import { watchToken } from '../actions/account';
import abi from './abi';
import env from './env';
import { connector, get64BytesString } from 'hydro-sdk-wallet';

export { connector };

export const initConnector = dispatch => {
  connector.setNodeUrl('http://localhost:8545');
  connector.setDispatch(dispatch);
};

export let web3, Contract;

export const getTokenBalance = (tokenAddress, accountAddress, getState) => {
  return async (dispatch, getState) => {
    const selectedType = getState().wallet.get('selectedType');
    const connection = connector.getConnection(selectedType);
    const contract = connection.getContract(tokenAddress, abi);
    const balance = await connection.contractCall(contract, 'balanceOf', accountAddress);
    return new BigNumber(balance);
  };
};

export const getAllowance = (tokenAddress, accountAddress) => {
  return async (dispatch, getState) => {
    const selectedType = getState().wallet.get('selectedType');
    const connection = connector.getConnection(selectedType);
    const contract = connection.getContract(tokenAddress, abi);
    const allowance = await connection.contractCall(contract, 'allowance', accountAddress, env.HYDRO_PROXY_ADDRESS);
    return new BigNumber(allowance);
  };
};

export const wrapETH = amount => {
  return async (dispatch, getState) => {
    const state = getState();
    const WETH = state.config.get('WETH');
    const selectedType = state.wallet.get('selectedType');
    const value = new BigNumber(amount).multipliedBy(Math.pow(10, WETH.decimals)).toString();

    let params = {
      to: WETH.address,
      data: '0xd0e30db0',
      value,
      gasPrice: 80000,
      gasLimit: 80000
    };

    try {
      const connection = connector.getConnection(selectedType);
      const transactionID = await connection.sendTransaction(params);

      alert(`Wrap ETH request submitted`);
      watchTransactionStatus(connection, transactionID, async success => {
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
    const WETH = state.config.get('WETH');
    const selectedType = state.wallet.get('selectedType');
    const value = new BigNumber(amount).multipliedBy(Math.pow(10, WETH.decimals)).toString(16);
    const connection = connector.getConnection(selectedType);
    const functionSelector = '2e1a7d4d';
    const valueString = get64BytesString(value);

    let params = {
      to: WETH.address,
      data: `0x${functionSelector}${valueString}`,
      value: 0,
      gasPrice: 80000,
      gasLimit: 80000
    };

    try {
      const transactionID = await connection.sendTransaction(params);

      alert(`Unwrap WETH request submitted`);
      watchTransactionStatus(connection, transactionID, async success => {
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
      approve(address, symbol, 'f000000000000000000000000000000000000000000000000000000000000000', 'Enable')
    );
    return transactionID;
  };
};

export const disable = (address, symbol) => {
  return async (dispatch, getState) => {
    let transactionID = await dispatch(
      approve(address, symbol, '0000000000000000000000000000000000000000000000000000000000000000', 'Disable')
    );
    return transactionID;
  };
};

export const approve = (tokenAddress, symbol, allowance, action) => {
  return async (dispatch, getState) => {
    const state = getState();
    const selectedType = state.wallet.get('selectedType');
    const functionSelector = '095ea7b3';
    let spender = get64BytesString(env.HYDRO_PROXY_ADDRESS);
    if (spender.length !== 64) {
      return null;
    }

    let params = {
      to: tokenAddress,
      data: `0x${functionSelector}${spender}${allowance}`,
      value: 0,
      gasPrice: 80000,
      gasLimit: 80000
    };

    try {
      const connection = connector.getConnection(selectedType);
      const transactionID = await connection.sendTransaction(params);

      alert(`${action} ${symbol} request submitted`);
      watchTransactionStatus(connection, transactionID, async success => {
        if (success) {
          dispatch(watchToken(tokenAddress, symbol));
          alert(`${action} ${symbol} Successfully`);
        } else {
          alert(`${action} ${symbol} Failed`);
        }
      });
      return transactionID;
    } catch (e) {
      alert(e);
    }
    return null;
  };
};

const watchTransactionStatus = (connection, txID, callback) => {
  const getTransaction = async () => {
    const tx = await connection.getTransactionReceipt(txID);
    if (!tx) {
      window.setTimeout(getTransaction(txID), 3000);
    } else if (callback) {
      callback(Number(tx.status) === 1);
    } else {
      alert('success');
    }
  };
  window.setTimeout(getTransaction(txID), 3000);
};
