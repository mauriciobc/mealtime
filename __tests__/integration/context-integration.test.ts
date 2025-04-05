import { renderHook, act } from '@testing-library/react-hooks';
import { HouseholdProvider, useHousehold } from '@/lib/context/HouseholdContext';

describe('HouseholdContext Integration Tests', () => {
  it('should provide default values', () => {
    const { result } = renderHook(() => useHousehold(), {
      wrapper: HouseholdProvider,
    });

    expect(result.current.household).toBe(null);
    expect(typeof result.current.setHousehold).toBe('function');
  });

  it('should update household state', () => {
    const { result } = renderHook(() => useHousehold(), {
      wrapper: HouseholdProvider,
    });

    act(() => {
      result.current.setHousehold({ id: '1', name: 'Test Household' });
    });

    expect(result.current.household).toEqual({ id: '1', name: 'Test Household' });
  });
});