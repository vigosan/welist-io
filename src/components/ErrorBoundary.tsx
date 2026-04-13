import { Component } from "react";
import type { ReactNode } from "react";
import { t } from "@/i18n/service";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <p className="text-4xl font-bold text-gray-900">{t("error.title")}</p>
            <p className="text-sm text-gray-400">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block text-sm font-medium text-gray-900 underline underline-offset-4"
            >
              {t("error.reload")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
