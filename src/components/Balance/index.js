import React from 'react';
import { connect } from 'react-redux';
import { loadToken, WRAP_TYPE, setWrapType } from '../../actions/account';
import { toUnitAmount, isTokenApproved } from '../../lib/utils';
import BigNumber from 'bignumber.js';
import { enable, disable } from '../../lib/web3';
import Wrap from '../Wrap';

const mapStateToProps = state => {
  return {
    currentMarket: state.market.getIn(['markets', 'currentMarket']),
    WETH: state.config.get('WETH'),
    tokenBalances: state.account.get('tokenBalances'),
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
    if (address && isLoggedIn) {
      dispatch(loadToken(currentMarket.baseTokenAddress, currentMarket.baseToken));
      dispatch(loadToken(currentMarket.quoteTokenAddress, currentMarket.quoteToken));
    }
  }

  componentDidUpdate(prevProps) {
    const { currentMarket, address, dispatch, isLoggedIn } = this.props;
    const marketChange = currentMarket !== prevProps.currentMarket;
    const loggedInChange = isLoggedIn !== prevProps.isLoggedIn;
    const accountChange = address !== prevProps.address;
    if (isLoggedIn && address && (marketChange || loggedInChange || accountChange)) {
      dispatch(loadToken(currentMarket.baseTokenAddress, currentMarket.baseToken));
      dispatch(loadToken(currentMarket.quoteTokenAddress, currentMarket.quoteToken));
    }
  }

  render() {
    const { currentMarket, dispatch, WETH } = this.props;
    return (
      <div className="balance flex-1 column-center text-white" style={{ maxWidth: 450 }}>
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

        {currentMarket.quoteToken === WETH.symbol && (
          <div className="flex justify-content-center" style={{ padding: 10 }}>
            <button
              className="btn btn-success col-5"
              data-toggle="modal"
              data-target="#wrap"
              onClick={() => dispatch(setWrapType(WRAP_TYPE.WRAP))}>
              WRAP
            </button>
            <div className="col-2" />
            <button
              className="btn btn-danger col-5"
              data-toggle="modal"
              data-target="#wrap"
              onClick={() => dispatch(setWrapType(WRAP_TYPE.UNWRAP))}>
              UNWRAP
            </button>
            <Wrap />
          </div>
        )}
      </div>
    );
  }

  renderTokenPanel(symbol, address, decimals) {
    const { tokenBalances, allowances, lockedBalances, dispatch } = this.props;
    const balance = toUnitAmount(tokenBalances.get(symbol) || new BigNumber(0), decimals);
    const lockedBalance = toUnitAmount(lockedBalances.get(symbol) || new BigNumber('0'), decimals);
    const isApproved = isTokenApproved(allowances.get(symbol) || new BigNumber('0'));
    return (
      <div className="border rounded-sm" style={{ padding: 10, margin: 10 }}>
        <div className="flex">
          <div className="col-6 text-right">{symbol} Balance:</div>
          <div className="col-6">
            {balance.toFixed(8)} {symbol}
          </div>
        </div>
        <div className="flex">
          <div className="col-6 text-right">{symbol} Locked:</div>
          <div className="col-6">
            {lockedBalance.toFixed(8)} {symbol}
          </div>
        </div>
        <div className="flex">
          <div className="col-6 text-right">{symbol} Available:</div>
          <div className="col-6">
            {balance.minus(lockedBalance).toFixed(8)} {symbol}
          </div>
        </div>
        <div className="flex">
          <div className="flex col-6 justify-content-end align-items-center">
            {isApproved ? 'Disable' : 'Enable'} {symbol}
          </div>
          <div className="col-6">
            {isApproved ? (
              <button className="btn btn-danger" onClick={() => dispatch(disable(address, symbol))}>
                Disable
              </button>
            ) : (
              <button className="btn btn-success" onClick={() => dispatch(enable(address, symbol))}>
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
