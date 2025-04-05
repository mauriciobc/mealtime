import { useEffect } from 'react';
import { useCats } from './CatsContext';
import { useFeeding } from './FeedingContext';
import { useHousehold } from './HouseholdContext';
import { eventSystem } from '../utils/EventSystem';

export const StateSync = () => {
  const { dispatch: catsDispatch } = useCats();
  const { dispatch: feedingDispatch } = useFeeding();
  const { dispatch: householdDispatch } = useHousehold();

  useEffect(() => {
    const handleCatsUpdate = (updatedState: any) => {
      // Example: Sync cats state
      catsDispatch({ type: 'SYNC_STATE', payload: updatedState });
    };

    const handleFeedingsUpdate = (updatedState: any) => {
      // Example: Sync feedings state
      feedingDispatch({ type: 'SYNC_STATE', payload: updatedState });
    };

    const handleHouseholdUpdate = (updatedState: any) => {
      // Example: Sync household state
      householdDispatch({ type: 'SYNC_STATE', payload: updatedState });
    };

    eventSystem.on('catsUpdated', handleCatsUpdate);
    eventSystem.on('feedingsUpdated', handleFeedingsUpdate);
    eventSystem.on('householdUpdated', handleHouseholdUpdate);

    return () => {
      eventSystem.off('catsUpdated', handleCatsUpdate);
      eventSystem.off('feedingsUpdated', handleFeedingsUpdate);
      eventSystem.off('householdUpdated', handleHouseholdUpdate);
    };
  }, [catsDispatch, feedingDispatch, householdDispatch]);

  return null;
};