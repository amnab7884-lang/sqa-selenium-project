import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/components/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "glass-badge border-primary/20 text-primary",
        secondary: "glass-badge border-secondary/20 text-secondary",
        destructive: "glass-badge border-red-500/20 text-red-400",
        outline: "glass-badge text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
