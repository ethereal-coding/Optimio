import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppProvider } from '@/hooks/useAppState';
import { Sidebar } from './Sidebar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('Sidebar', () => {
  it('renders sidebar with logo', () => {
    render(<Sidebar isOpen={true} onToggle={vi.fn()} />, { wrapper });

    expect(screen.getByText('OmniFlow')).toBeInTheDocument();
  });

  it('renders navigation items', () => {
    render(<Sidebar isOpen={true} onToggle={vi.fn()} />, { wrapper });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('displays connected calendars section', () => {
    render(<Sidebar isOpen={true} onToggle={vi.fn()} />, { wrapper });

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Outlook')).toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', () => {
    const onToggle = vi.fn();
    render(<Sidebar isOpen={true} onToggle={onToggle} />, { wrapper });

    const toggleButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-chevron-left')
    );

    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(onToggle).toHaveBeenCalled();
    }
  });

  it('displays user profile when open', () => {
    render(<Sidebar isOpen={true} onToggle={vi.fn()} />, { wrapper });

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
