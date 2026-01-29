import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-background relative flex min-h-screen w-full items-center justify-center overflow-hidden p-6">
          {/* Decorative Backdrops */}
          <div className="bg-destructive/20 pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full blur-[128px]" />
          <div className="bg-primary/10 pointer-events-none absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full blur-[128px]" />

          <div className="animate-in fade-in zoom-in-95 relative z-10 w-full max-w-md duration-500">
            <div className="glass-panel rounded-3xl border-white/10 bg-black/40 p-8 text-center shadow-2xl backdrop-blur-xl md:p-12">
              <div className="bg-destructive/10 text-destructive ring-destructive/20 shadow-destructive/5 mb-6 inline-flex items-center justify-center rounded-full p-4 shadow-lg ring-1">
                <AlertTriangle className="h-10 w-10 stroke-[1.5px]" />
              </div>

              <h1 className="mb-3 bg-linear-to-br from-white to-white/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                Something went wrong
              </h1>

              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                We encountered an unexpected error. The application has been paused to prevent data
                loss.
              </p>

              {/* Developer Error Details (Only visible in Dev or if needed) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-8 max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/50 p-4 text-left">
                  <p className="font-mono text-xs break-all text-red-300">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  onClick={this.handleReload}
                  size="lg"
                  className="shadow-primary/20 w-full gap-2 shadow-lg sm:w-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload App
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 border-white/10 bg-white/5 hover:bg-white/10 sm:w-auto"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
