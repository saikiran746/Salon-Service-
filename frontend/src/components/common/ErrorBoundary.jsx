import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Save to window for debugging/inspection
    window.lastReactError = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    };
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    localStorage.clear();
    window.location.href = '/admin/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-salon-black flex items-center justify-center p-6 relative font-sans">
          {/* Decorative background glow */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full filter blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full filter blur-[100px]" />

          <div className="relative w-full max-w-2xl bg-salon-card border border-salon-border/80 p-8 shadow-2xl rounded-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-salon-border pb-4">
              <span className="text-red-500 text-2xl font-bold">✦</span>
              <div>
                <h1 className="font-display text-2xl text-salon-white font-light">Application Runtime Error</h1>
                <p className="text-salon-muted text-xs tracking-widest uppercase font-sans mt-0.5">Luxe Admin Panel Diagnostic</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-sm font-sans">
                <span className="font-bold uppercase tracking-wider text-[10px] block mb-1 text-red-400">Error Message:</span>
                {this.state.error && this.state.error.toString()}
              </div>

              {this.state.errorInfo && (
                <div className="space-y-2">
                  <span className="font-sans text-xs tracking-wider uppercase font-semibold text-gold-500">Component Stack Trace</span>
                  <pre className="p-4 bg-salon-dark text-salon-muted text-[10px] overflow-auto max-h-60 border border-salon-border/50 rounded-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}

              {this.state.error && this.state.error.stack && (
                <div className="space-y-2">
                  <span className="font-sans text-xs tracking-wider uppercase font-semibold text-gold-500">Error Stack Trace</span>
                  <pre className="p-4 bg-salon-dark text-salon-muted text-[10px] overflow-auto max-h-40 border border-salon-border/50 rounded-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-salon-border">
                <button
                  onClick={this.handleReload}
                  className="btn-gold flex-1 py-3 text-xs tracking-widest uppercase font-sans font-bold flex items-center justify-center gap-2"
                >
                  🔄 Reload Page
                </button>
                <button
                  onClick={this.handleReset}
                  className="btn-dark flex-1 py-3 text-xs tracking-widest uppercase font-sans font-bold hover:text-red-400 hover:border-red-500/40"
                >
                  ⚠️ Reset Session & Go to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
