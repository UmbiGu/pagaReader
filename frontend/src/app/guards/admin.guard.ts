import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  
  if (isPlatformBrowser(platformId)) {
    if (authService.getToken() && authService.isAdmin()) {
      return true;
    }
  } else {
    // Allow SSR to pass
    return true;
  }
  
  router.navigate(['/']);
  return false;
};
