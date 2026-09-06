"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface SheetContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

function useSheet() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error("Sheet components must be used inside <Sheet />")
  return ctx
}

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Sheet({ open: controlledOpen, onOpenChange, children }: SheetProps) {
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
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  )
}

const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { setOpen } = useSheet()
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
SheetTrigger.displayName = "SheetTrigger"

const SheetClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { setOpen } = useSheet()
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
SheetClose.displayName = "SheetClose"

function SheetPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open, setOpen } = useSheet()
  return (
    <div
      ref={ref}
      onClick={() => setOpen(false)}
      className={cn(
        "fixed inset-0 z-50 bg-black/80 transition-opacity duration-300",
        open ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
      {...props}
    />
  )
})
SheetOverlay.displayName = "SheetOverlay"

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right"
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", className, children, ...props }, ref) => {
    const { open, setOpen } = useSheet()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
      if (open) {
        setMounted(true)
      } else {
        const t = window.setTimeout(() => setMounted(false), 300)
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

    const sideClasses = {
      top: "inset-x-0 top-0 border-b",
      bottom: "inset-x-0 bottom-0 border-t",
      left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
      right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
    }

    const transformClasses = {
      top: open ? "translate-y-0" : "-translate-y-full",
      bottom: open ? "translate-y-0" : "translate-y-full",
      left: open ? "translate-x-0" : "-translate-x-full",
      right: open ? "translate-x-0" : "translate-x-full",
    }

    return (
      <SheetPortal>
        <SheetOverlay />
        <div
          ref={ref}
          className={cn(
            "fixed z-50 gap-4 bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out",
            sideClasses[side],
            transformClasses[side],
            className
          )}
          {...props}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          {children}
        </div>
      </SheetPortal>
    )
  }
)
SheetContent.displayName = "SheetContent"

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
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
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
