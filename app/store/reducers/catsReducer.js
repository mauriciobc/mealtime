const initialState = {
  list: [],
  selectedCat: null,
  isLoading: false,
  error: null
};

// Tipos de ação
const SET_CATS = 'SET_CATS';
const SET_SELECTED_CAT = 'SET_SELECTED_CAT';
const ADD_CAT = 'ADD_CAT';
const UPDATE_CAT = 'UPDATE_CAT';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';

// Reducer
const catsReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_CATS:
      return {
        ...state,
        list: action.payload,
        isLoading: false,
        error: null
      };
    case SET_SELECTED_CAT:
      return {
        ...state,
        selectedCat: action.payload,
        isLoading: false
      };
    case ADD_CAT:
      return {
        ...state,
        list: [...state.list, action.payload],
        isLoading: false,
        error: null
      };
    case UPDATE_CAT:
      return {
        ...state,
        list: state.list.map(cat => 
          cat.id === action.payload.id ? action.payload : cat
        ),
        selectedCat: state.selectedCat?.id === action.payload.id ? action.payload : state.selectedCat,
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
export const setCats = (cats) => ({
  type: SET_CATS,
  payload: cats
});

export const setSelectedCat = (cat) => ({
  type: SET_SELECTED_CAT,
  payload: cat
});

export const addCat = (cat) => ({
  type: ADD_CAT,
  payload: cat
});

export const updateCat = (cat) => ({
  type: UPDATE_CAT,
  payload: cat
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
export const fetchCats = (householdId) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await fetch(`/cats/${householdId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar gatos');
      }
      
      dispatch(setCats(data));
    } catch (error) {
      dispatch(setError(error.message));
    }
  };
};

export const fetchCatById = (catId) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await fetch(`/cats/detail/${catId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar detalhes do gato');
      }
      
      dispatch(setSelectedCat(data));
    } catch (error) {
      dispatch(setError(error.message));
    }
  };
};

export const createCat = (catData) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    try {
      const response = await fetch('/cats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(catData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar perfil do gato');
      }
      
      dispatch(addCat(data));
      return data;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    }
  };
};

export default catsReducer; 