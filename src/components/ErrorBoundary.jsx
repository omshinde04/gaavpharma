import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[400px] text-center select-none">
          <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-4 text-rose-600 shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            {this.props.fallbackTitle || 'काहीतरी त्रुटी झाली (Rendering Glitch Prevented)'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mb-4 font-mono">
            {this.state.error?.message || 'An unexpected rendering error occurred. The screen has been protected from going blank.'}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>पुन्हा प्रयत्न करा (Try Again)</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              रिफ्रेश करा (Reload App)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
