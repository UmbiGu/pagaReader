import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container d-flex justify-content-center align-items-center" style="min-height: 80vh;">
      <div class="card shadow-lg border-0 animate-fade-in" style="max-width: 450px; width: 100%; border-radius: 20px;">
        <div class="card-body p-5 text-center">
          <div class="mb-4">
            <i class="bi bi-cash-stack text-primary" style="font-size: 3rem;"></i>
            <h2 class="fw-bold mt-2">Welcome Back</h2>
            <p class="text-muted">Sign in to PagaReader to access your dashboard</p>
          </div>

          <div *ngIf="errorMsg" class="alert alert-danger py-2 small">
            {{ errorMsg }}
          </div>

          <div class="d-grid gap-3 mb-4">
            <!-- Apple SSO Mock -->
            <button class="btn btn-dark rounded-pill py-2 fw-medium d-flex align-items-center justify-content-center" (click)="loginSSO()">
              <i class="bi bi-apple fs-5 me-2"></i> Continue with Apple
            </button>
            
            <!-- Google SSO Mock -->
            <button class="btn btn-outline-secondary rounded-pill py-2 fw-medium d-flex align-items-center justify-content-center" (click)="loginSSO()">
              <i class="bi bi-google fs-5 me-2 text-danger"></i> Continue with Google
            </button>
          </div>

          <div class="position-relative mb-4">
            <hr class="text-secondary opacity-25">
            <span class="position-absolute top-50 start-50 translate-middle px-3 bg-body text-muted small">OR TEST ACCOUNT</span>
          </div>

          <form (submit)="loginCredentials($event)">
            <div class="form-floating mb-3 text-start">
              <input type="email" class="form-control rounded-4" id="floatingInput" placeholder="name@example.com" [(ngModel)]="email" name="email">
              <label for="floatingInput">Email address</label>
            </div>
            <div class="form-floating mb-4 text-start">
              <input type="password" class="form-control rounded-4" id="floatingPassword" placeholder="Password" [(ngModel)]="password" name="password">
              <label for="floatingPassword">Password</label>
            </div>
            <button class="btn btn-primary w-100 rounded-pill py-2 fw-bold" type="submit" [disabled]="isLoading">
               <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
               {{ isLoading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>
          
          <div class="mt-4 p-3 bg-light rounded text-start small border">
            <strong>Demo Credentials:</strong><br>
            Email: <code>test&#64;pagareader.com</code><br>
            Password: <code>password123</code>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AuthComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  email = '';
  password = '';
  errorMsg = '';
  isLoading = false;

  loginSSO() {
    alert("SSO not configured in this demo.");
  }

  loginCredentials(event: Event) {
    event.preventDefault();
    this.errorMsg = '';
    
    if (!this.email || !this.password) {
      this.errorMsg = 'Please enter both email and password.';
      return;
    }

    this.isLoading = true;
    
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.status === 401 ? 'Invalid email or password.' : 'A server error occurred.';
      }
    });
  }
}
