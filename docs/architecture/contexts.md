# Context Architecture

## Context Hierarchy
- **AppContext**: Root context for global state.
- **CatsContext**: Manages state related to cats.
- **FeedingContext**: Handles feeding schedules and logs.
- **HouseholdContext**: Manages household members and permissions.

## Data Flow Patterns
- **Unidirectional Data Flow**: State updates flow from actions to reducers to components.
- **Context Communication**: Use event emitters for cross-context communication.

## State Management Patterns
- **Reducer Pattern**: Centralized state management using reducers.
- **Memoization**: Optimize performance by memoizing selectors and derived state.
- **Persistence**: Use localStorage for persisting critical state.