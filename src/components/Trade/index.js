import React from 'react';
import { connect } from 'react-redux';
import { change, formValueSelector, Field } from 'redux-form';
import { TRADE_FORM_ID } from '../../actions/trade';
import { reduxForm } from 'redux-form';
import { trade } from '../../actions/trade';
import BigNumber from 'bignumber.js';
import { loadHotDiscountRules, getHotTokenAmount } from '../../actions/fee';
import { calculateTrade } from '../../lib/tradeCalculator';
import PerfectScrollbar from 'perfect-scrollbar';

const mapStateToProps = state => {
  const selector = formValueSelector(TRADE_FORM_ID);
  const bids = state.market.getIn(['orderbook', 'bids']);
  const asks = state.market.getIn(['orderbook', 'asks']);

  return {
    initialValues: {
      side: 'buy',
      orderType: 'limit',
      amount: new BigNumber(0),
      price: new BigNumber(0),
      subtotal: new BigNumber(0),
      total: new BigNumber(0),
      totalBase: new BigNumber(0),
      feeRate: new BigNumber(0),
      gasFee: new BigNumber(0),
      hotDiscount: new BigNumber(1),
      tradeFee: new BigNumber(0),
      estimatedPrice: new BigNumber(0),
      marketOrderWorstPrice: new BigNumber(0),
      marketOrderWorstTotalQuote: new BigNumber(0),
      marketOrderWorstTotalBase: new BigNumber(0)
    },
    currentMarket: state.market.getIn(['markets', 'currentMarket']),
    hotTokenAmount: state.config.get('hotTokenAmount'),
    isLoggedIn: state.account.get('isLoggedIn'),
    price: new BigNumber(selector(state, 'price') || 0),
    amount: new BigNumber(selector(state, 'amount') || 0),
    total: new BigNumber(selector(state, 'total') || 0),
    totalBase: new BigNumber(selector(state, 'totalBase') || 0),
    subtotal: new BigNumber(selector(state, 'subtotal') || 0),
    feeRate: new BigNumber(selector(state, 'feeRate') || 0),
    gasFee: new BigNumber(selector(state, 'gasFee') || 0),
    estimatedPrice: new BigNumber(selector(state, 'estimatedPrice') || 0),
    marketOrderWorstPrice: new BigNumber(selector(state, 'marketOrderWorstPrice') || 0),
    marketOrderWorstTotalQuote: new BigNumber(selector(state, 'marketOrderWorstTotalQuote') || 0),
    marketOrderWorstTotalBase: new BigNumber(selector(state, 'marketOrderWorstTotalBase') || 0),
    hotDiscount: new BigNumber(selector(state, 'hotDiscount') || 1),
    tradeFee: new BigNumber(selector(state, 'tradeFee') || 0),
    side: selector(state, 'side'),
    orderType: selector(state, 'orderType'),
    bestBidPrice: bids.size > 0 ? bids.get(0)[0].toString() : null,
    bestAskPrice: asks.size > 0 ? asks.get(asks.size - 1)[0].toString() : null
  };
};

class Trade extends React.PureComponent {
  componentDidMount() {
    const { dispatch } = this.props;
    loadHotDiscountRules();
    this.interval = window.setInterval(() => {
      dispatch(getHotTokenAmount());
    }, 30 * 1000);
  }

  componentDidUpdate(prevProps) {
    const { currentMarket, reset } = this.props;
    if (currentMarket.id === prevProps.currentMarket.id) {
      this.updateFees(prevProps);
    } else {
      reset();
    }
  }

