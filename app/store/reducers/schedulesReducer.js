const initialState = {
  schedules: {},  // Objeto com catId como chave e array de horários como valor
  isLoading: false,
  error: null
};

// Tipos de ação
const SET_SCHEDULES = 'SET_SCHEDULES';
const ADD_SCHEDULE = 'ADD_SCHEDULE';
const UPDATE_SCHEDULE = 'UPDATE_SCHEDULE';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';

// Reducer
const schedulesReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SCHEDULES:
      return {
        ...state,
        schedules: {
          ...state.schedules,
          [action.payload.catId]: action.payload.schedules
        },
        isLoading: false,
        error: null
      };
    case ADD_SCHEDULE:
      return {
        ...state,
        schedules: {
          ...state.schedules,
          [action.payload.catId]: [
            ...(state.schedules[action.payload.catId] || []),
            action.payload.schedule
          ]
        },
        isLoading: false,
        error: null
      };
    case UPDATE_SCHEDULE:
      return {
        ...state,
        schedules: {
          ...state.schedules,
          [action.payload.catId]: state.schedules[action.payload.catId].map(schedule => 
            schedule.id === action.payload.schedule.id ? action.payload.schedule : schedule
          )
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
export const setSchedules = (catId, schedules) => ({
  type: SET_SCHEDULES,
  payload: { catId, schedules }
});

export const addSchedule = (catId, schedule) => ({
  type: ADD_SCHEDULE,
  payload: { catId, schedule }
});

export const updateSchedule = (catId, schedule) => ({
  type: UPDATE_SCHEDULE,
  payload: { catId, schedule }
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
export const fetchSchedules = (catId) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await fetch(`/schedules/${catId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar horários');
      }
      
      dispatch(setSchedules(catId, data));
    } catch (error) {
      dispatch(setError(error.message));
    }
  };
};

export const saveSchedules = (catId, schedules) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await fetch('/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ catId, schedules }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao salvar horários');
      }
      
      dispatch(setSchedules(catId, data));
      return data;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    }
  };
};

export default schedulesReducer; 