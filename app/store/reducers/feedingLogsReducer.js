const initialState = {
  logs: {},  // Objeto com catId como chave e array de logs como valor
  analytics: {}, // Dados para gráficos e análises por catId
  isLoading: false,
  error: null
};

// Tipos de ação
const SET_FEEDING_LOGS = 'SET_FEEDING_LOGS';
const ADD_FEEDING_LOG = 'ADD_FEEDING_LOG';
const SET_ANALYTICS = 'SET_ANALYTICS';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';

// Reducer
const feedingLogsReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_FEEDING_LOGS:
      return {
        ...state,
        logs: {
          ...state.logs,
          [action.payload.catId]: action.payload.logs
        },
        isLoading: false,
        error: null
      };
    case ADD_FEEDING_LOG:
      return {
        ...state,
        logs: {
          ...state.logs,
          [action.payload.catId]: [
            action.payload.log,
            ...(state.logs[action.payload.catId] || [])
          ]
        },
        isLoading: false,
        error: null
      };
    case SET_ANALYTICS:
      return {
        ...state,
        analytics: {
          ...state.analytics,
          [action.payload.catId]: action.payload.data
        },
        isLoading: false,
        error: null
      };
    case SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    case SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    default:
      return state;
  }
};

// Action Creators
export const setFeedingLogs = (catId, logs) => ({
  type: SET_FEEDING_LOGS,
  payload: { catId, logs }
});

export const addFeedingLog = (catId, log) => ({
  type: ADD_FEEDING_LOG,
  payload: { catId, log }
});

export const setAnalytics = (catId, data) => ({
  type: SET_ANALYTICS,
  payload: { catId, data }
});

export const setLoading = (isLoading) => ({
  type: SET_LOADING,
  payload: isLoading
});

export const setError = (error) => ({
  type: SET_ERROR,
  payload: error
});

// Thunks (ações assíncronas)
export const fetchFeedingLogs = (catId) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await fetch(`/feedings/${catId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar registros de alimentação');
      }
      
      dispatch(setFeedingLogs(catId, data));
    } catch (error) {
      dispatch(setError(error.message));
    }
  };
};

export const logFeeding = (feedingData) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await fetch('/feedings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedingData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao registrar alimentação');
      }
      
      dispatch(addFeedingLog(feedingData.catId, data));
      return data;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    }
  };
};

export const fetchAnalytics = (catId) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await fetch(`/analytics/${catId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar dados analíticos');
      }
      
      dispatch(setAnalytics(catId, data));
    } catch (error) {
      dispatch(setError(error.message));
    }
  };
};

export default feedingLogsReducer; 