import jwtDecode from 'jwt-decode';

/**
 * Login Data
 * {
 *   address: "0x....",
 *   jwt: "xxx.bbb.ccc"
 * }
 */

// 5 minute expired margin
const safeExpiredAtMargin = 5 * 60 * 1000;

export const saveLoginData = (address, jwt) => {
  window.localStorage.setItem(`loginData-${address}`, JSON.stringify({ address, jwt }));
};

export const cleanLoginDate = address => {
  window.localStorage.removeItem(`loginData-${address}`);
};

export const getJwtExpiredAt = jwt => {
  const jwtData = jwtDecode(jwt);
  return new Date(jwtData.exp * 1000 - safeExpiredAtMargin);
};

export const loadAccountJwt = address => {
  const savedData = window.localStorage.getItem(`loginData-${address}`);

  if (!savedData) {
    return null;
  }

  let loginData;
  try {
    loginData = JSON.parse(savedData);
  } catch (e) {
    cleanLoginDate(address);
    return null;
  }

  const jwtData = jwtDecode(loginData.jwt);

  if (new Date() > new Date(jwtData.exp * 1000 - safeExpiredAtMargin)) {
    cleanLoginDate(address);
    return null;
  }

  if (loginData.address && loginData.address.toLowerCase() === address.toLowerCase()) {
    return loginData.jwt;
  }

  return null;
};
