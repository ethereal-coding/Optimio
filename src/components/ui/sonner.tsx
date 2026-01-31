import {
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useAppState } from "@/hooks/useAppState"

const Toaster = ({ ...props }: ToasterProps) => {
  const { state } = useAppState()
  const theme = state.user?.preferences?.theme || "dark"
  
  // Handle auto theme
  const resolvedTheme = theme === "auto" 
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          error: "group-[.toaster]:border-destructive/50 group-[.toaster]:bg-destructive/10",
          success: "group-[.toaster]:border-emerald-500/50 group-[.toaster]:bg-emerald-500/10",
          warning: "group-[.toaster]:border-amber-500/50 group-[.toaster]:bg-amber-500/10",
          info: "group-[.toaster]:border-blue-500/50 group-[.toaster]:bg-blue-500/10",
          loading: "group-[.toaster]:border-muted group-[.toaster]:bg-muted/50",
        },
      }}
      icons={{
        success: <CheckCircle2 className="size-4 text-emerald-500" />,
        info: <Info className="size-4 text-blue-500" />,
        warning: <AlertTriangle className="size-4 text-amber-500" />,
        error: <XCircle className="size-4 text-destructive" />,
        loading: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "hsl(var(--card))",
          "--normal-text": "hsl(var(--card-foreground))",
          "--normal-border": "hsl(var(--border))",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
