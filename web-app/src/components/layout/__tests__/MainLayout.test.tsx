// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { User } from 'firebase/auth';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { AuthContext } from '@/contexts/AuthContext';
import { useSpotifyStatus } from '@/features/auth/hooks/useSpotifyStatus';
import { FirestoreService } from '@/services/firestore-service';

import { MainLayout } from '../MainLayout';

// Mock dependencies
vi.mock('@/features/auth/hooks/useSpotifyStatus');
vi.mock('@/services/firestore-service');
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/components/ui/dropdown-menu', async () => {
  const React = await import('react');
  const DropdownContext = React.createContext<{
    open: boolean;
    setOpen: (val: boolean) => void;
  }>({
    open: false,
    setOpen: () => {}
  });

  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => {
      const [open, setOpen] = React.useState(false);
      return (
        <DropdownContext.Provider value={{ open, setOpen }}>
          <div>{children}</div>
        </DropdownContext.Provider>
      );
    },
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => {
      const { open } = React.useContext(DropdownContext);
      if (!open) return null;
      return <div role="menu">{children}</div>;
    },
    DropdownMenuItem: ({
      children,
      className,
      onClick,
      onSelect
    }: {
      children: React.ReactNode;
      className?: string;
      onClick?: (e: React.MouseEvent) => void;
      onSelect?: (e: React.MouseEvent) => void;
    }) => {
      const { setOpen } = React.useContext(DropdownContext);
      return (
        <button
          className={className}
          onClick={(e) => {
            onClick?.(e);
            onSelect?.(e);
            setOpen(false);
          }}
          role="menuitem"
          type="button"
        >
          {children}
        </button>
      );
    },
    DropdownMenuLabel: ({
      children,
      className
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => {
      const { setOpen } = React.useContext(DropdownContext);
      return (
        <div data-testid="dropdown-trigger" onClick={() => setOpen(true)}>
          {children}
        </div>
      );
    }
  };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ScrollIntoView and Pointer Capture for Radix UI
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Layout', () => {
  const mockSignOut = vi.fn();
  let userActor: ReturnType<typeof userEvent.setup>;

  const renderLayout = (user: null | Partial<User>) => {
    return render(
      <AuthContext.Provider
        value={{ loading: false, signIn: vi.fn(), signOut: mockSignOut, user: user as User }}
      >
        <MainLayout />
      </AuthContext.Provider>,
      { wrapper: createWrapper() }
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    userActor = userEvent.setup();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    document.body.removeAttribute('style');
    document.body.removeAttribute('aria-hidden');
    document.body.removeAttribute('data-scroll-locked');
  });

  it('renders sign in prompt when user is not logged in', () => {
    (useSpotifyStatus as Mock).mockReturnValue({ data: null, isLoading: false });
    renderLayout(null);

    // Should only see ModeToggle (not User Profile)
    expect(screen.queryByAltText('Profile')).not.toBeInTheDocument();
  });

  it('renders user profile and spotify connected badge', () => {
    const user = {
      displayName: 'Test User',
      email: 'test@test.com',
      photoURL: 'img.jpg',
      uid: '123'
    };
    (useSpotifyStatus as Mock).mockReturnValue({
      data: { isLinked: true, profile: { avatarUrl: 's.jpg', displayName: 'Spotify User' } },
      isLoading: false
    });

    renderLayout(user);

    expect(screen.getByAltText('Profile')).toBeInTheDocument();
    expect(screen.getByText(/Connected:/)).toBeInTheDocument();
  });

  it('renders disconnected state correctly', () => {
    const user = { displayName: 'Test User', email: 'test@test.com', uid: '123' };
    (useSpotifyStatus as Mock).mockReturnValue({
      data: { isLinked: false },
      isLoading: false
    });

    renderLayout(user);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('handles logout', async () => {
    const user = { displayName: 'Test User', email: 'test@test.com', uid: '123' };
    (useSpotifyStatus as Mock).mockReturnValue({ data: { isLinked: false }, isLoading: false });

    renderLayout(user);

    // Open dropdown
    const profileTrigger = screen.getByLabelText('User profile menu');
    await userActor.click(profileTrigger);

    // Click logout
    const logoutBtn = await screen.findByText('Log out');
    await userActor.click(logoutBtn);

    expect(mockSignOut).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Log out')).not.toBeInTheDocument());
  });

  it('handles unlink spotify account', async () => {
    const user = { displayName: 'Test User', email: 'test@test.com', uid: '123' };
    (useSpotifyStatus as Mock).mockReturnValue({
      data: { isLinked: true, profile: { displayName: 'Spotify User' } },
      isLoading: false
    });

    renderLayout(user);

    // Open dropdown
    const profileTrigger = screen.getByLabelText('User profile menu');
    await userActor.click(profileTrigger);

    // Click unlink in dropdown
    const unlinkMenuItem = await screen.findByText('Unlink Spotify');
    await userActor.click(unlinkMenuItem);

    // Confirm dialog should appear
    expect(await screen.findByText('Unlink Spotify Account?')).toBeInTheDocument();

    // Confirm unlink
    const confirmBtn = await screen.findByText('Unlink Now');
    await userActor.click(confirmBtn);

    await waitFor(() => {
      expect(FirestoreService.unlinkSpotifyAccount).toHaveBeenCalledWith('123');
    });

    await waitFor(() => {
      expect(screen.queryByText('Unlink Spotify Account?')).not.toBeInTheDocument();
    });
  });
});
