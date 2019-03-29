import React from 'react';
import { connect } from 'react-redux';
import BigNumber from 'bignumber.js';
import PerfectScrollbar from 'perfect-scrollbar';
import moment from 'moment';

const mapStateToProps = state => {
  return {
    tradeHistory: state.market.get('tradeHistory'),
    currentMarket: state.market.getIn(['markets', 'currentMarket'])
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
    const { tradeHistory, currentMarket } = this.props;
    return (
      <>
        <div className="title">
          <div>TradeHistory</div>
          <div className="text-secondary">Hisotry</div>
        </div>
        <div className="trade-history flex-1 position-relative overflow-hidden col-12" ref={ref => this.setRef(ref)}>
          <table className="table table-light table-hover table-sm">
            <thead>
              <tr className="text-secondary">
                <th>Price</th>
                <th>Amount</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory
                .toArray()
                .reverse()
                .map(([id, trade]) => {
                  const colorGreen = trade.takerSide === 'buy';
                  return (
                    <tr key={trade.id}>
                      <td className={[colorGreen ? 'text-success' : 'text-danger'].join(' ')}>
                        {new BigNumber(trade.price).toFixed(currentMarket.priceDecimals)}
                        {trade.side === 'buy' ? (
                          <i className="fa fa-arrow-up" aria-hidden="true" />
                        ) : (
                          <i className="fa fa-arrow-down" aria-hidden="true" />
                        )}
                      </td>
                      <td>{new BigNumber(trade.amount).toFixed(currentMarket.amountDecimals)}</td>
                      <td className="text-secondary">{moment(trade.executedAt).format('hh:mm:ss')}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </>
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
