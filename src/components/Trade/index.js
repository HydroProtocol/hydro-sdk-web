import React from 'react';
import { connect } from 'react-redux';
import { change, formValueSelector, Field } from 'redux-form';
import { TRADE_FORM_ID } from '../../actions/trade';
import { reduxForm } from 'redux-form';
import { trade } from '../../actions/trade';
import BigNumber from 'bignumber.js';
import { loadHotDiscountRules, getHotTokenAmount } from '../../actions/fee';
import { calculateTrade } from '../../lib/tradeCalculator';

const validate = (values, props) => {
  let errors = {};
  return errors;
};

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
      <div className="trade flex-1 column-center" style={{ maxWidth: 450 }}>
        <ul className="nav nav-tabs border-0">
          <li className="nav-item col-6">
            <button
              className={`nav-link btn border-light btn-block text-center${side === 'buy' ? ' active' : ''}`}
              onClick={() => dispatch(change(TRADE_FORM_ID, 'side', 'buy'))}>
              Buy
            </button>
          </li>
          <li className="nav-item col-6">
            <button
              className={`nav-link btn border-light  btn-block text-center${side === 'sell' ? ' active' : ''}`}
              onClick={() => dispatch(change(TRADE_FORM_ID, 'side', 'sell'))}>
              Sell
            </button>
          </li>
        </ul>
        <form className="text-white" style={{ marginTop: 10 }} onSubmit={handleSubmit(() => this.submit())}>
          <div className="form-group">
            <label>Order Type</label>
            <Field className="form-control" name="orderType" component={'select'}>
              <option value="limit">Limit</option>
              {currentMarket.supportedOrderTypes.indexOf('market') > -1 && <option value="market">Market</option>}
            </Field>
          </div>
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
          <div className="form-group border" style={{ padding: 10 }}>
            <div>
              <span>Fee</span>
              <span>
                ≈ {gasFee.plus(tradeFee).toFixed(currentMarket.priceDecimals)} {currentMarket.quoteToken}
              </span>
            </div>
            {orderType === 'market' && (
              <div>
                <span>Minimum TotalAmount</span>
                <span>
                  ≈{' '}
                  {side === 'buy' ? (
                    <span>
                      {marketOrderWorstTotalBase.toFixed(currentMarket.amountDecimals)} {currentMarket.baseToken}
                    </span>
                  ) : (
                    <span>
                      {marketOrderWorstTotalQuote.toFixed(currentMarket.amountDecimals)} {currentMarket.quoteToken}
                    </span>
                  )}
                </span>
              </div>
            )}
            <div>
              <span>Total Amount</span>
              <span>
                ≈{' '}
                {orderType === 'market' && side === 'buy' ? (
                  <span>
                    {totalBase.toFixed(currentMarket.amountDecimals)} {currentMarket.baseToken}
                  </span>
                ) : (
                  <span>
                    {total.toFixed(currentMarket.priceDecimals)} {currentMarket.quoteToken}
                  </span>
                )}
              </span>
            </div>
          </div>
          <button type="submit" className={`form-control btn ${side === 'buy' ? 'btn-success' : 'btn-danger'}`}>
            {side}
          </button>
        </form>
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
}

export default connect(mapStateToProps)(
  reduxForm({
    form: TRADE_FORM_ID,
    validate,
    destroyOnUnmount: false
  })(Trade)
);
