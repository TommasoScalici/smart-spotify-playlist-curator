import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

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
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background relative overflow-hidden">
          {/* Decorative Backdrops */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/20 rounded-full blur-[128px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none" />

          <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
            <div className="glass-panel rounded-3xl p-8 md:p-12 text-center border-white/10 shadow-2xl backdrop-blur-xl bg-black/40">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-destructive/10 text-destructive mb-6 ring-1 ring-destructive/20 shadow-lg shadow-destructive/5">
                <AlertTriangle className="h-10 w-10 stroke-[1.5px]" />
              </div>

              <h1 className="text-3xl font-bold tracking-tight mb-3 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                Something went wrong
              </h1>

              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                We encountered an unexpected error. The application has been paused to prevent data
                loss.
              </p>

              {/* Developer Error Details (Only visible in Dev or if needed) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-8 p-4 rounded-lg bg-black/50 border border-white/10 text-left overflow-auto max-h-40">
                  <p className="font-mono text-xs text-red-300 break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReload}
                  size="lg"
                  className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload App
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-white/5 border-white/10 hover:bg-white/10"
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
