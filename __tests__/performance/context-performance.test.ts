import { renderHook } from '@testing-library/react-hooks';
import { HouseholdProvider, useHousehold } from '@/lib/context/HouseholdContext';

describe('HouseholdContext Performance Tests', () => {
  it('should not re-render unnecessarily', () => {
    const renderCount = jest.fn();

    const { result, rerender } = renderHook(() => {
      renderCount();
      return useHousehold();
    }, {
      wrapper: HouseholdProvider,
    });

    expect(renderCount).toHaveBeenCalledTimes(1);

    rerender();

    expect(renderCount).toHaveBeenCalledTimes(1); // No re-render expected
  });
});