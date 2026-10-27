import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Minimal Slot component for implementing the 'asChild' pattern.
 * 
 * Merges props from the parent onto its immediate child.
 * Useful for polymorphic components that need to preserve styling while 
 * changing the underlying HTML element (e.g. Button as Link).
 */
export const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>(
  ({ children, ...props }, ref) => {
    if (!React.isValidElement(children)) {
      return null
    }

    const child = children as React.ReactElement<{ className?: string }> & { ref?: React.Ref<HTMLElement> }

    return React.cloneElement(child, {
      ...props,
      ...child.props,
      // @ts-expect-error - ref is a valid runtime prop for cloneElement but not in the element's props type
      ref: ref ? (node: HTMLElement | null) => {
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLElement | null>).current = node
        }
        
        const childRef = child.ref
        if (childRef) {
          if (typeof childRef === 'function') {
            childRef(node)
          } else {
            (childRef as React.MutableRefObject<HTMLElement | null>).current = node
          }
        }
      } : child.ref,
      className: cn(props.className, child.props.className),
    })
  }
)

Slot.displayName = "Slot"
