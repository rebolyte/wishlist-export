/// <reference types="alpinejs" />

declare global {
  const Alpine: import('alpinejs').Alpine;
  
  interface Window {
    Alpine: import('alpinejs').Alpine;
  }
}

export {};
