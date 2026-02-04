import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function DynamicDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const [marginTop, setMarginTop] = React.useState("10vh")
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.offsetHeight
      const windowHeight = window.innerHeight

      // Dynamic positioning based on content height:
      // - Very tall dialogs (>80% of window): position at 2vh from top
      // - Tall dialogs (>60% of window): position at 5vh from top  
      // - Medium dialogs (>40% of window): position at 8vh from top
      // - Short dialogs: position at 10vh from top
      if (height > windowHeight * 0.8) {
        setMarginTop("2vh")
      } else if (height > windowHeight * 0.6) {
        setMarginTop("5vh")
      } else if (height > windowHeight * 0.4) {
        setMarginTop("8vh")
      } else {
        setMarginTop("10vh")
      }
    }
  }, [children])

  return (
    <DialogPrimitive.Portal data-slot="dialog-portal">
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className={cn(
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
        )}
      />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="dialog-content"
        style={{ marginTop, top: 0, transform: "translateX(-50%)" }}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border px-8 py-6 shadow-lg duration-200 outline-none",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "max-h-[90vh] overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs text-muted-foreground hover:text-foreground opacity-70 transition-all hover:opacity-100 focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export { DynamicDialogContent }
