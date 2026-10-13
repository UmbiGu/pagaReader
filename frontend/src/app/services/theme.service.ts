import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme: 'light' | 'dark' = 'light';
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      const saved = localStorage.getItem('pagareader-theme');
      if (saved === 'dark' || saved === 'light') {
        this.currentTheme = saved;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.currentTheme = 'dark';
      }
      this.applyTheme(this.currentTheme);
    }
  }

  toggleTheme(): void {
    if (!this.isBrowser) return;
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
  }

  getTheme(): string {
    return this.currentTheme;
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    if (this.isBrowser) {
      document.documentElement.setAttribute('data-bs-theme', theme);
      localStorage.setItem('pagareader-theme', theme);
    }
  }
}
