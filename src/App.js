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
      <div className="app bg-secondary">
        <WebsocketConnector />
        <Header />
        <div className="flex flex-1">
          <div className="grid border">
            <div className="title border-bottom text-light">Orderbook</div>
            <OrderBook />
          </div>
          <div className="flex-column flex-1">
            <div className="grid flex-1 border">
              <div className="title border-bottom text-light">Trade</div>
              <div className="flex flex-1" style={{ padding: 10 }}>
                <div className="flex flex-1 col-6 justify-content-center">
                  <Trade />
                </div>
                <div className="flex flex-1 col-6 justify-content-center">
                  <Balance />
                </div>
              </div>
            </div>
            <div className="grid border flex-1">
              <div className="title border-bottom text-light">Orders</div>
              <Orders />
            </div>
          </div>
          <div className="grid border">
            <div className="title border-bottom text-light">Trade History</div>
            <TradeHistory />
          </div>
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps)(App);
