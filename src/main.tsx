import React, { StrictMode, Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { LangProvider } from "./lib/i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Global Error Boundary caught an exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "24px",
          maxWidth: "800px",
          margin: "40px auto",
          backgroundColor: "#FFF1F2",
          border: "2px solid #F43F5E",
          borderRadius: "16px",
          fontFamily: "sans-serif",
          color: "#881337"
        }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 12px 0" }}>
             เกิดข้อผิดพลาดในระบบ (Application Error)
          </h2>
          <p style={{ fontSize: "14px", marginBottom: "16px", fontWeight: "bold" }}>
            {this.state.error?.toString() || "Unknown error occurred."}
          </p>
          {this.state.errorInfo?.componentStack && (
            <pre style={{
              padding: "16px",
              backgroundColor: "#881337",
              color: "#FFE4E6",
              borderRadius: "8px",
              fontSize: "12px",
              overflowX: "auto",
              whiteSpace: "pre-wrap"
            }}>
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              backgroundColor: "#E11D48",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            รีโหลดหน้าเว็บ (Reload Page)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <LangProvider>
        <App />
      </LangProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);