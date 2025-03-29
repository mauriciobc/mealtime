/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import FeedingProgress from '@/components/feeding-progress';

describe('FeedingProgress', () => {
  const defaultProps = {
    lastFed: new Date('2024-03-20T10:00:00Z'),
    interval: 8,
    size: 40,
    strokeWidth: 4,
    color: '#10b981',
    bgColor: '#e5e7eb'
  };

  const mockSession = {
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      timezone: 'America/Sao_Paulo',
      role: 'user'
    },
    expires: '2024-04-20T10:00:00Z'
  };

  const renderWithSession = (ui: React.ReactElement) => {
    return render(
      <SessionProvider session={mockSession}>
        {ui}
      </SessionProvider>
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render with default props', () => {
    const now = new Date('2024-03-20T10:00:00Z'); // same as lastFed
    jest.setSystemTime(now);

    renderWithSession(<FeedingProgress {...defaultProps} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute('aria-valuenow', '0');
  });

  it('should show correct progress for recent feeding', () => {
    const now = new Date('2024-03-20T12:00:00Z'); // 2 hours after lastFed
    jest.setSystemTime(now);

    renderWithSession(<FeedingProgress {...defaultProps} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '25');
  });

  it('should show correct progress when feeding is overdue', () => {
    const now = new Date('2024-03-20T19:00:00Z'); // 9 hours after lastFed
    jest.setSystemTime(now);

    renderWithSession(<FeedingProgress {...defaultProps} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '12.5');
  });

  it('should show full progress for immediate feeding', () => {
    const now = new Date('2024-03-20T10:00:00Z'); // same as lastFed
    jest.setSystemTime(now);

    renderWithSession(<FeedingProgress {...defaultProps} />);
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '0');
  });
}); 