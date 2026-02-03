import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/hooks/useAppState';
import { CalendarWidget } from './widgets/CalendarWidget';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('CalendarWidget', () => {
  it('renders calendar widget with title', () => {
    render(<CalendarWidget />, { wrapper });

    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('displays navigation buttons', () => {
    render(<CalendarWidget />, { wrapper });

    const prevButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-chevron-left')
    );
    const nextButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-chevron-right')
    );

    expect(prevButton).toBeDefined();
    expect(nextButton).toBeDefined();
  });

  it('displays weekday headers', () => {
    render(<CalendarWidget />, { wrapper });

    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    weekdays.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('displays add event button', () => {
    render(<CalendarWidget />, { wrapper });

    const addButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-plus')
    );

    expect(addButton).toBeDefined();
  });
});
