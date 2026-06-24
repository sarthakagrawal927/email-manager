import { Component, type ErrorInfo, type ReactNode } from 'react';

import { captureError } from '@/lib/foundry-monitoring';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
    captureError(error, { scope: 'root', source: info.componentStack ?? 'error_boundary' });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h2 className="mb-3 text-2xl font-bold">Something went wrong</h2>
            <p className="mb-6 text-sm opacity-70">
              An unexpected error occurred on our end. Your emails stay in your browser and are safe
              — try again, and if it keeps happening, come back in a few minutes.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => this.setState({ error: null })}
                className="rounded border px-4 py-2 hover:opacity-80"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.replace('/')}
                className="rounded border px-4 py-2 hover:opacity-80"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
