import React from 'react';
import { connect } from 'react-redux';
import { loadMarkets, loadTradeHistory } from './actions/markets';
import { initWatchers } from './lib/web3';
import Header from './components/Header';
import TradeHistory from './components/TradeHistory';
import WebsocketConnector from './components/WebsocketConnector';
import OrderBook from './components/Orderbook';
import Trade from './components/Trade';
import Balance from './components/Balance';
import { loadWETH } from './actions/config';
import Orders from './components/Orders';
import Trades from './components/Trades';

const mapStateToProps = state => {
  return {
    currentMarket: state.market.getIn(['markets', 'currentMarket'])
  };
};

class App extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    const { dispatch, currentMarket } = this.props;
    dispatch(loadMarkets());
    dispatch(initWatchers());
    dispatch(loadWETH());
    if (currentMarket) {
      dispatch(loadTradeHistory(currentMarket.id));
    }
  }

  componentDidUpdate(prevProps) {
    const { currentMarket, dispatch } = this.props;
    if (currentMarket !== prevProps.currentMarket) {
      dispatch(loadTradeHistory(currentMarket.id));
    }
  }

  render() {
    const { currentMarket } = this.props;
    if (!currentMarket) {
      return null;
    }
    return (
      <div className="app">
        <WebsocketConnector />
        <Header />
        <div className="flex flex-1">
          <div className="grid">
            <div className="title text-secondary">Orderbook</div>
            <OrderBook />
          </div>
          <div className="flex-column flex-1">
            <div className="flex flex-1">
              <div className="grid flex-1">
                <div className="flex flex-1">
                  <Trade />
                </div>
              </div>
              <div className="grid flex-1">
                <div className="title text-secondary">Wallet Balance</div>
                <div className="flex flex-1">
                  <Balance />
                </div>
              </div>
            </div>
            <div className="flex flex-1">
              <div className="grid flex-1">
                <div className="title text-secondary">Orders</div>
                <Orders />
              </div>
              <div className="grid flex-1">
                <div className="title text-secondary">Trades</div>
                <Trades />
              </div>
            </div>
          </div>
          <div className="grid">
            <div className="title text-secondary">Trade History</div>
            <TradeHistory />
          </div>
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps)(App);
