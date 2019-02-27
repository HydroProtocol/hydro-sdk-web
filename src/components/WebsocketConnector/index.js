import React from 'react';
import { connect } from 'react-redux';
import BigNumber from 'bignumber.js';
import { loadAccountJwt } from '../../lib/session';
import { initOrderbook, updateOrderbook } from '../../actions/orderbook';
import env from '../../lib/env';
// import { accountBalanceLoaded } from '@share/actions/accounts';
import { setConfigs } from '../../actions/config';
// import { orderUpdate } from '@share/actions/orders';
// import { loadToken, updateTokenLockedBalances } from '@share/actions/tokens';
// import { marketTrade, tradeCompleted, tradeUpdate } from '@share/actions/trades';
// import { updateCommonTransaction } from '@share/actions/transactions';
// import { apiVersion } from '@share/api';
import { sleep } from '../../lib/utils';

const mapStateToProps = state => {
  return {
    address: state.account.get('address'),
    currentMarket: state.market.getIn(['markets', 'currentMarket']),
    isLoggedIn: state.account.get('isLoggedIn'),
    markets: state.market.getIn(['markets', 'data'])
  };
};

class WebsocketConnector extends React.PureComponent {
  constructor(props) {
    super(props);
    this.preEvents = [];
  }
  componentDidMount() {
    const { currentMarket, address, isLoggedIn } = this.props;
    this.connectWebsocket();
    if (currentMarket) {
      this.changeMarket(currentMarket.id);
    }

    if (address && isLoggedIn) {
      this.changeAccount();
    }
  }

  componentDidUpdate(prevProps) {
    const { address, currentMarket, isLoggedIn } = this.props;
    const isMarketChange = currentMarket && currentMarket !== prevProps.currentMarket;
    const loggedInChange = isLoggedIn !== prevProps.isLoggedIn;
    const accountChange = address !== prevProps.address;

    if (isMarketChange) {
      const market = this.props.currentMarket;
      this.changeMarket(market.id);
    }

    if (loggedInChange || accountChange) {
      if (address) {
        if (isLoggedIn) {
          this.changeAccount();
        } else {
          this.logoutLastAccount();
        }
      } else {
        this.logoutLastAccount();
      }
    }
  }

  componentWillUnmount() {
    this.logoutLastAccount();
    this.disconnectWebsocket();
  }

  render() {
    return null;
  }

  sendMessage = message => {
    if (!this.socket || this.socket.readyState !== 1) {
      this.preEvents.push(message);
      return;
    }

    this.socket.send(message);
  };

  changeMarket = marketId => {
    if (this.lastSubscribedChannel) {
      const m = JSON.stringify({
        type: 'unsubscribe',
        channels: [
          { name: 'full', marketIds: [this.lastSubscribedChannel] },
          { name: 'orderbook', marketIds: [this.lastSubscribedChannel] }
        ]
      });
      this.sendMessage(m);
    }

    this.lastSubscribedChannel = marketId;
    const message = JSON.stringify({
      type: 'subscribe',
      channels: [{ name: 'full', marketIds: [marketId] }, { name: 'orderbook', marketIds: [marketId] }]
    });
    this.sendMessage(message);
  };

  logoutLastAccount = () => {
    if (this.lastAccountAddress) {
      const message = JSON.stringify({
        type: 'accountLogout',
        account: this.lastAccountAddress
      });
      this.sendMessage(message);
      this.lastAccountAddress = null;
    }
  };

  changeAccount = () => {
    this.logoutLastAccount();
    const { address } = this.props;

    if (!address) {
      return;
    }

    const jwt = loadAccountJwt(address);

    if (!jwt) {
      return;
    }

    this.lastAccountAddress = address;

    const message = JSON.stringify({
      type: 'accountLogin',
      account: address,
      jwt
    });
    this.sendMessage(message);
  };

  disconnectWebsocket = () => {
    if (this.socket) {
      this.socket.close();
    }
  };

