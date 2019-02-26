export const setBestAsk = ask => {
  return {
    type: 'SET_BEST_ASK',
    payload: {
      ask
    }
  };
};

export const setBestBid = bid => {
  return {
    type: 'SET_BEST_BID',
    payload: {
      bid
    }
  };
};
