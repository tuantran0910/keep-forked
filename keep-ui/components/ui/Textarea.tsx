import React, { forwardRef } from "react";
import { cn } from "utils/helpers";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxRows?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxRows, ...props }, ref) => {
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement;

      // Auto-resize feature
      if (maxRows !== undefined || props.rows === undefined) {
        target.style.height = "auto";
        if (maxRows) {
          const lineHeight =
            parseInt(getComputedStyle(target).lineHeight, 10) || 20;
          const maxHeight = lineHeight * maxRows;
          target.style.height = Math.min(target.scrollHeight, maxHeight) + "px";
          target.style.overflowY =
            target.scrollHeight > maxHeight ? "auto" : "hidden";
        } else {
          target.style.height = target.scrollHeight + "px";
        }
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-gray-200",
          "bg-transparent px-3 py-2 text-sm placeholder:text-gray-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          maxRows !== undefined
            ? "resize-none overflow-hidden"
            : "resize-vertical",
          className
        )}
        ref={ref}
        onInput={handleInput}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
