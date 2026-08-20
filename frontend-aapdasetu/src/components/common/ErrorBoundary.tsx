import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ShieldAlert, RotateCcw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AapdaSetu ErrorBoundary caught]:', error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg dark:border-red-900/50 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {this.props.fallbackTitle || 'Emergency View Temporarily Unavailable'}
          </h2>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            A temporary component error occurred while rendering this emergency view. You can reload this view or navigate back safely.
          </p>

          {this.state.error && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 overflow-x-auto">
              {this.state.error.message}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry View</span>
            </button>
            <a
              href="#/"
              onClick={() => {
                this.reset()
                window.location.hash = '#/'
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Return Home</span>
            </a>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
