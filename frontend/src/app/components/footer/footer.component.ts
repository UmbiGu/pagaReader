import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="mt-auto border-top py-5 bg-body-tertiary transition-theme" *ngIf="authService.isLoggedIn()">
      <div class="container">
        <div class="row g-4 mb-4">
          <!-- Colonna 1: Brand & Descrizione -->
          <div class="col-lg-4 col-md-6">
            <div class="d-flex align-items-center gap-2 mb-3">
              <div class="bg-primary text-white p-2 rounded-3 shadow-sm d-inline-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
                <i class="bi bi-wallet2 fs-5"></i>
              </div>
              <h5 class="fw-bold mb-0 tracking-tight">PagaReader Suite</h5>
            </div>
            <p class="text-muted small mb-3" style="line-height: 1.6;">
              Piattaforma integrata per il monitoraggio avanzato di buste paga, bilancio personale mensile e portafoglio titoli in tempo reale.
            </p>
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-1 px-2 rounded-pill small">
                <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem;"></i> Servizi Attivi
              </span>
              <span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 py-1 px-2 rounded-pill small">
                v2.4.0 Stable
              </span>
            </div>
          </div>

          <!-- Colonna 2: Link Rapidi -->
          <div class="col-lg-2 col-md-6 col-6">
            <h6 class="fw-bold text-uppercase small tracking-wider mb-3 text-secondary">Moduli Suite</h6>
            <ul class="list-unstyled mb-0 small d-flex flex-column gap-2">
              <li>
                <a routerLink="/" class="text-decoration-none text-muted text-hover-primary d-inline-flex align-items-center">
                  <i class="bi bi-chevron-right me-1" style="font-size: 0.7rem;"></i> Buste Paga
                </a>
              </li>
              <li>
                <a routerLink="/charts" class="text-decoration-none text-muted text-hover-primary d-inline-flex align-items-center">
                  <i class="bi bi-chevron-right me-1" style="font-size: 0.7rem;"></i> Analytics Cedolini
                </a>
              </li>
              <li>
                <a routerLink="/investimenti" class="text-decoration-none text-muted text-hover-primary d-inline-flex align-items-center">
                  <i class="bi bi-chevron-right me-1" style="font-size: 0.7rem;"></i> InvestimentiReader
                </a>
              </li>
              <li>
                <a routerLink="/margine-reading" class="text-decoration-none text-muted text-hover-primary d-inline-flex align-items-center">
                  <i class="bi bi-chevron-right me-1" style="font-size: 0.7rem;"></i> MargineReading
                </a>
              </li>
            </ul>
          </div>

          <!-- Colonna 3: Funzionalità e Risorse -->
          <div class="col-lg-3 col-md-6 col-6">
            <h6 class="fw-bold text-uppercase small tracking-wider mb-3 text-secondary">Funzionalità</h6>
            <ul class="list-unstyled mb-0 small d-flex flex-column gap-2">
              <li class="text-muted d-flex align-items-center">
                <i class="bi bi-check2-circle text-primary me-2"></i> Budgeting & Categorie
              </li>
              <li class="text-muted d-flex align-items-center">
                <i class="bi bi-check2-circle text-primary me-2"></i> Import Incrementale
              </li>
              <li class="text-muted d-flex align-items-center">
                <i class="bi bi-check2-circle text-primary me-2"></i> Grafici Personalizzati
              </li>
              <li class="text-muted d-flex align-items-center" *ngIf="authService.isAdmin()">
                <a routerLink="/users" class="text-decoration-none text-muted text-hover-primary d-inline-flex align-items-center">
                  <i class="bi bi-shield-lock text-warning me-2"></i> Gestione Utenti
                </a>
              </li>
            </ul>
          </div>

          <!-- Colonna 4: Sicurezza & Privacy -->
          <div class="col-lg-3 col-md-6">
            <h6 class="fw-bold text-uppercase small tracking-wider mb-3 text-secondary">Sicurezza & Privacy</h6>
            <p class="text-muted small mb-3">
              I tuoi dati finanziari sono protetti da autenticazione JWT con policy Zero-Knowledge e crittografia end-to-end.
            </p>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1" (click)="themeService.toggleTheme()">
                <i class="bi" [class.bi-moon-stars-fill]="themeService.getTheme() === 'dark'" [class.bi-sun-fill]="themeService.getTheme() === 'light'"></i>
                <span class="ms-1 small">{{ themeService.getTheme() === 'dark' ? 'Tema Chiaro' : 'Tema Scuro' }}</span>
              </button>
              <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1" (click)="scrollToTop()">
                <i class="bi bi-arrow-up"></i> Inizio
              </button>
            </div>
          </div>
        </div>

        <hr class="border-secondary opacity-25 my-4">

        <div class="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 small text-muted">
          <div>
            &copy; 2026 <strong>PagaReader Suite</strong>. Tutti i diritti riservati.
          </div>
          <div class="d-flex align-items-center gap-3">
            <span>Privacy Policy</span>
            <span>&bull;</span>
            <span>Termini di Servizio</span>
            <span>&bull;</span>
            <span class="text-primary fw-semibold">Versione 2.4</span>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .text-hover-primary:hover {
      color: var(--bs-primary) !important;
      transform: translateX(2px);
      transition: all 0.2s ease;
    }
    .tracking-tight {
      letter-spacing: -0.02em;
    }
    .tracking-wider {
      letter-spacing: 0.05em;
    }
  `]
})
export class FooterComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
