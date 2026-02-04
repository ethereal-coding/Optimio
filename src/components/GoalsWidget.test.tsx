import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/hooks/useAppState';
import { GoalsWidget } from './widgets/GoalsWidget';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('GoalsWidget', () => {
  it('renders goals widget with title', () => {
    render(<GoalsWidget />, { wrapper });

    expect(screen.getByText('Goals')).toBeInTheDocument();
  });

  it('displays empty state when no goals', () => {
    render(<GoalsWidget />, { wrapper });

    // Should show empty state message
    expect(screen.getByText('No goals yet')).toBeInTheDocument();
    expect(screen.getByText('Set your first goal to get started')).toBeInTheDocument();
  });

  it('displays add goal button', () => {
    render(<GoalsWidget />, { wrapper });

    const addButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-plus')
    );

    expect(addButton).toBeDefined();
  });

  it('displays view all button', () => {
    render(<GoalsWidget />, { wrapper });

    expect(screen.getByText('View All')).toBeInTheDocument();
  });
});
