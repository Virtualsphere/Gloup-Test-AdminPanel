import { Component } from "react";
import { AlertTriangle } from "lucide-react";

// Catches an error thrown while a page renders, so the sidebar and header stay
// usable instead of the whole app going blank. AppRoutes wraps the page area in
// it and passes the current path as `resetKey`: moving to another page clears
// the error. A failed lazy-chunk load (e.g. right after a deploy) lands here too.
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="mx-auto mt-10 max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm"
      >
        <AlertTriangle size={28} className="mx-auto text-rose-500" />
        <h2 className="mt-3 text-lg font-bold text-gray-900">Something went wrong on this page</h2>
        <p className="mt-1 text-sm text-gray-500">
          The rest of the app still works. You can try again, or go to another page from the menu.
        </p>
        <p className="mt-3 break-words rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {String(error?.message || error)}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
