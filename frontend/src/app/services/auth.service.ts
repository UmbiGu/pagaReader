import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  
  private authState = new BehaviorSubject<boolean>(this.checkToken());
  public isLoggedIn$ = this.authState.asObservable();

  private checkToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('pagareader-token');
    }
    return false;
  }

  login(credentials: any): Observable<any> {
    return this.http.post('https://pagareader-1.onrender.com/api/auth/login', credentials).pipe(
      tap((response: any) => {
        if (isPlatformBrowser(this.platformId) && response.token) {
          localStorage.setItem('pagareader-token', response.token);
          this.authState.next(true);
        }
      })
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('pagareader-token');
      this.authState.next(false);
    }
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('pagareader-token');
    }
    return null;
  }
}