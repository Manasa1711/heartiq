import { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${new Date().toISOString()}] ErrorBoundary:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center bg-[#050d1a] p-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
            <h1 className="font-display font-bold text-2xl text-white mb-2">Something went wrong</h1>
            <p className="text-white/60 text-sm mb-6">
              An unexpected error occurred. Try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-[10px] text-left text-[#ff2d55] bg-black/40 p-3 rounded-lg overflow-x-auto mb-4">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <button onClick={() => location.reload()} className="px-4 py-2 rounded-xl bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white text-sm">
                Refresh Page
              </button>
              <button onClick={() => (location.href = "/")} className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-white text-sm">
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
