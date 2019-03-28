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
          <div className="flex">
            <div className="grid border-right">
              <div className="title">
                <div>{currentMarket.id}</div>
                <div className="text-secondary">Make a Limit Order</div>
              </div>
              <Trade />
            </div>
            <div className="grid border-right">
              <div className="title">
                <div>Orderbook</div>
                <div className="text-secondary">Available Bid and Ask orders</div>
              </div>
              <OrderBook />
            </div>
          </div>
          <div className="flex-column flex-1">
            <div className="grid flex-1">
              <div className="title">
                <div>Charts</div>
                <div className="text-secondary">Recent trading patterns</div>
              </div>
              <Orders />
            </div>
            <div className="grid flex-1 border-top">
              <div className="title">
                <div>Orders</div>
                <div className="text-secondary">View your open orders</div>
              </div>
              <Orders />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps)(App);
