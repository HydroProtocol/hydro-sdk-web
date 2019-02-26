import React from 'react';
import { connect } from 'react-redux';
import BigNumber from 'bignumber.js';
import PerfectScrollbar from 'perfect-scrollbar';

const mapStateToProps = state => {
  return {
    tradeHistory: state.market.get('tradeHistory')
  };
};

class TradeHistory extends React.PureComponent {
  componentDidUpdate(prevProps) {
    const { tradeHistory } = this.props;
    if (tradeHistory !== prevProps.tradeHistory) {
      this.ps.update();
    }
  }

  render() {
    const { tradeHistory } = this.props;
    return (
      <div className="trade-history flex-1" ref={ref => this.setRef(ref)}>
        <table className="table table-dark table-hover table-sm">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Price</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {tradeHistory.reverse().map(trade => {
              const colorGreen = trade.side === 'buy';
              return (
                <tr key={trade.id}>
                  <td>{new BigNumber(trade.amount).toFixed(5)}</td>
                  <td className={[colorGreen ? 'text-success' : 'text-danger'].join(' ')}>
                    {new BigNumber(trade.price).toFixed(8)}
                    {trade.side === 'buy' ? (
                      <i className="fa fa-arrow-up" aria-hidden="true" />
                    ) : (
                      <i className="fa fa-arrow-down" aria-hidden="true" />
                    )}
                  </td>
                  <td>{trade.executedAt}</td>
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

export default connect(mapStateToProps)(TradeHistory);
