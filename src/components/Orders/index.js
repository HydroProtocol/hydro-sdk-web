import React from 'react';
import { connect } from 'react-redux';
import { loadOrders, cancelOrder } from '../../actions/account';

const mapStateToProps = state => {
  return {
    orders: state.account.get('orders'),
    isLoggedIn: state.account.get('isLoggedIn')
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
    const { isLoggedIn, dispatch } = this.props;
    if (isLoggedIn && isLoggedIn !== prevProps.isLoggedIn) {
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
                  return null;
                }
                const symbol = order.marketId.split('-')[0];
                return (
                  <tr key={id}>
                    <td>{order.marketId}</td>
                    <td className={order.side === 'sell' ? 'text-danger' : 'text-success'}>{order.side}</td>
                    <td className="text-right">{order.price.toFixed()}</td>
                    <td className="text-right">
                      {order.availableAmount.toFixed()} {symbol}
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
