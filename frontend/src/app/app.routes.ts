import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PayslipListComponent } from './components/payslip-list/payslip-list.component';
import { ChartsComponent } from './components/charts/charts.component';
import { AuthComponent } from './components/auth/auth.component';
import { UsersComponent } from './components/users/users.component';
import { InvestimentiComponent } from './components/investimenti/investimenti.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: AuthComponent },
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'settings', component: PayslipListComponent, canActivate: [authGuard] },
  { path: 'charts', component: ChartsComponent, canActivate: [authGuard] },
  { path: 'investimenti', component: InvestimentiComponent, canActivate: [authGuard] },
  { path: 'admin/users', component: UsersComponent, canActivate: [authGuard, adminGuard] },
  { path: '**', redirectTo: '' }
];
