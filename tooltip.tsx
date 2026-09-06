"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// 纯 React 实现的 Tooltip，完全不依赖 @radix-ui/react-tooltip
// 避免 Radix 预打包时引入第二份 React 实例导致 useRef null 崩溃

interface TooltipContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  delayDuration: number;
}
const TooltipContext = React.createContext<TooltipContextValue>({
  open: false,
  setOpen: () => {},
  delayDuration: 700,
});

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}
function TooltipProvider({ children, delayDuration = 700 }: TooltipProviderProps) {
  return <>{children}</>;
}

interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}
function Tooltip({ children, open: controlledOpen, defaultOpen = false, onOpenChange, delayDuration = 700 }: TooltipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback((v: boolean) => {
    setUncontrolledOpen(v);
    onOpenChange?.(v);
  }, [onOpenChange]);
  return (
    <TooltipContext.Provider value={{ open, setOpen, delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
}

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
  children: React.ReactNode;
}
function TooltipTrigger({ asChild, children, ...props }: TooltipTriggerProps) {
  const { setOpen, delayDuration } = React.useContext(TooltipContext);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setOpen(true), delayDuration);
  };
  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };
  const handleFocus = () => setOpen(true);
  const handleBlur = () => setOpen(false);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
      ...props,
    });
  }
  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {children}
    </span>
  );
}

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number;
  side?: "top" | "bottom" | "left" | "right";
}
const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, sideOffset = 4, side = "top", children, ...props }, ref) => {
    const { open } = React.useContext(TooltipContext);
    if (!open) return null;
    const sideClass = side === "bottom" ? "top-full mt-1" : side === "left" ? "right-full mr-1" : side === "right" ? "left-full ml-1" : "bottom-full mb-1";
    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
          "animate-in fade-in-0 zoom-in-95 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none",
          sideClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
