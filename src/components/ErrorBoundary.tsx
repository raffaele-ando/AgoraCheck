import React, { ErrorInfo } from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F1EA] flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <h1 className="text-2xl font-bold mb-4">
              Ops! Qualcosa è andato storto.
            </h1>
            <p className="text-gray-500 mb-6 text-sm">
              {this.state.error?.message || "Errore imprevisto"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-black text-white rounded-full font-medium"
            >
              Ricarica Pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
