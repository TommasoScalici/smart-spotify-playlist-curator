// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { FunctionsService } from '@/services/functions-service';

import { RunButton } from '../components/RunButton';

// Mocks
vi.mock('@/services/functions-service');
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    promise: vi.fn((promise: Promise<unknown>) => promise),
    success: vi.fn()
  }
}));

describe('RunButton', () => {
  const mockPlaylistId = 'p123';
  const mockPlaylistName = 'Test Playlist';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderButton = (props = {}) => {
    return render(
      <TooltipProvider>
        <RunButton playlistId={mockPlaylistId} playlistName={mockPlaylistName} {...props} />
      </TooltipProvider>
    );
  };

  it('triggers estimation when clicked', async () => {
    (FunctionsService.estimateCuration as Mock).mockResolvedValue({
      agedOutTracks: 1,
      aiTracksToAdd: 5,
      artistLimitRemoved: 0,
      currentTracks: 10,
      duplicatesToRemove: 1,
      mandatoryToAdd: 1,
      predictedFinal: 10,
      sizeLimitRemoved: 0
    });

    renderButton();

    const btn = screen.getByRole('button');
    fireEvent.click(btn);

    expect(FunctionsService.estimateCuration).toHaveBeenCalledWith(mockPlaylistId);

    // Check if modal appears
    await waitFor(() => {
      expect(screen.getByText(/Pre-Flight Check/i)).toBeInTheDocument();
    });
  });

  it('handles estimation failure gracefully', async () => {
    (FunctionsService.estimateCuration as Mock).mockRejectedValue(new Error('Network error'));

    renderButton();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to estimate'),
        expect.any(Object)
      );
    });
  });

  it('triggers curation after confirmation', async () => {
    (FunctionsService.estimateCuration as Mock).mockResolvedValue({
      planId: 'plan-xyz',
      predictedFinal: 10
    });
    (FunctionsService.triggerCuration as Mock).mockResolvedValue({ message: 'Success' });

    renderButton();

    fireEvent.click(screen.getByRole('button'));

    // 2. Click confirm in modal
    const confirmBtn = await screen.findByText(/Run Automation/i);
    fireEvent.click(confirmBtn);

    expect(FunctionsService.triggerCuration).toHaveBeenCalledWith(mockPlaylistId, {
      planId: 'plan-xyz'
    });
    expect(toast.promise).toHaveBeenCalled();
  });

  it('shows loading state while running', async () => {
    let resolveCuration: (value: unknown) => void = () => {};
    const pendingPromise = new Promise((resolve) => {
      resolveCuration = resolve;
    });
    (FunctionsService.estimateCuration as Mock).mockResolvedValue({ predictedFinal: 10 });
    (FunctionsService.triggerCuration as Mock).mockReturnValue(pendingPromise);

    renderButton();

    fireEvent.click(screen.getByRole('button'));

    const confirmBtn = await screen.findByText(/Run Automation/i);
    fireEvent.click(confirmBtn);

    // Main button should now be disabled
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Run Curation/i });
      expect(btn).toBeDisabled();
    });

    resolveCuration({ message: 'Done' });
  });
});
