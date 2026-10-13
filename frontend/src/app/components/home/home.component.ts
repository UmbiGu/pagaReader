import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { PayslipService } from '../../services/payslip.service';
import { Payslip } from '../../models/payslip.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in">
      <div>
        <h2 class="fw-bold mb-0 text-primary">Welcome back{{ employeeName ? ', ' + employeeName : '' }} 👋</h2>
        <p class="text-muted mb-0">You have <strong>{{ payslipsCount }}</strong> payslips synchronized in your vault.</p>
      </div>
    </div>

    <div class="row mb-4">
      <!-- Latest Net Salary -->
      <div class="col-md-3 mb-3 animate-fade-in">
        <div class="card h-100 shadow-sm border-start border-4 border-success p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Latest Net Salary</h6>
                <h3 class="fw-bold mb-0 text-success">€ {{ latestNet | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-success bg-opacity-10 p-2 rounded-circle text-success">
                <i class="bi bi-wallet2 fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- RAL -->
      <div class="col-md-3 mb-3 animate-fade-in delay-1">
        <div class="card h-100 shadow-sm border-start border-4 border-primary p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Est. Gross (RAL)</h6>
                <h3 class="fw-bold mb-0 text-primary">€ {{ estimatedRal | number:'1.0-0' }}</h3>
              </div>
              <div class="bg-primary bg-opacity-10 p-2 rounded-circle text-primary">
                <i class="bi bi-briefcase fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.70rem;">*Base x 14 months</small>
          </div>
        </div>
      </div>
      
      <!-- Holidays Balance -->
      <div class="col-md-3 mb-3 animate-fade-in delay-2">
        <div class="card h-100 shadow-sm border-start border-4 border-warning p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Holidays Balance</h6>
                <h3 class="fw-bold mb-0 text-warning">{{ latestHolidays | number:'1.1-2' }} <small class="fs-6">h</small></h3>
              </div>
              <div class="bg-warning bg-opacity-10 p-2 rounded-circle text-warning">
                <i class="bi bi-sun fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ROL Balance -->
      <div class="col-md-3 mb-3 animate-fade-in delay-3">
        <div class="card h-100 shadow-sm border-start border-4 border-info p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">ROL & Permessi</h6>
                <h3 class="fw-bold mb-0 text-info">{{ latestRolExFest | number:'1.1-2' }} <small class="fs-6">h</small></h3>
              </div>
              <div class="bg-info bg-opacity-10 p-2 rounded-circle text-info">
                <i class="bi bi-clock-history fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CHART -->
    <div class="row mb-4 animate-fade-in delay-4">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-body-tertiary fw-bold py-3 border-bottom-0">
            <i class="bi bi-graph-up text-primary me-2"></i> Last 6 Months Net Salary Trend
          </div>
          <div class="card-body">
            <div style="display: block; height: 300px;">
              <canvas *ngIf="isBrowser" baseChart
                [data]="barChartData"
                [options]="barChartOptions"
                [type]="'bar'">
              </canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
  private payslipService = inject(PayslipService);
  private platformId = inject(PLATFORM_ID);
  
  isBrowser = false;
  
  employeeName = '';
  payslipsCount = 0;
  latestNet = 0;
  totalNet = 0;
  estimatedRal = 0;
  latestHolidays = 0;
  latestRolExFest = 0;

  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(150, 150, 150, 0.1)' } },
      x: { grid: { display: false } }
    }
  };

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    this.payslipService.getPayslips().subscribe(data => {
      this.calculateMetrics(data);
      if (this.isBrowser) {
        this.buildChart(data);
      }
    });
  }

  private calculateMetrics(data: Payslip[]) {
    this.payslipsCount = data.length;
    if (data.length > 0) {
      const latest = data[data.length - 1];
      
      if (latest.employeeName) {
         let parts = latest.employeeName.split(' ');
         this.employeeName = parts.length > 1 ? parts[1] : parts[0];
         this.employeeName = this.employeeName.charAt(0).toUpperCase() + this.employeeName.slice(1).toLowerCase();
      }

      this.latestNet = latest.netSalary;
      this.totalNet = data.reduce((acc, curr) => acc + curr.netSalary, 0);
      
      this.latestHolidays = latest.remainingHolidays;
      this.latestRolExFest = latest.remainingRol + latest.remainingExFest;
      
      const grossFixed = latest.baseSalary + latest.contingency + latest.superminimo + latest.terzoElemento + latest.straordinarioForfetizzato + latest.edr;
      this.estimatedRal = grossFixed * 14; 
    } else {
      this.latestNet = 0;
      this.totalNet = 0;
      this.estimatedRal = 0;
      this.latestHolidays = 0;
      this.latestRolExFest = 0;
    }
  }

  private buildChart(data: Payslip[]) {
    const recent = data.slice(-6);
    this.barChartData = {
      labels: recent.map(p => `${this.payslipService.getMonthName(p.month)} ${p.year}`),
      datasets: [
        {
          data: recent.map(p => p.netSalary),
          label: 'Net Salary (€)',
          backgroundColor: 'rgba(25, 135, 84, 0.8)',
          borderColor: 'rgba(25, 135, 84, 1)',
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(25, 135, 84, 1)'
        }
      ]
    };
  }
}