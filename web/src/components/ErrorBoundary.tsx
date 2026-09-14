import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-6 py-20 text-center">
          <p className="text-lg font-bold mb-2">Terjadi kesalahan</p>
          <p className="text-sm text-muted mb-5 break-words">{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-accent hover:bg-accent2 rounded-full px-6 py-3 text-sm font-bold"
          >
            Coba lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
