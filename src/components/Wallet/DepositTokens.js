import React from 'react';
import { connect } from 'react-redux';
import { loadTokens } from '../../actions/account';
import { toUnitAmount, isZeroAddress, zeroAddress } from '../../lib/utils';
import BigNumber from 'bignumber.js';
import { deposit, withdraw } from '../../lib/web3';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const modalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)'
  }
};

const mapStateToProps = state => {
  return {
    tokensInfo: state.account.get('tokensInfo'),
    address: state.account.get('address'),
    lockedBalances: state.account.get('lockedBalances'),
    ethBalance: toUnitAmount(state.account.get('ethBalance'), 18)
  };
};

class Tokens extends React.PureComponent {
  constructor() {
    super();

    this.state = {
      modalIsOpen: false,
      // withdraw
      depositAction: 'deposit',
      tokenSymbol: '',
      tokenAddress: '',
      amount: ''
    };
  }

  openModal() {
    this.setState({ modalIsOpen: true });
  }

  closeModal() {
    this.setState({ modalIsOpen: false });
  }

  componentDidMount() {
    const { address, dispatch } = this.props;
    if (address) {
      dispatch(loadTokens());
    }
  }

  componentDidUpdate(prevProps) {
    const { address, dispatch } = this.props;
    const accountChange = address !== prevProps.address;
    if (address && accountChange) {
      dispatch(loadTokens());
    }
  }

  clickAction(depositAction, tokenSymbol, tokenAddress) {
    this.setState({
      modalIsOpen: true,
      depositAction,
      tokenSymbol,
      tokenAddress
    });
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  render() {
    const { tokensInfo, lockedBalances, ethBalance } = this.props;
    let depositBalanceETH, availableBalanceETH, toolTipTitleETH;
    tokensInfo.toArray().map(([token, info]) => {
      const { address, decimals, depositBalance } = info.toJS();
      if (isZeroAddress(address)) {
        depositBalanceETH = depositBalance;
        const lockedBalance = lockedBalances.get(token, new BigNumber('0'));
        availableBalanceETH = toUnitAmount(depositBalance.minus(lockedBalance) || new BigNumber('0'), decimals).toFixed(
          5
        );
        toolTipTitleETH = `<div>In-Order: ${toUnitAmount(lockedBalance, decimals).toFixed(
          5
        )}</div><div>Deposit: ${toUnitAmount(depositBalance, decimals).toFixed(5)}</div>`;
      }
      return null;
    });
    return (
      <div className="flex-column">
        <div className="token flex flex-1">
          <div className="col-6">ETH</div>
          <div className="col-6 text-right">{ethBalance.toFixed(5)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <td>Token</td>
              <td>Account Balance</td>
              <td>Deposit Balance</td>
              <td>Available Balance</td>
              <td>Actions</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ETH</td>
              <td>{ethBalance.toFixed(5)}</td>
              <td>{toUnitAmount(depositBalanceETH, 18).toFixed(5)}</td>
              <td>
                <div
                  className="flex-column"
                  key={toolTipTitleETH}
                  data-html="true"
                  data-toggle="tooltip"
                  data-placement="right"
                  title={toolTipTitleETH}
                  ref={ref => window.$(ref).tooltip()}>
                  {availableBalanceETH}
                </div>
              </td>
              <td>
                <div className="btn-group" role="group" aria-label="deposit-withdraw">
                  <button
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={this.clickAction.bind(this, 'deposit', 'ETH', zeroAddress)}>
                    Deposit
                  </button>
                  <button
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={this.clickAction.bind(this, 'withdraw', 'ETH', zeroAddress)}>
                    Withdraw
                  </button>
                </div>
              </td>
            </tr>
            {tokensInfo.toArray().map(([token, info]) => {
              const { address, balance, decimals, depositBalance } = info.toJS();
              if (isZeroAddress(address)) {
                return null;
              }
              const lockedBalance = lockedBalances.get(token, new BigNumber('0'));
              const availableBalance = lockedBalance.gt(depositBalance)
                ? new BigNumber('0').toFixed(5)
                : toUnitAmount(depositBalance.minus(lockedBalance) || new BigNumber('0'), decimals).toFixed(5);
              const toolTipTitle = `<div>In-Order: ${toUnitAmount(lockedBalance, decimals).toFixed(
                5
              )}</div><div>Deposit: ${toUnitAmount(depositBalance, decimals).toFixed(5)}</div>`;
              return (
                <tr key={token}>
                  <td>{token}</td>
                  <td>{toUnitAmount(balance, decimals).toFixed(5)}</td>
                  <td>{toUnitAmount(depositBalance, decimals).toFixed(5)}</td>
                  <td>
                    <div
                      className="flex-column"
                      key={toolTipTitle}
                      data-html="true"
                      data-toggle="tooltip"
                      data-placement="right"
                      title={toolTipTitle}
                      ref={ref => window.$(ref).tooltip()}>
                      {availableBalance}
                    </div>
                  </td>
                  <td>
                    <div className="btn-group" role="group" aria-label="deposit-withdraw">
                      <button
                        type="button"
                        className="btn btn-light btn-sm"
                        onClick={this.clickAction.bind(this, 'deposit', token, address)}>
                        Deposit
                      </button>
                      <button
                        type="button"
                        className="btn btn-light btn-sm"
                        onClick={this.clickAction.bind(this, 'withdraw', token, address)}>
                        Withdraw
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Modal
          isOpen={this.state.modalIsOpen}
          onRequestClose={this.closeModal.bind(this)}
          style={modalStyles}
          contentLabel="deposit-withdraw-modal">
          <form className="flex-column text-secondary flex-1 justify-content-between block">
            <div className="form-group">
              <label className="text-secondary">
                {`${this.capitalize(this.state.depositAction)} ${this.state.tokenSymbol} Amount:`}
              </label>
              <div className="input-group">
                <input className="form-control" onChange={event => this.setState({ amount: event.target.value })} />
              </div>
            </div>
            <button type="button" className={`form-control btn btn-success`} onClick={this.submit.bind(this)}>
              {this.state.depositAction}
            </button>
          </form>
        </Modal>
      </div>
    );
  }

  submit() {
    const { dispatch } = this.props;
    const { depositAction, amount, tokenAddress } = this.state;

    if (depositAction === 'deposit') {
      dispatch(deposit(tokenAddress, amount));
    } else {
      dispatch(withdraw(tokenAddress, amount));
    }
  }
}

export default connect(mapStateToProps)(Tokens);
