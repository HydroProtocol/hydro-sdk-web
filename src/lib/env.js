let _env = process.env;

if (!_env.REACT_APP_API_URL) {
  _env = window._env;
}

export default {
  API_ADDRESS: _env.REACT_APP_API_URL,
  WS_ADDRESS: _env.REACT_APP_WS_URL,
  HYDRO_PROXY_ADDRESS: _env.REACT_APP_HYDRO_PROXY_ADDRESS,
  HYDRO_TOKEN_ADDRESS: _env.REACT_APP_HYDRO_TOKEN_ADDRESS
};

