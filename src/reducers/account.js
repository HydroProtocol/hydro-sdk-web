import { Map, OrderedMap } from 'immutable';
import BigNumber from 'bignumber.js';

const initialOrders = Map({
  pageCount: 1,
  currentPage: 1,
  data: OrderedMap(),
  perPage: 10
});

export const initState = Map({
  address: null,
  networkId: null,
  isLoggedIn: false,
  ethBalance: new BigNumber('0'),
  lockedBalances: Map(),
  allowances: Map(),
  balances: Map(),
  approving: Map(),
  orders: initialOrders,
  myTrades: OrderedMap(),
  accountOrders: initialOrders,
  accountAllOrders: initialOrders,
  transactions: OrderedMap()
});

export default (state = initState, action) => {
  switch (action.type) {
    case 'UPDATE_TOKEN_LOCKED_BALANCES':
      for (const k of Object.keys(action.payload)) {
        state = state.setIn(['lockedBalances', k], action.payload[k]);
      }
      state = state.setIn(['lockedLoaded'], true);
      return state;
    case 'LOAD_TOKEN':
      const { symbol, balance, allowance } = action.payload;
      state = state.setIn(['allowances', symbol], allowance);
      state = state.setIn(['balances', symbol], balance);
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
    default:
      return state;
  }
};