  render() {
    const {
      dispatch,
      side,
      handleSubmit,
      currentMarket,
      orderType,
      marketOrderWorstTotalBase,
      marketOrderWorstTotalQuote,
      total,
      totalBase,
      gasFee,
      tradeFee
    } = this.props;
    if (!currentMarket) {
      return null;
    }

    return (
      <div className="trade flex-1 flex-column">
        <ul className="nav nav-tabs border-0 bg-dark title column-center">
          <li className="nav-item">
            {/* eslint-disable-next-line */}
            <a
              className={`pull-right text-secondary text-center${side === 'buy' ? ' active' : ''}`}
              onClick={() => dispatch(change(TRADE_FORM_ID, 'side', 'buy'))}>
              Buy
            </a>
          </li>
          <li className="nav-item">
            {/* eslint-disable-next-line */}
            <a
              className={`pull-left text-secondary text-center${side === 'sell' ? ' active' : ''}`}
              onClick={() => dispatch(change(TRADE_FORM_ID, 'side', 'sell'))}>
              Sell
            </a>
          </li>
        </ul>
        <div className="bg-grey flex-1 position-relative overflow-hidden" ref={ref => this.setRef(ref)}>
          <form
            className="text-secondary flex-1"
            style={{ margin: '12px auto', padding: '0 24px', maxWidth: 450 }}
            onSubmit={handleSubmit(() => this.submit())}>
            {/* <div className="form-group">
              <label>Order Type</label>
              <Field className="form-control" name="orderType" component={'select'}>
                <option value="limit">Limit</option>
                {currentMarket.supportedOrderTypes.indexOf('market') > -1 && <option value="market">Market</option>}
              </Field>
            </div> */}
            {orderType === 'limit' && (
              <div className="form-group">
                <label>Price</label>
                <div className="input-group">
                  <Field name="price" className="form-control" component={'input'} />
                  <div className="input-group-append">
                    <span className="input-group-text">{currentMarket.quoteToken}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="form-group">
              <label>Amount</label>
              <div className="input-group">
                <Field name="amount" className="form-control" component={'input'} />
                <div className="input-group-append">
                  <span className="input-group-text">
                    {side === 'buy' && orderType === 'market' ? currentMarket.quoteToken : currentMarket.baseToken}
                  </span>
                </div>
              </div>
            </div>
            <div className="form-group">
              {orderType === 'market' && (
                <div className="flex">
                  <div className="flex-grow-1" />
                  <div className="text-white">
                    Minimum TotalAmount ≈{' '}
                    {side === 'buy'
                      ? `${marketOrderWorstTotalBase.toFixed(currentMarket.amountDecimals)} ${currentMarket.baseToken}`
                      : `${marketOrderWorstTotalQuote.toFixed(currentMarket.amountDecimals)} ${
                          currentMarket.quoteToken
                        }`}
                  </div>
                </div>
              )}
              <div className="flex" style={{ marginBottom: 6 }}>
                <div className="flex-grow-1">Total</div>
                <div className="text-white">
                  Fee ≈ {gasFee.plus(tradeFee).toFixed(currentMarket.priceDecimals)} {currentMarket.quoteToken}
                </div>
              </div>
              <input
                className="form-control"
                value={
                  orderType === 'market' && side === 'buy'
                    ? `${totalBase.toFixed(currentMarket.amountDecimals)} ${currentMarket.baseToken}`
                    : `${total.toFixed(currentMarket.priceDecimals)} ${currentMarket.quoteToken}`
                }
                disabled
              />
            </div>
            <button type="submit" className={`form-control btn ${side === 'buy' ? 'btn-success' : 'btn-danger'}`}>
              {side} {currentMarket.baseToken}
            </button>
          </form>
        </div>
      </div>
    );
  }

  async submit() {
    const { amount, price, side, orderType, dispatch } = this.props;
    try {
      await dispatch(trade(side, price, amount, orderType));
    } catch (e) {
      alert(e);
    }
  }

  updateFees(prevProps) {
    const {
      currentMarket,
      orderType,
      side,
      price,
      amount,
      hotTokenAmount,
      change,
      bestAskPrice,
      bestBidPrice
    } = this.props;

    if (
      orderType === prevProps.orderType &&
      side === prevProps.side &&
      price.eq(prevProps.price) &&
      amount.eq(prevProps.amount) &&
      hotTokenAmount.eq(prevProps.hotTokenAmount)
    ) {
      return;
    }
    const {
      asMakerFeeRate,
      asTakerFeeRate,
      gasFeeAmount,
      marketOrderMaxSlippage,
      pricePrecision,
      priceDecimals,
      amountDecimals
    } = currentMarket;

    const calculateParam = {
      orderType,
      side,
      price:
        orderType === 'market'
          ? side === 'sell'
            ? bestBidPrice || new BigNumber(0)
            : bestAskPrice || new BigNumber(0)
          : new BigNumber(price),
      amount: new BigNumber(amount),
      hotTokenAmount,
      gasFeeAmount,
      asMakerFeeRate,
      asTakerFeeRate,
      amountDecimals,
      priceDecimals
    };

    const calculateResult = calculateTrade(calculateParam);

    change('subtotal', calculateResult.subtotal);
    change('estimatedPrice', calculateResult.estimatedPrice);
    change('totalBase', calculateResult.totalBaseTokens);
    change('total', calculateResult.totalQuoteTokens);
    change('feeRate', calculateResult.feeRateAfterDiscount);
    change('gasFee', calculateResult.gasFeeAmount);
    change('hotDiscount', calculateResult.hotDiscount);
    change('tradeFee', calculateResult.tradeFeeAfterDiscount);

    if (orderType === 'market') {
      let marketOrderWorstPrice;

      const rate =
        side === 'buy'
          ? (marketOrderWorstPrice = new BigNumber(1).plus(marketOrderMaxSlippage))
          : (marketOrderWorstPrice = new BigNumber(1).minus(marketOrderMaxSlippage));

      marketOrderWorstPrice = new BigNumber(rate.multipliedBy(calculateParam.price).toPrecision(pricePrecision)).dp(
        priceDecimals,
        BigNumber.ROUND_DOWN
      );

      const calculateWorstResult = calculateTrade({ ...calculateParam, price: marketOrderWorstPrice });
      change('marketOrderWorstPrice', marketOrderWorstPrice);
      change('marketOrderWorstTotalQuote', calculateWorstResult.totalQuoteTokens);
      change('marketOrderWorstTotalBase', calculateWorstResult.totalBaseTokens);
    }
  }

  setRef(ref) {
    if (ref) {
      this.ps = new PerfectScrollbar(ref, {
        suppressScrollX: true,
        maxScrollbarLength: 20
      });
    }
  }
}

export default connect(mapStateToProps)(
  reduxForm({
    form: TRADE_FORM_ID,
    destroyOnUnmount: false
  })(Trade)
);
