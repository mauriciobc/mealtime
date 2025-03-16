import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

// Reducers
import userReducer from './reducers/userReducer';
import catsReducer from './reducers/catsReducer';
import schedulesReducer from './reducers/schedulesReducer';
import feedingLogsReducer from './reducers/feedingLogsReducer';

// Combina todos os reducers
const rootReducer = combineReducers({
  user: userReducer,
  cats: catsReducer,
  schedules: schedulesReducer,
  feedingLogs: feedingLogsReducer,
});

// Cria a store com middleware thunk para operações assíncronas
const store = createStore(rootReducer, applyMiddleware(thunk));

export default store; 