  connectWebsocket = () => {
    const { dispatch } = this.props;
    this.socket = new window.ReconnectingWebSocket(`${env.WS_ADDRESS}/v3`);
    this.socket.debug = false;
    this.socket.timeoutInterval = 5400;
    this.socket.onopen = async event => {
      dispatch(setConfigs({ websocketConnected: true }));

      // auto login & subscribe channel after reconnect
      this.changeAccount();
      if (this.lastSubscribedChannel) {
        this.changeMarket(this.lastSubscribedChannel);
      }

      // I believe this is a chrome bug
      // socket is not ready in onopen block?
      while (this.socket.readyState !== 1) {
        await sleep(30);
      }
      while (this.preEvents.length > 0) {
        this.socket.send(this.preEvents.shift());
      }
    };
    this.socket.onclose = event => {
      dispatch(setConfigs({ websocketConnected: false }));
    };
    this.socket.onerror = event => {
      console.log('wsError', event);
    };
    this.socket.onmessage = event => {
      const data = JSON.parse(event.data);
      const { currentMarket, account, selected, markets } = this.props;
      switch (data.type) {
        case 'level2OrderbookSnapshot':
          if (data.marketId !== currentMarket.id) {
            break;
          }
          const bids = data.bids.map(priceLevel => [new BigNumber(priceLevel.price), new BigNumber(priceLevel.amount)]);
          const asks = data.asks.map(priceLevel => [new BigNumber(priceLevel.price), new BigNumber(priceLevel.amount)]);
          dispatch(initOrderbook(bids, asks));
          break;
        case 'level2OrderbookUpdate':
          if (data.marketId !== currentMarket.id) {
            break;
          }
          data.changes.forEach(change => {
            dispatch(updateOrderbook(change.side, new BigNumber(change.price), new BigNumber(change.amount)));
          });
          break;
        case 'orderUpdate':
          if (data.order.marketId !== currentMarket.id) {
            break;
          }
          // dispatch(orderUpdate(data.order));
          break;
        case 'balance':
          // dispatch(
          //   updateTokenLockedBalances({
          //     [data.symbol]: data.amount
          //   })
          // );
          break;
        case 'tradeUpdate':
          if (data.trade.marketId !== currentMarket.id) {
            break;
          }
          // dispatch(tradeUpdate(data.trade));
          // dispatch(tradeCompleted(data.trade));
          break;
        case 'trade_success':
          if (data.marketId !== currentMarket.id) {
            break;
          }
          const trade = {
            id: data.id,
            marketId: data.marketId,
            amount: data.amount,
            price: data.price,
            status: 'successful',
            side: data.makerSide === 'sell' ? 'buy' : 'sell',
            executedAt: data.time,
            createdAt: data.time
          };
          // dispatch(marketTrade(trade));

          if (account) {
            // const _loadToken = () => {
            //   dispatch(
            //     loadToken(
            //       selected,
            //       currentMarket.baseTokenAddress,
            //       currentMarket.baseToken,
            //       currentMarket.baseTokenDecimals
            //     )
            //   );
            //   dispatch(
            //     loadToken(
            //       selected,
            //       currentMarket.quoteTokenAddress,
            //       currentMarket.quoteToken,
            //       currentMarket.quoteTokenDecimals
            //     )
            //   );
            // };
            // for (let i = 0; i < 10; i++) {
            //   setTimeout(_loadToken, 3000 * i);
            // }
          }
          break;
        case 'commonTransactionUpdate':
          const tx = data.transaction;
          const symbol = tx.data.symbol;

          const reloadBalance = () => {
            const market = markets.find(m => !!m && (m.baseToken === symbol || m.quoteToken === symbol));
            let address, decimals;

            if (market && symbol === market.quoteToken) {
              address = market.quoteTokenAddress;
              decimals = market.quoteTokenDecimals;
            } else if (market && symbol === market.baseToken) {
              address = market.baseTokenAddress;
              decimals = market.baseTokenDecimals;
            }

            if (address) {
              // dispatch(loadToken(selected, address, symbol, decimals));
            }

            if (
              account &&
              (tx.type === 'WRAP_ETHER' ||
                tx.type === 'UNWRAP_ETHER' ||
                tx.type === 'WRAP_TRON' ||
                tx.type === 'UNWRAP_TRON')
            ) {
              // blockchain.getBalance(account, (err, balance) => {
              //   dispatch(accountBalanceLoaded(account, selected, balance));
              // });
            }
          };
          // dispatch(updateCommonTransaction(tx));

          for (let i = 0; i < 10; i++) {
            setTimeout(reloadBalance, 3000 * i);
          }

          break;
        default:
          break;
      }
    };
  };
}

export default connect(mapStateToProps)(WebsocketConnector);
