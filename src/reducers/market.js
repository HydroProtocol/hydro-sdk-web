import { Map, List } from 'immutable';

const initialOrderbook = Map({
  bestBid: null,
  bestAsk: null
});

const initialState = Map({
  marketStatus: Map({
    loaded: false,
    loading: true,
    data: List()
  }),

  markets: Map({
    loaded: false,
    loading: true,
    data: List(),
    currentMarket: null,
    onlyMarket: null,
    baseToken: 'ALL',
    searchTerm: ''
  }),

  orderbook: initialOrderbook,
  tickers: Map({
    loading: false,
    data: {}
  }),

  isAllTradesLoading: true,
  tradeHistory: List(),

  tokenPrices: Map({
    loading: true,
    data: {}
  })
});

export default (state = initialState, action) => {
  switch (action.type) {
    case 'LOAD_MARKETS':
      state = state.setIn(['markets', 'data'], List(action.payload.markets));
      if (!state.getIn(['markets', 'currentMarket'])) {
        state = state.setIn(['markets', 'currentMarket'], action.payload.markets[0]);
      }
      return state;
    case 'LOAD_MARKET_STATUS':
      state = state.setIn(['marketStatus', 'data'], List(action.payload.marketStatus));
      return state;
    case 'UPDATE_CURRENT_MARKET': {
      const currentMarket = action.payload.currentMarket;
      const { asTakerFeeRate, asMakerFeeRate, gasFeeAmount } = currentMarket;
      state = state.setIn(['markets', 'currentMarket'], currentMarket);
      state = state.setIn(['markets', 'currentMarketFees'], { asTakerFeeRate, asMakerFeeRate, gasFeeAmount });
      state = state.set('orderbook', initialOrderbook);
      state = state.set('tradeHistory', List());
      return state;
    }
    case 'LOAD_TRADE_HISTORY':
      state = state.set('tradeHistory', List(action.payload.reverse()));
      return state;
    case 'SET_BEST_ASK':
      return state.setIn(['orderbook', 'bestAsk'], action.payload.ask);
    case 'SET_BEST_BID':
      return state.setIn(['orderbook', 'bestBid'], action.payload.bid);
    default:
      return state;
  }
};
