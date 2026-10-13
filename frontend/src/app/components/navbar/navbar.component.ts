import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-expand-lg glass-nav mb-5 sticky-top shadow-sm">
      <div class="container">
        <a class="navbar-brand fw-bold text-primary d-flex align-items-center" routerLink="/">
          <i class="bi bi-cash-stack fs-4 me-2"></i> PagaReader
        </a>
        <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0 fw-medium" *ngIf="isLoggedIn$ | async">
            <li class="nav-item mx-1">
              <a class="nav-link px-3 rounded-pill" routerLink="/" routerLinkActive="active bg-primary bg-opacity-10 text-primary" [routerLinkActiveOptions]="{exact: true}">
                <i class="bi bi-house-door me-1"></i> Dashboard
              </a>
            </li>
            <li class="nav-item mx-1">
              <a class="nav-link px-3 rounded-pill" routerLink="/charts" routerLinkActive="active bg-primary bg-opacity-10 text-primary">
                <i class="bi bi-bar-chart-line me-1"></i> Analytics
              </a>
            </li>
            <li class="nav-item mx-1">
              <a class="nav-link px-3 rounded-pill" routerLink="/settings" routerLinkActive="active bg-primary bg-opacity-10 text-primary">
                <i class="bi bi-gear me-1"></i> Settings & Archive
              </a>
            </li>
          </ul>
          <div class="d-flex align-items-center ms-auto">
            <button class="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center p-2 me-2"
                    style="width: 40px; height: 40px; border: 1px solid var(--bs-border-color);"
                    (click)="toggleTheme()"
                    title="Toggle Dark/Light Mode">
              <i class="bi fs-5" [ngClass]="isDarkTheme() ? 'bi-moon-stars-fill text-warning' : 'bi-sun-fill text-warning'"></i>
            </button>
            <button *ngIf="isLoggedIn$ | async" class="btn btn-outline-danger rounded-pill px-3 py-1" (click)="logout()">
              <i class="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent implements OnInit {
  themeService = inject(ThemeService);
  authService = inject(AuthService);

  isLoggedIn$ = this.authService.isLoggedIn$;

  ngOnInit() {
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  isDarkTheme(): boolean {
    return this.themeService.getTheme() === 'dark';
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
}
