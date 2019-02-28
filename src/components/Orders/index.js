import React from 'react';
import { connect } from 'react-redux';
import { loadOrders, cancelOrder } from '../../actions/account';
import BigNumber from 'bignumber.js';

const mapStateToProps = state => {
  return {
    orders: state.account.get('orders'),
    isLoggedIn: state.account.get('isLoggedIn'),
    currentMarket: state.market.getIn(['markets', 'currentMarket'])
  };
};

class Orders extends React.PureComponent {
  componentDidMount() {
    const { isLoggedIn, dispatch } = this.props;
    if (isLoggedIn) {
      dispatch(loadOrders());
    }
  }

  componentDidUpdate(prevProps) {
    const { isLoggedIn, dispatch, currentMarket } = this.props;
    const marketChange = currentMarket !== prevProps.currentMarket;
    const loggedInChange = isLoggedIn !== prevProps.isLoggedIn;
    if (isLoggedIn && (marketChange || loggedInChange)) {
      dispatch(loadOrders());
    }
  }

  render() {
    const { orders, dispatch } = this.props;
    return (
      <div className="orders">
        <table className="table table-dark">
          <thead>
            <tr>
              <th>Pair</th>
              <th>Side</th>
              <th className="text-right">Price</th>
              <th className="text-right">Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders
              .toArray()
              .reverse()
              .map(([id, order]) => {
                if (order.availableAmount.eq(0)) {
                  return;
                }
                const symbol = order.marketId.split('-')[0];
                return (
                  <tr key={id}>
                    <td>{order.marketId}</td>
                    <td className={order.side === 'sell' ? 'text-danger' : 'text-success'}>{order.side}</td>
                    <td className="text-right">{order.price.toFixed(8)}</td>
                    <td className="text-right">
                      {order.availableAmount.toFixed(8)} {symbol}
                    </td>
                    <td className="text-right">
                      <button className="btn btn-outline-danger" onClick={() => dispatch(cancelOrder(order.id))}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    );
  }
}

export default connect(mapStateToProps)(Orders);
