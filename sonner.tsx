"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

// 用 DOM 类名检测深色模式，避免 useTheme (next-themes) 调用 useContext 触发 null dispatcher 崩溃
const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light"
    }
    return "system"
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
