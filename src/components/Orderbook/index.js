import BigNumber from 'bignumber.js';
import PerfectScrollbar from 'perfect-scrollbar';
import React from 'react';
import { connect } from 'react-redux';
import { memoryOrderbook } from '../../lib/orderbook';
import { CanvasOrderbook } from '../../lib/orderbookCanvas.js';
import './styles.scss';

const mapStateToProps = state => {
  let spread;

  const bestAsk = state.market.get('orderbook').get('bestAsk');
  const bestbid = state.market.get('orderbook').get('bestBid');

  if (bestAsk && bestbid) {
    spread = bestAsk.minus(bestbid);
  } else {
    spread = null;
  }

  return {
    currentMarket: state.market.getIn(['markets', 'currentMarket']),
    spread,
    websocketConnected: state.config.get('websocketConnected')
  };
};

class OrderBook extends React.PureComponent {
  constructor(props) {
    super(props);
    this.columnsWidth = [0.32, 0.32, 0.32];
    this.asksBook = null;
    this.bidsBook = null;
  }

  getCommonOptions() {
    const { currentMarket } = this.props;

    const priceDecimals = currentMarket ? currentMarket.priceDecimals : 18;
    const amountDecimals = currentMarket ? currentMarket.amountDecimals : 5;
    return {
      priceDecimals,
      amountDecimals,
      deleteDelay: 300,
      updateDelay: 2000,
      columnsWidth: this.columnsWidth,
      dataOrder: 'asc',
      showFPS: false,
      height: 1000,
      rowHeight: 20,
      fontSize: priceDecimals >= 12 ? 11 : 12,
      priceRightAt: 100,
      amountRightAt: 200,
      myAmountRightAt: 180
    };
  }

  componentDidMount() {
    const { setTradeForm } = this.props;
    const commonOptions = this.getCommonOptions();

    let needScrollMiddle = true;
    const tryScrollToMiddel = () => {
      if (!this.orderbookContainer) {
        return;
      }

      if (!needScrollMiddle) {
        return;
      }

      const ref = this.orderbookContainer;

      ref.scrollTop = commonOptions.height - ref.parentElement.clientHeight / 2 + 20;
      if (ref.scrollTop === 0) {
        return;
      }
      needScrollMiddle = false;
    };

    this.asksBook = new CanvasOrderbook('asks-orderbook', {
      ...commonOptions,
      drawFromBottom: true,
      side: 'sell',
      priceColor: '#ee494c',
      onClick: result => {
        setTradeForm({
          side: result.clickOnPriceSide ? 'sell' : 'buy',
          type: 'limit',
          price: result.price,
          amount: result.clickOnPriceSide ? null : result.totalAmount
        });
      },
      afterDraw: () => {
        tryScrollToMiddel();
      }
    });

    this.bidsBook = new CanvasOrderbook('bids-orderbook', {
      ...commonOptions,
      drawFromBottom: false,
      side: 'buy',
      dataOrder: 'desc',
      priceColor: '#41a275',
      onClick: result => {
        setTradeForm({
          side: result.clickOnPriceSide ? 'buy' : 'sell',
          type: 'limit',
          price: result.price,
          amount: result.clickOnPriceSide ? null : result.totalAmount
        });
      },
      afterDraw: () => {
        tryScrollToMiddel();
      }
    });

    this.bidsBook.start();
    this.asksBook.start();
  }

  componentDidUpdate(prevProps) {
    const { currentMarket } = this.props;

    if (currentMarket !== prevProps.currentMarket) {
      const priceDecimals = currentMarket.priceDecimals;
      const amountDecimals = currentMarket.amountDecimals;
      const commonOptions = this.getCommonOptions();

      if (this.bidsBook) {
        this.bidsBook.updateOptions({ priceDecimals, amountDecimals, fontSize: commonOptions.fontSize });
      }
      if (this.asksBook) {
        this.asksBook.updateOptions({ priceDecimals, amountDecimals, fontSize: commonOptions.fontSize });
      }
    }
  }

  componentWillUnmount() {
    if (this.bidsBook) {
      this.bidsBook.stop();
    }
    if (this.asksBook) {
      this.asksBook.stop();
    }
  }

  renderSpread() {
    const { spread, currentMarket } = this.props;

    return (
      <div>
        <span style={{ width: `${this.columnsWidth[0] * 100}%`, fontSize: 12 }} />
        <span style={{ width: `${this.columnsWidth[1] * 100}%`, textAlign: 'right' }}>
          {spread ? spread.toFixed(currentMarket.priceDecimals) : '--'}
        </span>
      </div>
    );
  }

  aggregationChange = direction => {
    const { currentMarket } = this.props;
    const aggregation = new BigNumber(memoryOrderbook.aggregation);

    if (direction === 'up') {
      if (aggregation.gte(100)) {
        return;
      }
      memoryOrderbook.updateAggregation(aggregation.mul(10).toString());
    } else {
      if (aggregation.lte(new BigNumber(0.1).pow(currentMarket.priceDecimals).toString())) {
        return;
      }
      memoryOrderbook.updateAggregation(aggregation.div(10).toString());
    }

    this.forceUpdate();
  };

  render() {
    return (
      <div className="orderbook">
        <div className="header bg-dark">
          <div style={{ width: `${this.columnsWidth[0] * 100}%`, textAlign: 'right' }}>Market Size</div>
          <div style={{ width: `${this.columnsWidth[1] * 100}%`, textAlign: 'right' }}>Price</div>
          <div style={{ width: `${this.columnsWidth[2] * 100}%`, textAlign: 'right' }}>My Size</div>
        </div>
        <div className="orderbookScrollContainer" ref={this.setRef}>
          <canvas id="asks-orderbook" />
          {this.renderSpread()}
          <canvas id="bids-orderbook" />
        </div>
      </div>
    );
  }

  setRef = ref => {
    if (!ref) {
      delete this.orderbookContainer;
      return;
    }
    this.ps = new PerfectScrollbar(ref, {
      suppressScrollX: true
    });

    this.orderbookContainer = ref;
  };
}

export default connect(mapStateToProps)(OrderBook);
