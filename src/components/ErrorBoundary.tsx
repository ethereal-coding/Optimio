import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('💥 Optimio Error Boundary caught an error:', error, errorInfo);

    // Store error info in state
    this.setState({
      errorInfo
    });

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            {/* Error Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-muted-foreground text-lg">
                We encountered an unexpected error. Your data is safe.
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-foreground font-semibold mb-2">Error Details:</h2>
              <div className="bg-background rounded-md p-4 mb-4">
                <p className="text-red-400 font-mono text-sm">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>

              {/* Stack Trace (Collapsible) */}
              {this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-muted-foreground text-sm cursor-pointer hover:text-foreground">
                    Show technical details
                  </summary>
                  <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto bg-background p-4 rounded-md">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleReload}
                className="flex-1 bg-white text-black hover:bg-white/90 h-11"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-accent h-11"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>

              <Button
                onClick={this.handleReset}
                variant="ghost"
                className="flex-1 text-muted-foreground hover:text-foreground hover:bg-accent h-11"
              >
                Try Again
              </Button>
            </div>

            {/* Help Text */}
            <div className="mt-8 text-center">
              <p className="text-muted-foreground text-sm">
                If this problem persists, try{' '}
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="text-muted-foreground underline hover:text-foreground"
                >
                  clearing your browser data
                </button>
                {' '}or contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Widget-level error boundary (lighter fallback)
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Widget error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-background border border-border rounded-lg">
          <AlertTriangle className="w-8 h-8 text-red-500/50 mb-3" />
          <p className="text-muted-foreground text-sm mb-3">
            This widget encountered an error
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Reload
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
