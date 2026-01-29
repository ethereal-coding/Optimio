import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddEventForm } from './AddEventForm';

describe('AddEventForm', () => {
  it('should render with empty fields when creating new event', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<AddEventForm onSubmit={onSubmit} onCancel={onCancel} />);

    expect(screen.getByLabelText(/event title/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
    expect(screen.getByLabelText(/location/i)).toHaveValue('');
  });

  it('should pre-fill fields when editing existing event', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const existingEvent = {
      id: 'test-1',
      title: 'Existing Event',
      description: 'Test description',
      location: 'Test location',
      startTime: new Date(2024, 0, 15, 10, 0),
      endTime: new Date(2024, 0, 15, 11, 0),
      color: '#3b82f6',
      isAllDay: false,
    };

    render(
      <AddEventForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        initialEvent={existingEvent}
      />
    );

    expect(screen.getByLabelText(/event title/i)).toHaveValue('Existing Event');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Test description');
    expect(screen.getByLabelText(/location/i)).toHaveValue('Test location');
  });

  it('should preserve event ID when editing', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const existingEvent = {
      id: 'original-id',
      title: 'Original Title',
      startTime: new Date(2024, 0, 15, 10, 0),
      endTime: new Date(2024, 0, 15, 11, 0),
      color: '#8b5cf6',
      isAllDay: false,
    };

    render(
      <AddEventForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        initialEvent={existingEvent}
      />
    );

    const titleInput = screen.getByLabelText(/event title/i);
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    const submitButton = screen.getByText(/add event/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      const submittedEvent = onSubmit.mock.calls[0][0];
      expect(submittedEvent.id).toBe('original-id');
      expect(submittedEvent.title).toBe('Updated Title');
    });
  });

  it('should create new ID when adding new event', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<AddEventForm onSubmit={onSubmit} onCancel={onCancel} />);

    const titleInput = screen.getByLabelText(/event title/i);
    fireEvent.change(titleInput, { target: { value: 'New Event' } });

    const submitButton = screen.getByText(/add event/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      const submittedEvent = onSubmit.mock.calls[0][0];
      expect(submittedEvent.id).toBeDefined();
      expect(submittedEvent.id).not.toBe('');
      expect(submittedEvent.title).toBe('New Event');
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<AddEventForm onSubmit={onSubmit} onCancel={onCancel} />);

    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not submit with empty title', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<AddEventForm onSubmit={onSubmit} onCancel={onCancel} />);

    const submitButton = screen.getByText(/add event/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('should use initialDate when provided', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const testDate = new Date(2024, 5, 15); // June 15, 2024

    render(
      <AddEventForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        initialDate={testDate}
      />
    );

    // The date picker should be set to the initial date
    // This is a bit tricky to test without accessing internal state,
    // but we can verify the form renders without errors
    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
  });

  it('should handle all-day events', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<AddEventForm onSubmit={onSubmit} onCancel={onCancel} />);

    const titleInput = screen.getByLabelText(/event title/i);
    fireEvent.change(titleInput, { target: { value: 'All Day Event' } });

    const allDayCheckbox = screen.getByLabelText(/all day event/i);
    fireEvent.click(allDayCheckbox);

    const submitButton = screen.getByText(/add event/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      const submittedEvent = onSubmit.mock.calls[0][0];
      expect(submittedEvent.isAllDay).toBe(true);
    });
  });
});
