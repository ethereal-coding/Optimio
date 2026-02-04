import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/hooks/useAppState';
import { NotesWidget } from './widgets/NotesWidget';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('NotesWidget', () => {
  it('renders notes widget with title', () => {
    render(<NotesWidget />, { wrapper });

    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('displays empty state when no notes', () => {
    render(<NotesWidget />, { wrapper });

    // Should show empty state message
    expect(screen.getByText('No notes found')).toBeInTheDocument();
  });

  it('displays add note button', () => {
    render(<NotesWidget />, { wrapper });

    const addButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-plus')
    );

    expect(addButton).toBeDefined();
  });

  it('displays view all button', () => {
    render(<NotesWidget />, { wrapper });

    expect(screen.getByText('View All')).toBeInTheDocument();
  });
});
