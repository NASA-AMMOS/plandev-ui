import type { VariantProps } from '$lib/types/tailwind.js';
import type { Button as ButtonPrimitive } from 'bits-ui';
import { tv } from 'tailwind-variants';
import Root from './button.svelte';

const buttonVariants = tv({
  base: 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-6 px-2 py-2 text-xs',
      xs: 'h-4 px-1 py-0.5 rounded-sm text-xs',
      sm: 'h-5 px-1.5 py-1 rounded-md text-xs',
      lg: 'h-8 rounded-md px-4',
      xl: 'h-10 rounded-md px-4',
      icon: 'h-6 w-6',
      'icon-xs': 'h-4 w-4',
      'icon-sm': 'h-5 w-5',
      'icon-lg': 'h-8 w-8',
      'icon-xl': 'h-10 w-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

type Variant = VariantProps<typeof buttonVariants>['variant'];
type Size = VariantProps<typeof buttonVariants>['size'];

type Props = ButtonPrimitive.Props & {
  variant?: Variant;
  size?: Size;
};

type Events = ButtonPrimitive.Events;

export {
  //
  Root as Button,
  buttonVariants,
  Root,
  type Events as ButtonEvents,
  type Props as ButtonProps,
  type Events,
  type Props
};

