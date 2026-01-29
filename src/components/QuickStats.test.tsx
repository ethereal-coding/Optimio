import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/hooks/useAppState';
import { QuickStats } from './QuickStats';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('QuickStats', () => {
  it('renders all stat cards', () => {
    render(<QuickStats />, { wrapper });

    expect(screen.getByText("Today's Events")).toBeInTheDocument();
    expect(screen.getByText('Pending Tasks')).toBeInTheDocument();
    expect(screen.getByText('Goal Progress')).toBeInTheDocument();
    expect(screen.getByText('Focus Time')).toBeInTheDocument();
  });

  it('displays stat values', () => {
    render(<QuickStats />, { wrapper });

    // Should display numeric values for stats
    const statValues = screen.getAllByText(/\d+/);
    expect(statValues.length).toBeGreaterThan(0);
  });

  it('displays trend indicators', () => {
    render(<QuickStats />, { wrapper });

    // Should display trend labels
    expect(screen.getByText('completion')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
    expect(screen.getByText('vs yesterday')).toBeInTheDocument();
  });
});
