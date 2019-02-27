import React from 'react';
import { connect } from 'react-redux';
import { loadToken } from '../../actions/account';
import { toUnitAmount, isTokenApproved } from '../../lib/utils';
import BigNumber from 'bignumber.js';
import { enable, disable } from '../../lib/web3';

const mapStateToProps = state => {
  return {
    balances: state.account.get('balances'),
    allowances: state.account.get('allowances'),
    currentMarket: state.market.getIn(['markets', 'currentMarket']),
    address: state.account.get('address'),
    isLoggedIn: state.account.get('isLoggedIn'),
    lockedBalances: state.account.get('lockedBalances')
  };
};

class Balance extends React.PureComponent {
  componentDidMount() {
    const { currentMarket, address, dispatch, isLoggedIn } = this.props;
    if (address && currentMarket && isLoggedIn) {
      dispatch(loadToken(currentMarket.baseTokenAddress, currentMarket.baseToken));
      dispatch(loadToken(currentMarket.quoteTokenAddress, currentMarket.quoteToken));
    }
  }

  componentDidUpdate(prevProps) {
    const { currentMarket, address, dispatch, isLoggedIn } = this.props;
    const marketChange = currentMarket !== prevProps.currentMarket;
    const loggedInChange = isLoggedIn !== prevProps.isLoggedIn;
    const accountChange = address !== prevProps.address;
    if (isLoggedIn && address && currentMarket && (marketChange || loggedInChange || accountChange)) {
      dispatch(loadToken(currentMarket.baseTokenAddress, currentMarket.baseToken));
      dispatch(loadToken(currentMarket.quoteTokenAddress, currentMarket.quoteToken));
    }
  }

  render() {
    const { currentMarket } = this.props;
    return (
      <div className="balance flex-1 column-center text-white">
        {this.renderTokenPanel(
          currentMarket.baseToken,
          currentMarket.baseTokenAddress,
          currentMarket.baseTokenDecimals
        )}
        {this.renderTokenPanel(
          currentMarket.quoteToken,
          currentMarket.quoteTokenAddress,
          currentMarket.quoteTokenDecimals
        )}
        <div className="" />
      </div>
    );
  }

  renderTokenPanel(symbol, address, decimals) {
    const { balances, allowances, lockedBalances, dispatch } = this.props;
    const balance = toUnitAmount(balances.get(symbol) || new BigNumber(0), decimals);
    const lockedBalance = toUnitAmount(lockedBalances.get(symbol) || new BigNumber('0'), decimals);
    const isApproved = isTokenApproved(allowances.get(symbol) || new BigNumber('0'));
    return (
      <div className="border rounded-sm" style={{ padding: 10, margin: 10 }}>
        <div className="flex">
          <div className="col-6 text-right">{symbol} Balance:</div>
          <div className="col-6">
            {balance.toFixed(5)} {symbol}
          </div>
        </div>
        <div className="flex">
          <div className="col-6 text-right">{symbol} Locked:</div>
          <div className="col-6">
            {lockedBalance.toFixed(5)} {symbol}
          </div>
        </div>
        <div className="flex">
          <div className="col-6 text-right">{symbol} Available:</div>
          <div className="col-6">
            {balance.minus(lockedBalance).toFixed(5)} {symbol}
          </div>
        </div>
        <div className="flex">
          <div className="flex col-6 justify-content-end align-items-center">
            {isApproved ? 'Disable' : 'Enable'} {symbol}
          </div>
          <div className="col-6">
            {isApproved ? (
              <button className="btn btn-danger" onClick={() => dispatch(enable(address, symbol))}>
                Disable
              </button>
            ) : (
              <button className="btn btn-success" onClick={() => dispatch(disable(address, symbol))}>
                Enable
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps)(Balance);
