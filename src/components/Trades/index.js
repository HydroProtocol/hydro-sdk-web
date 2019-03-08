import React from 'react';
import { connect } from 'react-redux';
import { loadTrades } from '../../actions/account';

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
    const { isLoggedIn, dispatch } = this.props;
    if (isLoggedIn && isLoggedIn !== prevProps.isLoggedIn) {
      dispatch(loadTrades());
    }
  }

  render() {
    const { trades, address } = this.props;
    return (
      <div className="trades flex-1 bg-grey">
        <table className="table table-dark bg-grey">
          <thead>
            <tr className="text-secondary">
              <th>Pair</th>
              <th>Side</th>
              <th className="text-right">Price</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trades
              .toArray()
              .reverse()
              .map(([id, trade]) => {
                const side = trade.buyer === address ? 'buy' : 'sell';

                let status, className;
                if (trade.status === 'successful') {
                  status = <i className="fa fa-check" aria-hidden="true" />;
                  className = 'text-success';
                } else if (trade.status === 'pending') {
                  status = <i className="fa fa-circle-o-notch fa-spin" aria-hidden="true" />;
                } else {
                  className = 'text-danger';
                  status = <i className="fa fa-close" aria-hidden="true" />;
                }
                return (
                  <tr key={id}>
                    <td>{trade.pair}</td>
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
}

export default connect(mapStateToProps)(Trades);
