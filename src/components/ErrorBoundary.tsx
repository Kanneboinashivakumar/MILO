import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MILO Uncaught UI Exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-canvas text-ink" role="alert">
          <div className="max-w-md w-full p-6 bg-paper border border-hairline rounded-nested shadow-card flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-700 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-ink">Something unexpected occurred</h1>
              <p className="text-xs text-midGray mt-1">
                MILO caught a rendering boundary exception and preserved event telemetry.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-[11px] p-2.5 bg-canvas rounded border border-hairline text-left text-red-800 overflow-x-auto font-mono">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-ink text-paper text-xs font-semibold rounded-pill hover:bg-inkSoft transition-colors"
            >
              Reset Session &amp; Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
