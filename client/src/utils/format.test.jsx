import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { formatDistance, titleCase } from './format.js';

describe('display helpers', () => {
  it('formats known request states for people', () => {
    expect(titleCase('EN_ROUTE_TO_HOSPITAL')).toBe('En Route To Hospital');
  });

  it('shows a readable placeholder for a missing distance', () => {
    expect(formatDistance(null)).toBe('—');
  });

  it('renders status with an accessible label', () => {
    render(<StatusBadge status="NEEDS_REVIEW" />);
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
  });
});
