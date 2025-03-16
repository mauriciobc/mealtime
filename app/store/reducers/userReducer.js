const initialState = {
  id: null,
  name: '',
  email: '',
  role: '',
  householdId: null,
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  isLoggedIn: false,
  isLoading: false,
  error: null
};

// Tipos de ação
const SET_USER = 'SET_USER';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';
const LOGOUT = 'LOGOUT';

// Reducer
const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_USER:
      return {
        ...state,
        ...action.payload,
        isLoggedIn: true,
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
    case LOGOUT:
      return {
        ...initialState
      };
    default:
      return state;
  }
};

// Action Creators
export const setUser = (userData) => ({
  type: SET_USER,
  payload: userData
});

export const setLoading = (isLoading) => ({
  type: SET_LOADING,
  payload: isLoading
});

export const setError = (error) => ({
  type: SET_ERROR,
  payload: error
});

export const logout = () => ({
  type: LOGOUT
});

// Thunks (ações assíncronas)
export const loginUser = (credentials) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer login');
      }
      
      dispatch(setUser(data));
    } catch (error) {
      dispatch(setError(error.message));
    }
  };
};

export default userReducer; 