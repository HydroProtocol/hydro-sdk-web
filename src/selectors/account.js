import BigNumber from 'bignumber.js';

export const accountStateUtils = {
  tokenBalance: (accountState, symbol) => {
    return accountState.getIn(['balances', symbol], new BigNumber(0));
  },
  isTokenApproved: (accountState, symbol) => {
    return accountState.getIn(['allowances', symbol], new BigNumber(0)).gt(10 ** 30);
  },
  tokenLockedBalance: (accountState, symbol) => {
    return accountState.getIn(['lockedBalances', symbol], new BigNumber(0));
  },
  tokenAvailableBalance: (accountState, symbol) => {
    return accountState
      .getIn(['balances', symbol], new BigNumber(0))
      .minus(accountState.getIn(['lockedBalances', symbol], new BigNumber(0)));
  },
  isTokenLoading: (accountState, symbol) => {
    return (
      accountState.getIn(['allowancesLoading', symbol]) !== false ||
      accountState.getIn(['balancesLoading', symbol]) !== false ||
      !accountState.get('lockedLoaded')
    );
  },
  isTokenFirstLoaded: (accountState, symbol) => {
    return accountState.get('balancesFirstLoaded').get(symbol) === true;
  },
  baseCurrencyBalance: (accountState, unit) => {
    switch (unit) {
      case 'WEI':
        return accountState.get('balance');
      case 'ETH':
        return accountState.get('balance', new BigNumber('0')).div(Math.pow(10, 18));
      default:
        throw new Error('WRONG UNIT');
    }
  }
};
