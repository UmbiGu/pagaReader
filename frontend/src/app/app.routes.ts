import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PayslipListComponent } from './components/payslip-list/payslip-list.component';
import { ChartsComponent } from './components/charts/charts.component';
import { AuthComponent } from './components/auth/auth.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: AuthComponent },
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'settings', component: PayslipListComponent, canActivate: [authGuard] },
  { path: 'charts', component: ChartsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
