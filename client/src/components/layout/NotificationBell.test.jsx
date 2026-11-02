import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const { usePolling } = vi.hoisted(() => ({ usePolling: vi.fn() }));
vi.mock('../../hooks/usePolling.js', () => ({ usePolling }));
vi.mock('../../services/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { NotificationBell } from './NotificationBell.jsx';

describe('NotificationBell', () => {
  beforeEach(() => usePolling.mockReturnValue({ data: null, refresh: vi.fn() }));

  it('renders safely before the first notifications response', () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
  });
});
