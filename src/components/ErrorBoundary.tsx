import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State { error: Error | null }

/** Last-resort fallback so an unexpected render error shows a message and a reload button instead of a blank page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Unhandled UI error', error, info.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="overlay" role="alert">
        <p>Something went wrong.</p>
        <p className="muted">{this.state.error.message}</p>
        <button className="btn" onClick={() => location.reload()}>Reload</button>
      </div>
    )
  }
}
