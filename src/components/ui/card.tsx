// components/ui/card.tsx
import * as React from 'react';

/**
 * Utility to concatenate class names – keeps Tailwind strings clean.
 */
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Card – a softly-styled container with rounded corners, border, glass blur and shadow.
 * Tailwind classes match the visual language used in the main chat UI.
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // Refine styling: slightly softer background, more subtle border, softer shadow
    className={cn(
      'rounded-2xl border border-black/5 bg-white/70 shadow-lg backdrop-blur-md',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

/**
 * CardContent – just applies padding; keep separate for flexibility (e.g. CardHeader later)
 */
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6', className)} {...props} />
));
CardContent.displayName = 'CardContent';
