import BigNumber from 'bignumber.js';
import Emittery from 'emittery';
import { store } from '../index';
import { setBestAsk, setBestBid } from '../../actions/orderbooks';

export const OrderbookEmittery = new Emittery();
class MemroyOrderbook {
  aggregatedAsks = [];
  aggregatedBids = [];
  marketId = null;
  aggregation = '0.00000001';
  bids = [];
  asks = [];
  bidsAmount = new BigNumber(0);
  asksAmount = new BigNumber(0);

  updateAggregateDataAtIndex = (side, index, delta) => {
    let aggregatedData;

    if (side === 'buy') {
      aggregatedData = this.aggregatedBids;
    } else {
      aggregatedData = this.aggregatedAsks;
    }

    aggregatedData[index][1] = aggregatedData[index][1].plus(delta);

    if (aggregatedData[index][1].eq(0)) {
      aggregatedData[index].deleting = true;
    } else {
      if (aggregatedData[index].deleting) {
        delete aggregatedData[index].deleting;
        delete aggregatedData[index].deletingTimer;
      }

      aggregatedData[index].updating = true;
      delete aggregatedData[index].updatingTimer;
    }
  };

  getMiddlePrice() {
    if (!this.bids[0] && !this.asks[0]) {
      return null;
    }

    if (!this.asks[0]) {
      return this.bids[0][0];
    }

    if (!this.bids[0]) {
      return this.asks[0][0];
    }

    return this.bids[0][0].add(this.asks[0][0]).div(2);
  }

  getSpread() {
    if (!this.bids[0]) {
      return null;
    }

    const bestBidPrice = this.bids[0][0];

    if (!this.asks[0]) {
      return null;
    }

    const bestAskPrice = this.asks[0][0];

    return bestAskPrice.minus(bestBidPrice);
  }

  bestBid() {
    return this.bids[0] ? this.bids[0][0] : null;
  }

  bestAsk() {
    return this.asks[0] ? this.asks[0][0] : null;
  }

  getAggregatePrice = (price, side) => {
    return price
      .div(this.aggregation)
      .round(0, side === 'buy' ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_CEIL)
      .times(this.aggregation);
  };

  reset = () => {
    this.bidsAmount = new BigNumber(0);
    this.asksAmount = new BigNumber(0);
    this.bids.splice(0, this.bids.length);
    this.aggregatedBids.splice(0, this.aggregatedBids.length);
    this.asks.splice(0, this.asks.length);
    this.aggregatedAsks.splice(0, this.aggregatedAsks.length);
  };

  updateAggregation = newAggregation => {
    this.aggregation = newAggregation;
    this.updateAggregatedDataFromRawData('buy');
    this.updateAggregatedDataFromRawData('sell');
  };

  updateAggregatedDataFromRawData = side => {
    let dataOrder, aggregatedData, rawData;
    if (side === 'buy') {
      dataOrder = 'desc';
      aggregatedData = this.aggregatedBids;
      rawData = this.bids;
    } else {
      dataOrder = 'asc';
      aggregatedData = this.aggregatedAsks;
      rawData = this.asks;
    }

    aggregatedData.splice(0, aggregatedData.length);
    for (let i = 0; i < rawData.length; i++) {
      const price = rawData[i][0];
      const amount = rawData[i][1];

      const aggregatePrice = this.getAggregatePrice(price, side);

      if (
        aggregatedData[aggregatedData.length - 1] &&
        aggregatePrice.eq(aggregatedData[aggregatedData.length - 1][0])
      ) {
        aggregatedData[aggregatedData.length - 1][1] = aggregatedData[aggregatedData.length - 1][1].plus(amount);
      } else {
        aggregatedData.push([aggregatePrice, amount, new BigNumber(0)]);
      }
    }

    sortData(aggregatedData, dataOrder);
  };

  setSnapshot = (_data, side, aggregation) => {
    memoryOrderbook.aggregation = aggregation;
    let dataOrder,
      rawData,
      totalAmount = new BigNumber(0);
    if (side === 'buy') {
      dataOrder = 'desc';
      rawData = this.bids;
    } else {
      dataOrder = 'asc';
      rawData = this.asks;
    }

    // tslint:disable-next-line
    for (let i = 0; i < _data.length; i++) {
      totalAmount = totalAmount.add(_data[i][1]);
      rawData.push(_data[i]);
    }

    if (side === 'buy') {
      this.bidsAmount = totalAmount;
    } else {
      this.asksAmount = totalAmount;
    }

    this.updateAggregatedDataFromRawData(side);
    sortData(rawData, dataOrder);

    if (rawData[0]) {
      if (side === 'buy') {
        store.dispatch(setBestBid(rawData[0][0]));
      } else {
        store.dispatch(setBestAsk(rawData[0][0]));
      }
    }
  };

