import { combineReducers } from 'redux';
import market from './market';
import account from './account';
import config from './config';

const rootReducer = combineReducers({ market, account, config });
export default rootReducer;
