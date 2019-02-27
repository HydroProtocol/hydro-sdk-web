import React from 'react';
import { connect } from 'react-redux';
import { change, formValueSelector, Field } from 'redux-form';
import { TRADE_FORM_ID } from '../../actions/trade';
import { reduxForm } from 'redux-form';
import { trade } from '../../actions/trade';
import BigNumber from 'bignumber.js';

const validate = (values, props) => {
  let errors = {};
  return errors;
};

const mapStateToProps = state => {
  const selector = formValueSelector(TRADE_FORM_ID);
  return {
    initialValues: {
      side: 'buy',
      orderType: 'limit',
      amount: new BigNumber(0),
      price: new BigNumber(0)
    },
    currentMarket: state.market.getIn(['markets', 'currentMarket']),
    isLoggedIn: state.account.get('isLoggedIn'),
    side: selector(state, 'side'),
    orderType: selector(state, 'orderType'),
    amount: selector(state, 'amount'),
    price: selector(state, 'price')
  };
};

class Trade extends React.PureComponent {
  render() {
    const { dispatch, side, handleSubmit, currentMarket } = this.props;
    if (!currentMarket) {
      return null;
    }

    return (
      <div className="trade flex-1 column-center ">
        <ul className="nav nav-tabs border-0">
          <li className="nav-item col-6">
            <a
              className={`nav-link btn border-light text-center${side === 'buy' ? ' active' : ''}`}
              onClick={() => dispatch(change(TRADE_FORM_ID, 'side', 'buy'))}>
              Buy
            </a>
          </li>
          <li className="nav-item col-6">
            <a
              className={`nav-link btn border-light text-center${side === 'sell' ? ' active' : ''}`}
              onClick={() => dispatch(change(TRADE_FORM_ID, 'side', 'sell'))}>
              Sell
            </a>
          </li>
        </ul>
        <form className="text-white" style={{ padding: 15 }} onSubmit={handleSubmit(() => this.submit())}>
          <div className="form-group">
            <label>Price</label>
            <Field name="price" className="form-control" component={'input'} />
            <span className="unit text-dark">{currentMarket.quoteToken}</span>
          </div>
          <div className="form-group">
            <label>Amount</label>
            <Field name="amount" className="form-control" component={'input'} />
            <span className="unit text-dark">{currentMarket.baseToken}</span>
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
    let success;
    try {
      success = await dispatch(trade(side, price, amount, orderType));
    } catch (e) {
      console.log(e);
    }

    // if (success) {
    //   tradeWizardStepStatusChange(TradeWizardStep.TRADE, StepStatus.COMPLETE);
    // } else {
    //   tradeWizardStepStatusChange(TradeWizardStep.TRADE, StepStatus.ERROR);
    // }
  }
}

export default connect(mapStateToProps)(
  reduxForm({
    form: TRADE_FORM_ID,
    validate,
    destroyOnUnmount: false
  })(Trade)
);
