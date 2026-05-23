import * as React from "react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
}>({})

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    defaultValue?: string
    onChange?: (value: string) => void
    name?: string
  }
>(({ className, value, defaultValue, onChange, name, children, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || value)
  const uniqueName = React.useMemo(() => name || `radio-group-${Math.random().toString(36).substring(2, 11)}`, [name])

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
    }
  }, [value])

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      setInternalValue(newValue)
      onChange?.(newValue)
    },
    [onChange]
  )

  return (
    <RadioGroupContext.Provider
      value={{
        value: internalValue,
        defaultValue,
        onChange: handleValueChange,
        name: uniqueName,
      }}
    >
      <div
        ref={ref}
        className={cn("grid gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
  }
>(({ className, value, id, onClick, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext)
  const isChecked = context.value === value

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.disabled) return;
    context.onChange?.(value)
    onClick?.(e)
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      data-state={isChecked ? "checked" : "unchecked"}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center",
        className
      )}
      ref={ref}
      onClick={handleClick}
      id={id}
      {...props}
    >
      {isChecked && (
        <span className="h-2 w-2 rounded-full bg-primary" />
      )}
    </button>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
