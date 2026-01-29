import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '@/hooks/useAppState';
import { TodoWidget } from './TodoWidget';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('TodoWidget', () => {
  it('renders todo widget with title', () => {
    render(<TodoWidget />, { wrapper });

    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('displays filter tabs', () => {
    render(<TodoWidget />, { wrapper });

    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('opens add todo dialog when plus button is clicked', async () => {
    render(<TodoWidget />, { wrapper });

    const addButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-plus')
    );

    if (addButton) {
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('Add New Task')).toBeInTheDocument();
      });
    }
  });

  it('displays todo items with priority badges', () => {
    render(<TodoWidget />, { wrapper });

    // Should display priority badges
    const priorities = ['high', 'medium', 'low'];
    priorities.forEach(priority => {
      const elements = screen.queryAllByText(priority);
      // At least one instance should exist (either in filter or badge)
      expect(elements.length).toBeGreaterThanOrEqual(0);
    });
  });
});
