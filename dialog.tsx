import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialog() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error("Dialog components must be used inside <Dialog />")
  return ctx
}

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      setInternalOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )
  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { setOpen } = useDialog()
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      onClick={(e) => {
        setOpen(true)
        onClick?.(e)
      }}
    />
  )
})
DialogTrigger.displayName = "DialogTrigger"

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { setOpen } = useDialog()
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      onClick={(e) => {
        setOpen(false)
        onClick?.(e)
      }}
    />
  )
})
DialogClose.displayName = "DialogClose"

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open, setOpen } = useDialog()
  return (
    <div
      ref={ref}
      onClick={() => setOpen(false)}
      className={cn(
        "fixed inset-0 z-50 bg-black/80 transition-opacity duration-200",
        open ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
      {...props}
    />
  )
})
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useDialog()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setMounted(true)
    } else {
      const t = window.setTimeout(() => setMounted(false), 200)
      return () => window.clearTimeout(t)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, setOpen])

  if (!mounted && !open) return null

  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg transition-all duration-200 sm:rounded-lg",
          open
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none",
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </DialogPortal>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
