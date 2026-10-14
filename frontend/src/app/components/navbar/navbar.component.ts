import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-expand-lg glass-nav mb-5 sticky-top shadow-sm">
      <div class="container">
        <!-- App Switcher Dropdown integrated directly on Brand Header -->
        <div class="dropdown me-3 position-relative">
          <button class="btn btn-link navbar-brand fw-bold text-decoration-none d-flex align-items-center p-0 shadow-none border-0"
                  type="button"
                  (click)="toggleAppMenu($event)"
                  title="Clicca per cambiare applicativo">
            
            <!-- PagaReader Brand -->
            <ng-container *ngIf="isPagaReaderRoute()">
              <div class="d-flex align-items-center text-primary">
                <i class="bi bi-cash-stack fs-4 me-2"></i>
                <span class="fs-4">PagaReader</span>
                <i class="bi bi-chevron-down ms-2 fs-6 opacity-75"></i>
              </div>
            </ng-container>

            <!-- InvestimentiReader Brand -->
            <ng-container *ngIf="isInvestimentiRoute()">
              <div class="d-flex align-items-center text-success">
                <i class="bi bi-graph-up-arrow fs-4 me-2"></i>
                <span class="fs-4">InvestimentiReader</span>
                <i class="bi bi-chevron-down ms-2 fs-6 opacity-75"></i>
              </div>
            </ng-container>

            <!-- MargineReading Brand -->
            <ng-container *ngIf="isMargineReadingRoute()">
              <div class="d-flex align-items-center" style="color: #6f42c1;">
                <i class="bi bi-pie-chart-fill fs-4 me-2"></i>
                <span class="fs-4">MargineReading</span>
                <i class="bi bi-chevron-down ms-2 fs-6 opacity-75"></i>
              </div>
            </ng-container>
          </button>

          <!-- Dropdown Switcher Menu with 3 Apps -->
          <ul class="dropdown-menu shadow-lg border-0 p-2 mt-2" 
              [class.show]="isAppMenuOpen"
              style="min-width: 300px; border-radius: 14px; position: absolute; z-index: 1050; top: 100%; left: 0;">
            <li class="px-2 py-1 text-muted small fw-bold text-uppercase" style="letter-spacing: 0.5px;">
              Seleziona Applicativo
            </li>
            <li><hr class="dropdown-divider my-1"></li>
            
            <!-- 1. PagaReader Option -->
            <li>
              <a class="dropdown-item rounded-3 p-2 d-flex align-items-center mb-1" 
                 [class.active]="isPagaReaderRoute()" 
                 [class.bg-primary]="isPagaReaderRoute()"
                 [class.text-white]="isPagaReaderRoute()"
                 (click)="selectApp('/')" 
                 style="cursor: pointer;">
                <div class="p-2 rounded-circle me-3 d-flex align-items-center justify-content-center" 
                     [class.bg-white]="isPagaReaderRoute()" 
                     [class.text-primary]="isPagaReaderRoute()" 
                     [class.bg-primary-subtle]="!isPagaReaderRoute()"
                     style="width: 38px; height: 38px;">
                  <i class="bi bi-cash-stack fs-5"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="fw-bold">PagaReader</div>
                  <div class="small" [class.text-white-50]="isPagaReaderRoute()" [class.text-muted]="!isPagaReaderRoute()">
                    Cedolini e buste paga
                  </div>
                </div>
                <i *ngIf="isPagaReaderRoute()" class="bi bi-check2 fs-5 ms-2 text-white"></i>
              </a>
            </li>

            <!-- 2. InvestimentiReader Option -->
            <li>
              <a class="dropdown-item rounded-3 p-2 d-flex align-items-center mb-1" 
                 [class.active]="isInvestimentiRoute()" 
                 [class.bg-success]="isInvestimentiRoute()"
                 [class.text-white]="isInvestimentiRoute()"
                 (click)="selectApp('/investimenti')" 
                 style="cursor: pointer;">
                <div class="p-2 rounded-circle me-3 d-flex align-items-center justify-content-center" 
                     [class.bg-white]="isInvestimentiRoute()" 
                     [class.text-success]="isInvestimentiRoute()" 
                     [class.bg-success-subtle]="!isInvestimentiRoute()"
                     style="width: 38px; height: 38px;">
                  <i class="bi bi-graph-up-arrow fs-5"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="fw-bold">InvestimentiReader</div>
                  <div class="small" [class.text-white-50]="isInvestimentiRoute()" [class.text-muted]="!isInvestimentiRoute()">
                    Portafoglio titoli Directa
                  </div>
                </div>
                <i *ngIf="isInvestimentiRoute()" class="bi bi-check2 fs-5 ms-2 text-white"></i>
              </a>
            </li>

            <!-- 3. MargineReading Option -->
            <li>
              <a class="dropdown-item rounded-3 p-2 d-flex align-items-center" 
                 [class.active]="isMargineReadingRoute()" 
                 [style.backgroundColor]="isMargineReadingRoute() ? '#6f42c1' : ''"
                 [class.text-white]="isMargineReadingRoute()"
                 (click)="selectApp('/margine-reading')" 
                 style="cursor: pointer;">
                <div class="p-2 rounded-circle me-3 d-flex align-items-center justify-content-center" 
                     [class.bg-white]="isMargineReadingRoute()" 
                     [style.color]="isMargineReadingRoute() ? '#6f42c1' : '#6f42c1'" 
                     [style.backgroundColor]="!isMargineReadingRoute() ? 'rgba(111, 66, 193, 0.1)' : ''"
                     style="width: 38px; height: 38px;">
                  <i class="bi bi-pie-chart-fill fs-5"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="fw-bold">MargineReading</div>
                  <div class="small" [class.text-white-50]="isMargineReadingRoute()" [class.text-muted]="!isMargineReadingRoute()">
                    Budgeting & marginalità
                  </div>
                </div>
                <i *ngIf="isMargineReadingRoute()" class="bi bi-check2 fs-5 ms-2 text-white"></i>
              </a>
            </li>
          </ul>
        </div>

        <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0 fw-medium" *ngIf="isLoggedIn$ | async">
            
            <!-- PagaReader Nav Items -->
            <ng-container *ngIf="isPagaReaderRoute()">
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
            </ng-container>

            <!-- InvestimentiReader Nav Items -->
            <ng-container *ngIf="isInvestimentiRoute()">
              <li class="nav-item mx-1">
                <a class="nav-link px-3 rounded-pill active bg-success bg-opacity-10 text-success" routerLink="/investimenti">
                  <i class="bi bi-graph-up-arrow me-1"></i> Portafoglio Directa
                </a>
              </li>
              <li class="nav-item mx-1">
                <a class="nav-link px-3 rounded-pill text-muted" routerLink="/" style="cursor: pointer;">
                  <i class="bi bi-arrow-left-short me-1"></i> Torna a PagaReader
                </a>
              </li>
            </ng-container>

            <!-- MargineReading Nav Items -->
            <ng-container *ngIf="isMargineReadingRoute()">
              <li class="nav-item mx-1">
                <a class="nav-link px-3 rounded-pill active" style="color: #6f42c1; background-color: rgba(111, 66, 193, 0.1);" routerLink="/margine-reading">
                  <i class="bi bi-pie-chart-fill me-1"></i> Budgeting & Forecast
                </a>
              </li>
              <li class="nav-item mx-1">
                <a class="nav-link px-3 rounded-pill text-muted" routerLink="/" style="cursor: pointer;">
                  <i class="bi bi-arrow-left-short me-1"></i> Torna a PagaReader
                </a>
              </li>
            </ng-container>

            <li class="nav-item mx-1" *ngIf="isAdmin()">
              <a class="nav-link px-3 rounded-pill text-danger" routerLink="/admin/users" routerLinkActive="active bg-danger bg-opacity-10 text-danger fw-bold">
                <i class="bi bi-shield-lock me-1"></i> Admin Panel
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
            <button *ngIf="isLoggedIn$ | async" class="btn btn-outline-danger rounded-pill px-3 py-1" (click)="logout()" title="Logout">
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
  private router = inject(Router);

  isLoggedIn$ = this.authService.isLoggedIn$;
  isAppMenuOpen = false;

  ngOnInit() {
  }

  isInvestimentiRoute(): boolean {
    return this.router.url.includes('/investimenti');
  }

  isMargineReadingRoute(): boolean {
    return this.router.url.includes('/margine-reading');
  }

  isPagaReaderRoute(): boolean {
    return !this.isInvestimentiRoute() && !this.isMargineReadingRoute();
  }

  toggleAppMenu(event: Event) {
    event.stopPropagation();
    this.isAppMenuOpen = !this.isAppMenuOpen;
  }

  selectApp(route: string) {
    this.isAppMenuOpen = false;
    this.router.navigate([route]);
  }

  @HostListener('document:click')
  closeAppMenu() {
    this.isAppMenuOpen = false;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  isDarkTheme(): boolean {
    return this.themeService.getTheme() === 'dark';
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
}
