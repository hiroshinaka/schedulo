import * as React from "react"
import { cn } from "../../lib/utils"

const DropdownMenu = ({ children, open, onOpenChange, modal = true }) => {
  const [isOpen, setIsOpen] = React.useState(open || false)

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen)
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }

  return (
    <div className="relative inline-block z-[70]">
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { isOpen, setIsOpen: handleOpenChange })
          : child
      )}
    </div>
  )
}

const DropdownMenuTrigger = React.forwardRef(({ className, children, asChild, isOpen, setIsOpen, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : "button"
  
  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen?.(!isOpen)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onClick: (e) => {
        handleClick(e)
        children.props.onClick?.(e)
      },
      ref
    })
  }

  return (
    <Comp
      ref={ref}
      className={cn("cursor-pointer", className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Comp>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef(({ className, children, align = "start", isOpen, setIsOpen, ...props }, ref) => {
  const contentRef = React.useRef(null)

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        setIsOpen?.(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-[80] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        align === "end" && "right-0",
        align === "start" && "left-0",
        "mt-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef(({ className, onSelect, disabled, ...props }, ref) => {
  const handleClick = (e) => {
    if (!disabled && onSelect) {
      onSelect(e)
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        disabled
          ? "pointer-events-none opacity-50"
          : "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      onClick={handleClick}
      {...props}
    />
  )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

const DropdownMenuGroup = ({ children }) => {
  return <div>{children}</div>
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
}
