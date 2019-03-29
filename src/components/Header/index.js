import React from 'react';
import { loginRequest, enableMetamask } from '../../actions/account';
import { updateCurrentMarket } from '../../actions/markets';
import { connect } from 'react-redux';

const mapStateToProps = state => {
  return {
    address: state.account.get('address'),
    isLoggedIn: state.account.get('isLoggedIn'),
    currentMarket: state.market.getIn(['markets', 'currentMarket']),
    markets: state.market.getIn(['markets', 'data'])
  };
};

class Header extends React.PureComponent {
  componentDidMount() {
    this.props.dispatch(enableMetamask());
  }

  render() {
    const { currentMarket, markets, dispatch } = this.props;
    return (
      <div className="navbar bg-blue navbar-expand-lg">
        <img className="navbar-brand" src={require('../../images/hydro.svg')} alt="hydro" />
        <div className="dropdown navbar-nav mr-auto">
          <button
            className="btn btn-primary dropdown-toggle"
            type="button"
            id="dropdownMenuButton"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false">
            {currentMarket && currentMarket.id}
          </button>
          <div
            className="dropdown-menu"
            aria-labelledby="dropdownMenuButton"
            style={{ maxHeight: 350, overflow: 'auto' }}>
            {markets.map(market => {
              return (
                <button
                  className="dropdown-item"
                  key={market.id}
                  onClick={() => currentMarket.id !== market.id && dispatch(updateCurrentMarket(market))}>
                  {market.id}
                </button>
              );
            })}
          </div>
        </div>
        {this.renderAccount()}
      </div>
    );
  }

  renderAccount() {
    const { address, dispatch, isLoggedIn } = this.props;
    if (isLoggedIn && address) {
      return <div className="btn btn-outline-light">{address}</div>;
    } else if (address) {
      return (
        <button className="btn btn-outline-light" onClick={() => dispatch(loginRequest(address))}>
          Click to connect Metamask
        </button>
      );
    } else {
      return (
        <div className="navbar-text text-white">
          Detecting... <i className="fa fa-spinner fa-spin" />
        </div>
      );
    }
  }
}

export default connect(mapStateToProps)(Header);
