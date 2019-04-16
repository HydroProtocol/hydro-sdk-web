import { getAllowance, getTokenBalance, connector } from '../lib/connection';
import { saveLoginData, loadAccountHydroAuthentication } from '../lib/session';
import BigNumber from 'bignumber.js';
import api from '../lib/api';

// 从Metamask读取到address，处理登录状态
export const loadAccount = address => {
  return (dispatch, getState) => {
    const currentAddress = getState().account.get('address');
    if (currentAddress && currentAddress !== address) {
      window.location.reload();
    }
    dispatch({
      type: 'LOAD_ACCOUNT',
      payload: { address }
    });
    const isLoggedIn = getState().account.getIn([address, 'isLoggedIn']);
    const hydroAuthentication = loadAccountHydroAuthentication(address);
    if (hydroAuthentication && !isLoggedIn) {
      dispatch(login(address, hydroAuthentication));
    }
  };
};

// load ETH balance
export const loadAccountBalance = balance => {
  return (dispatch, getState) => {
    dispatch({
      type: 'LOAD_BALANCE',
      payload: { balance }
    });
  };
};

// Matamask Privacy Mode
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

// request ddex private auth token
export const loginRequest = () => {
  return async (dispatch, getState) => {
    const message = 'HYDRO-AUTHENTICATION';
    const state = getState();
    const selectedType = state.wallet.get('selectedType');
    const address = state.wallet.getIn(['accounts', selectedType, 'address']);
    const connection = connector.getConnection(selectedType);
    const signature = await connection.personalSignMessage(message);
    if (!signature) {
      return;
    }

    const hydroAuthentication = address + '#' + message + '#' + signature;
    return dispatch(login(address, hydroAuthentication));
  };
};

export const login = (address, hydroAuthentication) => {
  return (dispatch, getState) => {
    saveLoginData(address, hydroAuthentication);
    dispatch(loadAccountLockedBalance());
    dispatch({ type: 'LOGIN', payload: { address } });
  };
};

export const logout = address => {
  return dispatch => {
    dispatch({ type: 'LOGOUT', payload: { address } });
  };
};

// 获取账号锁定余额(订单中的余额)
export const loadAccountLockedBalance = () => {
  return async (dispatch, getState) => {
    const res = await api.get('/account/lockedBalances');
    const lockedBalances = {};
    if (res.data.status === 0) {
      res.data.data.lockedBalances.forEach(x => {
        lockedBalances[x.symbol] = x.lockedBalance;
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

// load ERC20 tokens balance and allowance
export const loadTokens = () => {
  return async (dispatch, getState) => {
    const state = getState();
    const selectedType = state.wallet.get('selectedType');
    const accountAddress = state.wallet.getIn(['accounts', selectedType, 'address']);

    if (!accountAddress) {
      return;
    }

    const markets = state.market.getIn(['markets', 'data']).toArray();
    let tokens = {};
    let promises = [];

    // load quote tokens first
    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];
      if (tokens[market.quoteToken]) {
        continue;
      }
      tokens[market.quoteToken] = true;
      promises.push(dispatch(loadToken(market.quoteTokenAddress, market.quoteToken, market.quoteTokenDecimals)));
    }

    // then base tokens
    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];
      if (tokens[market.baseToken]) {
        continue;
      }
      tokens[market.baseToken] = true;
      promises.push(dispatch(loadToken(market.baseTokenAddress, market.baseToken, market.baseTokenDecimals)));
    }

    await Promise.all(promises);
  };
};

// load ERC20 token 10 times
export const watchToken = (tokenAddress, symbol) => {
  return dispatch => {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => dispatch(loadToken(tokenAddress, symbol)), 3000 * i);
    }
  };
};

export const loadToken = (tokenAddress, symbol, decimals) => {
  return async (dispatch, getState) => {
    const state = getState();
    const selectedType = state.wallet.get('selectedType');
    const accountAddress = state.wallet.getIn(['accounts', selectedType, 'address']);
    if (!accountAddress) {
      return;
    }

    const [balance, allowance] = await Promise.all([
      dispatch(getTokenBalance(tokenAddress, accountAddress)),
      dispatch(getAllowance(tokenAddress, accountAddress))
    ]);

    return dispatch({
      type: 'LOAD_TOKEN',
      payload: {
        address: tokenAddress,
        symbol,
        balance,
        allowance,
        decimals
      }
    });
  };
};

// load all my pending orders
export const loadOrders = () => {
  return async (dispatch, getState) => {
    const currentMarket = getState().market.getIn(['markets', 'currentMarket']);
    const res = await api.get(`/orders?marketID=${currentMarket.id}`);

    if (res.data.status === 0) {
      const data = res.data.data;
      return dispatch({
        type: 'LOAD_ORDERS',
        payload: {
          orders: data ? data.orders.map(format) : []
        }
      });
    } else {
      alert(res.data.desc);
    }
  };
};

// load all my trades
export const loadTrades = () => {
  return async (dispatch, getState) => {
    const currentMarket = getState().market.getIn(['markets', 'currentMarket']);
    const res = await api.get(`/markets/${currentMarket.id}/trades/mine`);

    if (res.data.status === 0) {
      const data = res.data.data;
      return dispatch({
        type: 'LOAD_TRADES',
        payload: {
          trades: data ? data.trades : []
        }
      });
    } else {
      alert(res.data.desc);
    }
  };
};

export const orderUpdate = json => {
  return {
    type: 'ORDER_UPDATE',
    payload: { order: format(json) }
  };
};

export const cancelOrder = id => {
  return async (dispatch, getState) => {
    const res = await api.delete(`/orders/${id}`);

    if (res.data.status === 0) {
      alert('Successfully cancelled order');
      dispatch({
        type: 'CANCEL_ORDER',
        payload: { id }
      });
    } else {
      alert(res.data.desc);
    }
  };
};

// Number or String format to Bignumber
const format = json => {
  return {
    id: json.id,
    marketID: json.marketID,
    side: json.side,
    status: json.status,
    gasFeeAmount: new BigNumber(json.gasFeeAmount || 0),
    makerFeeRate: new BigNumber(json.makerFeeRate || 0),
    takerFeeRate: new BigNumber(json.takerFeeRate || 0),
    price: new BigNumber(json.price),
    availableAmount: new BigNumber(json.availableAmount),
    canceledAmount: new BigNumber(json.canceledAmount),
    confirmedAmount: new BigNumber(json.confirmedAmount),
    pendingAmount: new BigNumber(json.pendingAmount),
    createdAt: json.createdAt,
    json: json.json,
    amount: new BigNumber(json.amount)
  };
};
