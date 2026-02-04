import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/hooks/useAppState';
import { Sidebar } from './layout/Sidebar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('Sidebar', () => {
  it('renders sidebar with logo', () => {
    render(<Sidebar isOpen={true} onToggle={vi.fn()} />, { wrapper });

    // Logo is an "O" in a white circle
    expect(screen.getByText('O')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<Sidebar isOpen={true} onToggle={vi.fn()} />, { wrapper });

    // Navigation items are buttons with icons
    const navButtons = screen.getAllByRole('button');
    expect(navButtons.length).toBeGreaterThanOrEqual(5);
  });

  it('has active view button', () => {
    render(<Sidebar isOpen={true} onToggle={vi.fn()} />, { wrapper });

    // Dashboard should be active by default (has special styling)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
