// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { useSpotifyAuth } from '../../../hooks/useSpotifyAuth';
import { OnboardingHero } from '../components/OnboardingHero';

// Mock dependencies
vi.mock('../../../hooks/useSpotifyAuth');
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    className,
    onClick
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <button className={className} data-testid="connect-btn" onClick={onClick}>
      {children}
    </button>
  )
}));

describe('OnboardingHero', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSpotifyAuth as Mock).mockReturnValue({ login: mockLogin });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all value proposition features', () => {
    render(<OnboardingHero />);

    expect(screen.getByText('AI Smart Curation')).toBeInTheDocument();
    expect(screen.getByText('VIP Track Pinning')).toBeInTheDocument();
    expect(screen.getByText('Artist Fatigue Prevention')).toBeInTheDocument();
    expect(screen.getByText('Automated Health Check')).toBeInTheDocument();
  });

  it('triggers login when connect button is clicked', () => {
    render(<OnboardingHero />);

    const buttons = screen.getAllByRole('button');
    // The last button should be the "Connect Spotify Account" button
    const connectButton = buttons[buttons.length - 1];
    fireEvent.click(connectButton);

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('auto-advances slides periodically', () => {
    render(<OnboardingHero />);

    // Get all buttons - first 4 are pagination dots
    const allButtons = screen.getAllByRole('button');
    const dots = allButtons.slice(0, 4); // First 4 are pagination dots
    expect(dots[0]).toHaveClass('w-8'); // Active class check (simplified)

    // Advance time by 5s
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should be on second slide
    expect(dots[1]).toHaveClass('w-8');
  });

  it('allows manual navigation via pagination dots', () => {
    render(<OnboardingHero />);

    const allButtons = screen.getAllByRole('button');
    const dots = allButtons.slice(0, 4); // First 4 are pagination dots

    fireEvent.click(dots[2]); // Click 3rd dot

    expect(dots[2]).toHaveClass('w-8');
  });
});
