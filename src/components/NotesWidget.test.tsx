import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/hooks/useAppState';
import { NotesWidget } from './NotesWidget';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('NotesWidget', () => {
  it('renders notes widget with title', () => {
    render(<NotesWidget />, { wrapper });

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('total')).toBeInTheDocument();
  });

  it('displays search input', () => {
    render(<NotesWidget />, { wrapper });

    const searchInput = screen.getByPlaceholderText('Search notes...');
    expect(searchInput).toBeInTheDocument();
  });

  it('displays note titles', () => {
    render(<NotesWidget />, { wrapper });

    // Should display some note titles from mock data
    const noteTitles = ['Book Ideas', 'Meeting Notes', 'Spanish Vocabulary', 'Grocery List'];
    const foundTitles = noteTitles.filter(title => screen.queryByText(title));
    expect(foundTitles.length).toBeGreaterThan(0);
  });

  it('displays add note button', () => {
    render(<NotesWidget />, { wrapper });

    const addButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-plus')
    );

    expect(addButton).toBeDefined();
  });
});
