import React from 'react';
import { loginRequest } from '../../actions/account';
import { connect } from 'react-redux';

const mapStateToProps = state => {
  return {
    address: state.account.get('address'),
    isLoggedIn: state.account.get('isLoggedIn')
  };
};

class Header extends React.PureComponent {
  render() {
    return (
      <div className="navbar navbar-dark bg-dark">
        <img className="navbar-brand" src={require('../../images/hydro.svg')} alt="hydro" />
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
        <div className="navbar-text">
          Detecting... <i className="fa fa-spinner fa-spin" />
        </div>
      );
    }
  }
}

export default connect(mapStateToProps)(Header);
