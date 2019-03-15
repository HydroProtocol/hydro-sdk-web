import React from 'react';
import { connect } from 'react-redux';
import PerfectScrollbar from 'perfect-scrollbar';
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
    const { isLoggedIn, dispatch, orders } = this.props;
    if (isLoggedIn && isLoggedIn !== prevProps.isLoggedIn) {
      dispatch(loadOrders());
    }
    if (orders !== prevProps.orders) {
      this.ps && this.ps.update();
    }
  }

  render() {
    const { orders, dispatch } = this.props;
    return (
      <div className="orders flex-1 bg-grey position-relative overflow-hidden col-12" ref={ref => this.setRef(ref)}>
        <table className="table table-dark bg-grey">
          <thead>
            <tr className="text-secondary">
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

  setRef(ref) {
    if (ref) {
      this.ps = new PerfectScrollbar(ref, {
        suppressScrollX: true,
        maxScrollbarLength: 20
      });
    }
  }
}

export default connect(mapStateToProps)(Orders);