  updateTotalAmount = (side, delta) => {
    if (side === 'buy') {
      this.bidsAmount = this.bidsAmount.add(delta);
    } else {
      this.asksAmount = this.asksAmount.add(delta);
    }
  };

  updateOrderbookData = (price, amount, side) => {
    let dataOrder, aggregatedData, rawData;
    if (side === 'buy') {
      dataOrder = 'desc';
      aggregatedData = this.aggregatedBids;
      rawData = this.bids;
    } else {
      dataOrder = 'asc';
      aggregatedData = this.aggregatedAsks;
      rawData = this.asks;
    }

    const aggregatePrice = this.getAggregatePrice(price, side);
    const aggregateIndex = binaryIndexOf(aggregatePrice, aggregatedData, dataOrder);
    const index = binaryIndexOf(price, rawData, dataOrder);

    if (amount.eq(0)) {
      // new data
      this.updateAggregateDataAtIndex(side, aggregateIndex, amount.minus(rawData[index][1]));
      this.updateTotalAmount(side, amount.minus(rawData[index][1]));
      rawData.splice(index, 1);
    } else {
      if (index > -1) {
        this.updateAggregateDataAtIndex(side, aggregateIndex, amount.minus(rawData[index][1]));
        this.updateTotalAmount(side, amount.minus(rawData[index][1]));
        rawData[index][1] = amount;
      } else {
        rawData.push([price, amount]);
        this.updateTotalAmount(side, amount);
        if (aggregateIndex > -1) {
          this.updateAggregateDataAtIndex(side, aggregateIndex, amount);
        } else {
          aggregatedData.push([aggregatePrice, amount, new BigNumber(0)]);
        }
      }
    }

    sortData(aggregatedData, dataOrder);
    sortData(rawData, dataOrder);

    // set bid and ask into redux
    if (rawData[0]) {
      const state = store.getState();
      const bestAsk = state.market.get('orderbook').get('bestAsk');
      const bestbid = state.market.get('orderbook').get('bestBid');
      if (side === 'buy' && (!bestbid || !rawData[0][0].eq(bestbid))) {
        store.dispatch(setBestBid(rawData[0][0]));
      } else if (side === 'sell' && (!bestAsk || !rawData[0][0].eq(bestAsk))) {
        store.dispatch(setBestAsk(rawData[0][0]));
      }
    }
  };
}

export const memoryOrderbook = new MemroyOrderbook();

OrderbookEmittery.on('level2OrderbookSnapshot', data => {
  memoryOrderbook.reset();
  memoryOrderbook.marketId = data.marketId;

  memoryOrderbook.setSnapshot(data.bids, 'buy', data.aggregation);
  memoryOrderbook.setSnapshot(data.asks, 'sell', data.aggregation);
});

OrderbookEmittery.on('level2OrderbookUpdate', data => {
  const { side, price, amount } = data;
  memoryOrderbook.updateOrderbookData(price, amount, side);
});

const sortData = (unsortedData, dataOrder = 'asc') => {
  unsortedData.sort((a, b) => {
    if (a[0].eq(b[0])) {
      return 0;
    } else {
      if (dataOrder === 'asc') {
        return a[0].lt(b[0]) ? -1 : 1;
      } else {
        return a[0].lt(b[0]) ? 1 : -1;
      }
    }
  });
};

export const binaryIndexOf = (searchPrice, data, dataOrder) => {
  let minIndex = 0;
  let maxIndex = data.length - 1;
  let currentIndex;
  let currentElement;

  while (minIndex <= maxIndex) {
    currentIndex = Math.floor((minIndex + maxIndex) / 2);
    currentElement = data[currentIndex];

    if (dataOrder === 'asc') {
      if (currentElement[0].lt(searchPrice)) {
        minIndex = currentIndex + 1;
      } else if (currentElement[0].gt(searchPrice)) {
        maxIndex = currentIndex - 1;
      } else {
        return currentIndex;
      }
    } else {
      if (currentElement[0].lt(searchPrice)) {
        maxIndex = currentIndex - 1;
      } else if (currentElement[0].gt(searchPrice)) {
        minIndex = currentIndex + 1;
      } else {
        return currentIndex;
      }
    }
  }

  return -1;
};
