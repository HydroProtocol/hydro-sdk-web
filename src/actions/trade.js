import axios from 'axios';
import { signOrder } from '../lib/web3';
import env from '../lib/env';
import { loadAccountJwt } from '../lib/session';

export const TRADE_FORM_ID = 'TRADE';

export const trade = (side, price, amount, orderType = 'limit', expires = 86400 * 365 * 1000) => {
  return async (dispatch, getState) => {
    try {
      const result = await dispatch(createOrder(side, price, amount, orderType, expires));
      if (result.status === 0) {
        alert('Successfully created order');
        return true;
      } else {
        alert(result.desc);
      }
    } catch (e) {
      alert(e);
    }
    return false;
  };
};

const createOrder = (side, price, amount, orderType, expires) => {
  return async (dispatch, getState) => {
    const state = getState();
    const address = state.account.get('address');
    const currentMarket = state.market.getIn(['markets', 'currentMarket']);
    const jwt = loadAccountJwt(address);

    const buildOrderResponse = await axios.post(
      `${env.API_ADDRESS}/v3/orders/build`,
      {
        amount,
        price,
        side,
        expires,
        orderType,
        marketId: currentMarket.id
      },
      {
        headers: {
          'Jwt-Authentication': jwt
        }
      }
    );

    if (buildOrderResponse.data.status !== 0) {
      return buildOrderResponse.data;
    }
    const orderParams = buildOrderResponse.data.data.order;
    const { id: orderId, json: order } = orderParams;
    try {
      const signature = await signOrder(address, order);
      const placeOrderResponse = await axios.post(
        `${env.API_ADDRESS}/v3/orders`,
        {
          orderId,
          signature,
          method: 1
        },
        {
          headers: {
            'Jwt-Authentication': jwt
          }
        }
      );

      return placeOrderResponse.data;
    } catch (e) {
      alert(e);
    }
  };
};
