/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Session } from 'next-auth';
import FeedingSchedule from '@/components/feeding-schedule';
import { AppProvider } from '@/lib/context/AppContext';
import { ScheduleProvider } from '@/lib/context/ScheduleContext';
import { BaseCat, BaseHousehold } from '@/lib/types/common';

// Mock data
const mockHouseholds: BaseHousehold[] = [
  {
    id: 1,
    name: 'Test Household',
    ownerId: 1,
  },
];

const mockCats: BaseCat[] = [
  {
    id: 1,
    name: 'Whiskers',
    householdId: 1,
    feedingInterval: 8,
  },
  {
    id: 2,
    name: 'Mittens',
    householdId: 1,
    feedingInterval: 6,
  },
];

// Mock session
const mockSession: Session = {
  expires: '2024-03-21T00:00:00.000Z',
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    timezone: 'America/Sao_Paulo',
  },
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn((key: string) => {
    const mockData: { [key: string]: any } = {
      cats: JSON.stringify(mockCats),
      households: JSON.stringify(mockHouseholds),
    };
    return mockData[key] || null;
  }),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock useSession hook
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: mockSession,
    status: 'authenticated',
  })),
}));

// Mock getSchedules
jest.mock('@/lib/data', () => ({
  getSchedules: jest.fn(() => new Promise(resolve => setTimeout(() => resolve([]), 100))),
}));

// Mock apiService
jest.mock('@/lib/services/apiService', () => ({
  getCatsByHouseholdId: jest.fn(() => new Promise(resolve => setTimeout(() => resolve([]), 100))),
  getFeedingLogs: jest.fn(() => new Promise(resolve => setTimeout(() => resolve([]), 100))),
}));

// Mock the new contexts
jest.mock('@/lib/context/AppContext', () => ({
  useAppContext: jest.fn(() => ({
    state: {
      cats: mockCats,       // Provide mock cats
      households: mockHouseholds, // Provide mock households
      feedingLogs: [], // Provide empty or mock logs if needed
      users: [], // Provide empty or mock users if needed
      error: null,
    },
    dispatch: jest.fn(), // Mock dispatch
  })),
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/lib/context/ScheduleContext', () => ({
  useScheduleContext: jest.fn(() => ({
    state: {
      schedules: [], // Provide mock schedules if needed by the component
      isLoading: false,
      error: null,
    },
    dispatch: jest.fn(), // Mock dispatch
  })),
  ScheduleProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useLoading if needed by the component
jest.mock('@/lib/context/LoadingContext', () => ({
  useLoading: jest.fn(() => ({
    state: { operations: [], isGlobalLoading: false },
    addLoadingOperation: jest.fn(),
    removeLoadingOperation: jest.fn(),
    clearLoadingOperations: jest.fn(),
  })),
  LoadingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <AppProvider>
      <ScheduleProvider>
        {/* Add LoadingProvider if component uses useLoading */}
        {/* <LoadingProvider> */}
          {component}
        {/* </LoadingProvider> */}
      </ScheduleProvider>
    </AppProvider>
  );
};

describe('FeedingSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    renderWithProviders(<FeedingSchedule />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should render schedule after loading', async () => {
    (require('@/lib/services/apiService') as any).getCatsByHouseholdId.mockResolvedValueOnce(mockCats);
    renderWithProviders(<FeedingSchedule />);
    
    // Primeiro verifica o estado de carregamento
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    
    // Depois verifica o conteúdo carregado
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
      expect(screen.getByText('Whiskers')).toBeInTheDocument();
      expect(screen.getByText('Mittens')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should render empty state when no cats are found', async () => {
    (require('@/lib/services/apiService') as any).getCatsByHouseholdId.mockResolvedValueOnce([]);
    renderWithProviders(<FeedingSchedule />);
    
    // Primeiro verifica o estado de carregamento
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    
    // Depois verifica o estado vazio
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
      expect(screen.getByText('Nenhuma alimentação programada.')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should render empty state when not authenticated', async () => {
    (require('next-auth/react') as any).useSession.mockReturnValueOnce({
      data: null,
      status: 'unauthenticated',
    });

    renderWithProviders(<FeedingSchedule />);
    
    // Primeiro verifica o estado de carregamento
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    
    // Depois verifica o estado vazio
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
      expect(screen.getByText('Nenhuma alimentação programada.')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
}); 