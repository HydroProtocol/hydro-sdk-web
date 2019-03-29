import React from 'react';
import { connect } from 'react-redux';
import './styles.scss';

class OrderBook extends React.Component {
  constructor(props) {
    super(props);
    this.lastUpdatedAt = null;
    this.forceRenderTimer = null;
  }

  // max 1 render in 1 second
  shouldComponentUpdate() {
    if (this.lastUpdatedAt) {
      const diff = new Date().valueOf() - this.lastUpdatedAt;
      const shouldRender = diff > 1000;

      if (!shouldRender && !this.forceRenderTimer) {
        this.forceRenderTimer = setTimeout(() => {
          this.forceUpdate();
          this.forceRenderTimer = null;
        }, 1000 - diff);
      }
      return shouldRender;
    } else {
      return true;
    }
  }

  componentWillUnmount() {
    if (this.forceRenderTimer) {
      clearInterval(this.forceRenderTimer);
    }
  }

  componentDidUpdate() {
    this.lastUpdatedAt = new Date();
  }

  render() {
    let { bids, asks, websocketConnected, currentMarket } = this.props;

    return (
      <>
        <div className="title">
          <div>Orderbook</div>
          <div className="text-secondary">Available Bid and Ask orders</div>
        </div>
        <div className="orderbook text-white">
          <div className="flex header text-secondary">
            <div className="col-6">Price</div>
            <div className="col-6">Amount</div>
          </div>
          <div style={{ height: '100%' }}>
            <div className="asks flex flex-column flex-column-reverse">
              {asks
                .slice(-20)
                .reverse()
                .toArray()
                .map(([price, amount]) => {
                  return (
                    <div className="flex" key={price.toString()} style={{ height: '5%' }}>
                      <div className="col-6 text-danger">{price.toFixed(currentMarket.priceDecimals)}</div>
                      <div className="col-6 orderbook-amount">{amount.toFixed(currentMarket.amountDecimals)}</div>
                    </div>
                  );
                })}
            </div>
            <div className="status">
              {websocketConnected ? (
                <strong className="col-6 text-success">
                  <i className="fa fa-circle" aria-hidden="true" /> RealTime
                </strong>
              ) : (
                <strong className="col-6 text-danger">
                  <i className="fa fa-circle" aria-hidden="true" /> Disconnected
                </strong>
              )}
            </div>
            <div className="bids">
              {bids
                .slice(0, 20)
                .toArray()
                .map(([price, amount]) => {
                  return (
                    <div className="flex" key={price.toString()} style={{ height: '5%' }}>
                      <div className="col-6 text-success">{price.toFixed(currentMarket.priceDecimals)}</div>
                      <div className="col-6 orderbook-amount">{amount.toFixed(currentMarket.amountDecimals)}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </>
    );
  }
}

const mapStateToProps = state => {
  return {
    asks: state.market.getIn(['orderbook', 'asks']),
    bids: state.market.getIn(['orderbook', 'bids']),
    loading: false,
    currentMarket: state.market.getIn(['markets', 'currentMarket']),
    websocketConnected: state.config.get('websocketConnected'),
    theme: state.config.get('theme')
  };
};

export default connect(mapStateToProps)(OrderBook);
