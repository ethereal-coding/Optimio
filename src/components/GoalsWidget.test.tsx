import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/hooks/useAppState';
import { GoalsWidget } from './GoalsWidget';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('GoalsWidget', () => {
  it('renders goals widget with title', () => {
    render(<GoalsWidget />, { wrapper });

    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('displays goal progress percentages', () => {
    render(<GoalsWidget />, { wrapper });

    // Should display percentage values
    const percentages = screen.getAllByText(/\d+%/);
    expect(percentages.length).toBeGreaterThan(0);
  });

  it('displays milestone information', () => {
    render(<GoalsWidget />, { wrapper });

    // Should display milestone counts
    const milestoneTexts = screen.getAllByText(/\d+\/\d+ milestones/);
    expect(milestoneTexts.length).toBeGreaterThan(0);
  });

  it('displays add goal button', () => {
    render(<GoalsWidget />, { wrapper });

    const addButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-plus')
    );

    expect(addButton).toBeDefined();
  });
});
