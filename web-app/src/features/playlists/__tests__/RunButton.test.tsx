// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { RunButton } from '../components/RunButton';
import { FunctionsService } from '@/services/functions-service';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mocks
vi.mock('@/services/functions-service');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    promise: vi.fn((promise: Promise<unknown>) => promise)
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
      currentTracks: 10,
      predictedFinal: 10,
      duplicatesToRemove: 1,
      agedOutTracks: 1,
      artistLimitRemoved: 0,
      sizeLimitRemoved: 0,
      mandatoryToAdd: 1,
      aiTracksToAdd: 5
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
    (FunctionsService.estimateCuration as Mock).mockResolvedValue({ predictedFinal: 10 });
    (FunctionsService.triggerCuration as Mock).mockResolvedValue({ message: 'Success' });

    renderButton();

    fireEvent.click(screen.getByRole('button'));

    // 2. Click confirm in modal
    const confirmBtn = await screen.findByText(/Run Automation/i);
    fireEvent.click(confirmBtn);

    expect(FunctionsService.triggerCuration).toHaveBeenCalledWith(mockPlaylistId);
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
