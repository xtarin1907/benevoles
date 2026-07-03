import { Component, type ErrorInfo, type ReactNode } from "react"

// Without this, any uncaught exception anywhere in the tree -- including in
// a component mounted lazily into a Portal on interaction, like a dropdown
// menu's content -- unmounts the whole React root and leaves a blank page
// with no way to tell what happened.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur non interceptée :", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold">Une erreur est survenue.</p>
          <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
