import { Map, OrderedMap } from 'immutable';
import BigNumber from 'bignumber.js';

export const initState = Map({
  address: null,
  networkId: null,
  isLoggedIn: false,
  ethBalance: new BigNumber('0'),
  lockedBalances: Map(),
  allowances: Map(),
  tokenBalances: Map(),
  approving: Map(),
  orders: OrderedMap(),
  myTrades: OrderedMap(),
  transactions: OrderedMap(),
  wrapType: ''
});

export default (state = initState, action) => {
  switch (action.type) {
    case 'SET_WRAP_TYPE':
      state = state.set('wrapType', action.payload.type);
      return state;
    case 'UPDATE_TOKEN_LOCKED_BALANCES':
      for (const k of Object.keys(action.payload)) {
        state = state.setIn(['lockedBalances', k], action.payload[k]);
      }
      state = state.setIn(['lockedLoaded'], true);
      return state;
    case 'LOAD_TOKEN':
      const { symbol, balance, allowance } = action.payload;
      state = state.setIn(['allowances', symbol], allowance);
      state = state.setIn(['tokenBalances', symbol], balance);
      return state;
    case 'LOAD_ACCOUNT':
      state = state.set('address', action.payload.address);
      return state;
    case 'LOAD_BALANCE':
      state = state.set('ethBalance', action.payload.balance);
      return state;
    case 'UPDATE_TOKEN_LOCKED_BALANCES':
      for (const k of Object.keys(action.payload)) {
        state = state.setIn(['lockedBalances', k], action.payload[k]);
      }
      return state;
    case 'LOGIN':
      state = state.set('isLoggedIn', true);
      return state;
    case 'LOAD_ORDERS':
      state = state.set('orders', OrderedMap());
      action.payload.orders.reverse().forEach(o => {
        state = state.setIn(['orders', o.id], o);
      });
      return state;
    default:
      return state;
  }
};
