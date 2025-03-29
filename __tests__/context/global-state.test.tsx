/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { GlobalStateProvider, useGlobalState } from '@/lib/context/global-state';
import { BaseCat, BaseFeedingLog } from '@/lib/types/common';

// Test component that uses the global state
const TestComponent = () => {
  const { state, dispatch } = useGlobalState();

  return (
    <div>
      <div data-testid="cats-count">{state.cats.length}</div>
      <button onClick={() => dispatch({
        type: 'ADD_CAT',
        payload: {
          id: 1,
          name: 'Test Cat',
          householdId: 1,
          feeding_interval: 8
        }
      })}>
        Add Cat
      </button>
    </div>
  );
};

describe('GlobalStateProvider', () => {
  it('should provide initial state', () => {
    render(
      <GlobalStateProvider>
        <TestComponent />
      </GlobalStateProvider>
    );

    expect(screen.getByTestId('cats-count')).toHaveTextContent('0');
  });

  it('should update state when dispatching actions', () => {
    render(
      <GlobalStateProvider>
        <TestComponent />
      </GlobalStateProvider>
    );

    act(() => {
      screen.getByText('Add Cat').click();
    });

    expect(screen.getByTestId('cats-count')).toHaveTextContent('1');
  });

  it('should handle multiple state updates', () => {
    render(
      <GlobalStateProvider>
        <TestComponent />
      </GlobalStateProvider>
    );

    act(() => {
      screen.getByText('Add Cat').click();
      screen.getByText('Add Cat').click();
    });

    expect(screen.getByTestId('cats-count')).toHaveTextContent('2');
  });
}); 