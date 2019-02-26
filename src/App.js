import React from 'react';
import { connect } from 'react-redux';
import MarketStatus from './components/MarketStatus';
import { loadMarkets, loadTradeHistory } from './actions/markets';
import { initWatchers } from './lib/web3';
import Header from './components/Header';
import TradeHistory from './components/TradeHistory';
import WebsocketConnector from './components/WebsocketConnector';
import OrderBook from './components/Orderbook';
import './App.scss';

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
    return (
      <div className="app bg-secondary">
        <WebsocketConnector />
        <Header />
        <div className="row-wrapper">
          <div className="grid border">
            <div className="title border-bottom text-light">Order Book</div>
            <OrderBook>/</OrderBook>
          </div>
          <div className="grid flex-1 border">
            <div className="title border-bottom text-light">Chart</div>
          </div>
          <div className="grid border">
            <div className="title border-bottom text-light">Markets</div>
            <MarketStatus />
          </div>
        </div>
        <div className="row-wrapper">
          <div className="grid border">
            <div className="title border-bottom text-light">Trade History</div>
            <TradeHistory />
          </div>
          <div className="grid flex-1 border">
            <div className="title border-bottom text-light">Trade</div>
          </div>
        </div>
        <div className="row-wrapper">
          <div className="grid border">
            <div className="title border-bottom text-light">TradeHistory</div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps)(App);
