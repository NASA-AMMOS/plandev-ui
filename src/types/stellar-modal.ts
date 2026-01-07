export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'auto' | 'full' | string;

export interface StellarModalOptions {
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  size?: ModalSize;
}

// Re-export existing types for compatibility
export type { ModalElement, ModalElementResolve, ModalElementValue } from './modal';
