// components/ui/button.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

/** Simple class concatenator – avoids pulling in clsx */
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

/* -------------------------------------------------------------------------
 * Variant-driven Tailwind button using class-variance-authority (CVA)
 * --------------------------------------------------------------------- */

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold',
    'transition-all duration-200 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    'disabled:pointer-events-none disabled:opacity-60',
    'active:scale-95',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:from-teal-600 hover:to-emerald-700 focus-visible:ring-emerald-500',
        secondary:
          'bg-white/80 backdrop-blur-sm text-teal-800 border border-teal-300/70 shadow-sm hover:bg-white hover:border-teal-400 hover:shadow-md focus-visible:ring-teal-400',
        ghost:
          'bg-transparent text-teal-700 hover:bg-teal-100/50 active:bg-teal-100/70 focus-visible:ring-teal-300',
      },
      size: {
        default: 'h-10 px-5 py-2 text-sm',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
