// Global type augmentations.

// Google Analytics gtag, loaded in the root layout.
interface Window {
  gtag?: (...args: unknown[]) => void;
}
