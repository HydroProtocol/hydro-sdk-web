import BigNumber from 'bignumber.js';
import Toastify from 'toastify-js';

export const sleep = time => new Promise(r => setTimeout(r, time));

export const toUnitAmount = (amount, decimals) => {
  return new BigNumber(amount).div(Math.pow(10, decimals));
};

export const isTokenApproved = allowance => {
  return allowance.gt(10 ** 30);
};

// for deposit mode
export const zeroAddress = '0x0000000000000000000000000000000000000000';

export const isZeroAddress = address => {
  return address === zeroAddress;
};

export const callPromise = (fn, ...args) => {
  return new Promise((resolve, reject) => {
    fn(...args, (err, result) => {
      if (err) {
        reject(err);
      }
      resolve(result);
    });
  });
};

export const toastGreen = (msg, duration = 5000) => {
  Toastify({
    text: msg,
    duration,
    gravity: 'bottom',
    backgroundColor: '#00d99f'
  }).showToast();
};

export const toastRed = (msg, duration = 5000) => {
  Toastify({
    text: msg,
    duration,
    gravity: 'bottom',
    backgroundColor: '#ff6f75'
  }).showToast();
};
