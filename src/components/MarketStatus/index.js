import React from 'react';
import { connect } from 'react-redux';
import { listMarkets, updateCurrentMarket } from '../../actions/markets';
import PerfectScrollbar from 'perfect-scrollbar';
import BigNumber from 'bignumber.js';

const mapStateToProps = state => {
  return {
    markets: state.market.getIn(['markets', 'data']),
    marketStatus: state.market.getIn(['marketStatus', 'data']),
    currentMarket: state.market.getIn(['markets', 'currentMarket'])
  };
};

class MarketStatus extends React.PureComponent {
  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(listMarkets());
  }

  componentDidUpdate(prevProps) {
    const { marketStatus } = this.props;
    if (marketStatus !== prevProps.marketStatus) {
      this.ps.update();
    }
  }

  render() {
    const { marketStatus } = this.props;

    return (
      <div className="markets flex-1" ref={ref => this.setRef(ref)}>
        <table className="table table-dark table-hover table-sm">
          <thead>
            <tr>
              <th>Pair</th>
              <th>Market Price</th>
              <th>24H Volume</th>
            </tr>
          </thead>
          <tbody>
            {marketStatus.map(market => {
              return (
                <tr key={market.pair} onClick={() => this.onRowClick(market)} style={{ cursor: 'pointer' }}>
                  <td>{market.pair}</td>
                  <td>{new BigNumber(market.price24h || '0').toFixed(2)}</td>
                  <td>{market.quoteTokenVolume24h}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  onRowClick(market) {
    const { markets, currentMarket, dispatch } = this.props;

    if (currentMarket.id !== market.pair) {
      const selectMarket = markets.find(m => m.id === market.pair);
      dispatch(updateCurrentMarket(selectMarket));
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

export default connect(mapStateToProps)(MarketStatus);
