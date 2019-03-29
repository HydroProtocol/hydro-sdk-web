import React from 'react';
import { connect } from 'react-redux';
import { loadTrades } from '../../actions/account';
import PerfectScrollbar from 'perfect-scrollbar';

const mapStateToProps = state => {
  return {
    address: state.account.get('address'),
    trades: state.account.get('trades'),
    isLoggedIn: state.account.get('isLoggedIn')
  };
};

class Trades extends React.PureComponent {
  componentDidMount() {
    const { isLoggedIn, dispatch } = this.props;
    if (isLoggedIn) {
      dispatch(loadTrades());
    }
  }

  componentDidUpdate(prevProps) {
    const { isLoggedIn, dispatch, trades } = this.props;
    if (isLoggedIn && isLoggedIn !== prevProps.isLoggedIn) {
      dispatch(loadTrades());
    }

    if (trades !== prevProps.trades) {
      this.ps && this.ps.update();
    }
  }

  render() {
    const { trades, address } = this.props;
    return (
      <div className="trades flex-1 position-relative overflow-hidden" ref={ref => this.setRef(ref)}>
        <table className="table table-light">
          <thead>
            <tr className="text-secondary">
              <th>Pair</th>
              <th>Side</th>
              <th className="text-right">Price</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {trades
              .toArray()
              .reverse()
              .map(([id, trade]) => {
                let side;
                if (trade.taker === address) {
                  side = trade.takerSide;
                } else {
                  side = trade.takerSide === 'buy' ? 'sell' : 'buy';
                }

                let status;
                let className = 'text-right ';
                if (trade.status === 'successful') {
                  status = <i className="fa fa-check" aria-hidden="true" />;
                  className += 'text-success';
                } else if (trade.status === 'pending') {
                  status = <i className="fa fa-circle-o-notch fa-spin" aria-hidden="true" />;
                } else {
                  className += 'text-danger';
                  status = <i className="fa fa-close" aria-hidden="true" />;
                }
                return (
                  <tr key={id}>
                    <td>{trade.marketID}</td>
                    <td className={`${side === 'sell' ? 'text-danger' : 'text-success'}`}>{side}</td>
                    <td className={`text-right${side === 'sell' ? ' text-danger' : ' text-success'}`}>{trade.price}</td>
                    <td className="text-right">{trade.amount}</td>
                    <td className={className}>{status}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    );
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

export default connect(mapStateToProps)(Trades);
