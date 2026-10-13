import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { PayslipService } from '../../services/payslip.service';
import { Payslip } from '../../models/payslip.model';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in">
      <h2 class="mb-0 fw-bold">Analytics & Charts</h2>
      
      <div class="d-flex gap-3 flex-wrap">
        <!-- Year Filter -->
        <select class="form-select shadow-sm rounded-pill px-3" style="width: auto; min-width: 130px;" [(ngModel)]="selectedYear" (change)="onYearChange()">
          <option value="all">All Years</option>
          <option *ngFor="let year of availableYears" [value]="year">{{ year }}</option>
        </select>

        <!-- Chart Type Selector -->
        <div class="btn-group shadow-sm" role="group">
          <button type="button" class="btn" [ngClass]="selectedChart === 'salary' ? 'btn-primary' : 'btn-outline-primary bg-body'" (click)="setChart('salary')">
            <i class="bi bi-cash-stack d-none d-md-inline me-1"></i> Salary
          </button>
          <button type="button" class="btn" [ngClass]="selectedChart === 'fonte' ? 'btn-primary' : 'btn-outline-primary bg-body'" (click)="setChart('fonte')">
            <i class="bi bi-piggy-bank d-none d-md-inline me-1"></i> FONTE
          </button>
          <button type="button" class="btn" [ngClass]="selectedChart === 'holidays' ? 'btn-primary' : 'btn-outline-primary bg-body'" (click)="setChart('holidays')">
            <i class="bi bi-brightness-high d-none d-md-inline me-1"></i> Holidays
          </button>
          <button type="button" class="btn" [ngClass]="selectedChart === 'rol' ? 'btn-primary' : 'btn-outline-primary bg-body'" (click)="setChart('rol')">
            <i class="bi bi-clock-history d-none d-md-inline me-1"></i> ROL
          </button>
        </div>
      </div>
    </div>

    <!-- MAIN CHART AREA -->
    <div class="row animate-fade-in delay-1 mb-5">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-body-tertiary fw-bold py-3 border-bottom-0">
            <span *ngIf="selectedChart === 'salary'"><i class="bi bi-bezier2 text-primary me-2"></i> Salary Evolution (Gross vs Net)</span>
            <span *ngIf="selectedChart === 'fonte'"><i class="bi bi-piggy-bank text-success me-2"></i> FONTE Complementary Pension Contributions</span>
            <span *ngIf="selectedChart === 'holidays'"><i class="bi bi-sun text-warning me-2"></i> Holidays Balance Trend</span>
            <span *ngIf="selectedChart === 'rol'"><i class="bi bi-clock text-info me-2"></i> ROL (Permessi) Balance Trend</span>
          </div>
          <div class="card-body">
            <div style="display: block; height: 400px;">
              <canvas baseChart
                [data]="mainChartData"
                [options]="mainChartOptions"
                [type]="'line'">
              </canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MONTH-OVER-MONTH DIFFERENCE SECTION -->
    <h4 class="mb-4 fw-bold animate-fade-in delay-2"><i class="bi bi-calculator text-primary me-2"></i> Month-over-Month Delta ({{ selectedYear === 'all' ? 'All Time' : selectedYear }})</h4>
    
    <div class="row animate-fade-in delay-3">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0 align-middle text-center">
                <thead class="table-light text-secondary">
                  <tr>
                    <th class="text-start ps-4">Period</th>
                    <th>Net Salary Delta</th>
                    <th>Holidays Delta</th>
                    <th>Ex-Fest Delta</th>
                    <th class="pe-4">ROL Delta</th>
                  </tr>
                </thead>
                <tbody>
                  @for (diff of filteredMomDifferences; track diff.payslip.id) {
                    <tr>
                      <td class="text-start fw-bold ps-4">
                        {{ payslipService.getMonthName(diff.payslip.month) }} {{ diff.payslip.year }}
                      </td>
                      
                      <!-- Salary Delta -->
                      <td>
                        <span class="badge rounded-pill" 
                              [ngClass]="diff.salaryDiff > 0 ? 'bg-success bg-opacity-10 text-success' : (diff.salaryDiff < 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.salaryDiff > 0 ? 'bi-arrow-up' : (diff.salaryDiff < 0 ? 'bi-arrow-down' : 'bi-dash')"></i>
                          € {{ diff.salaryDiff | number:'1.2-2' }}
                        </span>
                      </td>

                      <!-- Holidays Delta -->
                      <td>
                        <span class="badge rounded-pill" 
                              [ngClass]="diff.holidaysDiff > 0 ? 'bg-primary bg-opacity-10 text-primary' : (diff.holidaysDiff < 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.holidaysDiff > 0 ? 'bi-plus' : (diff.holidaysDiff < 0 ? 'bi-dash' : 'bi-dash')"></i>
                          {{ diff.holidaysDiff > 0 ? '+' : '' }}{{ diff.holidaysDiff | number:'1.2-2' }} h
                        </span>
                      </td>

                      <!-- Ex-Fest Delta -->
                      <td>
                        <span class="badge rounded-pill" 
                              [ngClass]="diff.exFestDiff > 0 ? 'bg-primary bg-opacity-10 text-primary' : (diff.exFestDiff < 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.exFestDiff > 0 ? 'bi-plus' : (diff.exFestDiff < 0 ? 'bi-dash' : 'bi-dash')"></i>
                          {{ diff.exFestDiff > 0 ? '+' : '' }}{{ diff.exFestDiff | number:'1.2-2' }} h
                        </span>
                      </td>

                      <!-- ROL Delta -->
                      <td class="pe-4">
                        <span class="badge rounded-pill" 
                              [ngClass]="diff.rolDiff > 0 ? 'bg-info bg-opacity-10 text-info' : (diff.rolDiff < 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.rolDiff > 0 ? 'bi-plus' : (diff.rolDiff < 0 ? 'bi-dash' : 'bi-dash')"></i>
                          {{ diff.rolDiff > 0 ? '+' : '' }}{{ diff.rolDiff | number:'1.2-2' }} h
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="py-4 text-muted">Insufficient data to calculate differences for the selected period.</td>
                    </tr>
                  }
                </tbody>
                <tfoot class="table-group-divider bg-body-tertiary">
                  <tr class="fw-bold">
                    <td class="text-start ps-4">Total Net Delta</td>
                    <td [ngClass]="totalSalaryDiff > 0 ? 'text-success' : (totalSalaryDiff < 0 ? 'text-danger' : '')">
                      {{ totalSalaryDiff > 0 ? '+' : '' }}€ {{ totalSalaryDiff | number:'1.2-2' }}
                    </td>
                    <td [ngClass]="totalHolidaysDiff > 0 ? 'text-primary' : (totalHolidaysDiff < 0 ? 'text-warning' : '')">
                      {{ totalHolidaysDiff > 0 ? '+' : '' }}{{ totalHolidaysDiff | number:'1.2-2' }} h
                    </td>
                    <td [ngClass]="totalExFestDiff > 0 ? 'text-primary' : (totalExFestDiff < 0 ? 'text-warning' : '')">
                      {{ totalExFestDiff > 0 ? '+' : '' }}{{ totalExFestDiff | number:'1.2-2' }} h
                    </td>
                    <td class="pe-4" [ngClass]="totalRolDiff > 0 ? 'text-info' : (totalRolDiff < 0 ? 'text-warning' : '')">
                      {{ totalRolDiff > 0 ? '+' : '' }}{{ totalRolDiff | number:'1.2-2' }} h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChartsComponent implements OnInit {
  payslipService = inject(PayslipService);

  payslips: Payslip[] = [];
  filteredPayslips: Payslip[] = [];
  selectedChart: 'salary' | 'holidays' | 'rol' | 'fonte' = 'salary';
  
  selectedYear: string | 'all' = 'all';
  availableYears: number[] = [];

  mainChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  mainChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { line: { tension: 0.4 } },
    scales: {
      y: { grid: { color: 'rgba(150, 150, 150, 0.1)' } },
      x: { grid: { display: false } }
    },
    plugins: { legend: { position: 'top' } }
  };

  momDifferences: any[] = [];
  filteredMomDifferences: any[] = [];

  get totalSalaryDiff(): number {
    return this.filteredMomDifferences.reduce((acc, curr) => acc + curr.salaryDiff, 0);
  }

  get totalHolidaysDiff(): number {
    return this.filteredMomDifferences.reduce((acc, curr) => acc + curr.holidaysDiff, 0);
  }

  get totalExFestDiff(): number {
    return this.filteredMomDifferences.reduce((acc, curr) => acc + curr.exFestDiff, 0);
  }

  get totalRolDiff(): number {
    return this.filteredMomDifferences.reduce((acc, curr) => acc + curr.rolDiff, 0);
  }

  ngOnInit() {
    this.payslipService.getPayslips().subscribe(data => {
      this.payslips = data;
      this.availableYears = [...new Set(data.map(p => p.year))].sort((a, b) => b - a);
      this.onYearChange();
    });
  }

  onYearChange() {
    if (this.selectedYear === 'all') {
      this.filteredPayslips = [...this.payslips];
    } else {
      const targetYear = parseInt(this.selectedYear as string, 10);
      this.filteredPayslips = this.payslips.filter(p => p.year === targetYear);
    }
    
    this.updateChart();
    this.calculateDifferences();
  }

  setChart(type: 'salary' | 'holidays' | 'rol' | 'fonte') {
    this.selectedChart = type;
    this.updateChart();
  }

  private updateChart() {
    const labels = this.filteredPayslips.map(p => `${this.payslipService.getMonthName(p.month)} ${p.year}`);
    let datasets: any[] = [];

    if (this.selectedChart === 'salary') {
      datasets = [
        {
          data: this.filteredPayslips.map(p => p.baseSalary + p.contingency + p.superminimo),
          label: 'Total Gross (Fixed Base)',
          borderColor: 'rgba(13, 110, 253, 1)',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(13, 110, 253, 1)'
        },
        {
          data: this.filteredPayslips.map(p => p.netSalary),
          label: 'Net Salary',
          borderColor: 'rgba(25, 135, 84, 1)',
          backgroundColor: 'rgba(25, 135, 84, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(25, 135, 84, 1)'
        }
      ];
    } else if (this.selectedChart === 'fonte') {
      datasets = [
        {
          data: this.filteredPayslips.map(p => p.fonteDipendente),
          label: 'Employee Contribution (€)',
          borderColor: 'rgba(32, 201, 151, 1)',
          backgroundColor: 'rgba(32, 201, 151, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(32, 201, 151, 1)'
        },
        {
          data: this.filteredPayslips.map(p => p.fonteAzienda),
          label: 'Employer Contribution (€)',
          borderColor: 'rgba(111, 66, 193, 1)',
          backgroundColor: 'rgba(111, 66, 193, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(111, 66, 193, 1)'
        }
      ];
    } else if (this.selectedChart === 'holidays') {
      datasets = [
        {
          data: this.filteredPayslips.map(p => p.remainingHolidays),
          label: 'Remaining Holidays Balance',
          borderColor: 'rgba(255, 193, 7, 1)',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(255, 193, 7, 1)'
        }
      ];
    } else if (this.selectedChart === 'rol') {
      datasets = [
        {
          data: this.filteredPayslips.map(p => p.remainingRol),
          label: 'Remaining ROL Balance',
          borderColor: 'rgba(13, 202, 240, 1)',
          backgroundColor: 'rgba(13, 202, 240, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(13, 202, 240, 1)'
        },
        {
          data: this.filteredPayslips.map(p => p.remainingExFest),
          label: 'Remaining Ex-Fest. Balance',
          borderColor: 'rgba(102, 16, 242, 1)',
          backgroundColor: 'rgba(102, 16, 242, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(102, 16, 242, 1)'
        }
      ];
    }

    this.mainChartData = { labels, datasets };
  }

  private calculateDifferences() {
    this.momDifferences = [];
    // Always calculate differences against the entire dataset to not lose month-over-month continuity
    // even if viewing a specific year, but we'll filter the display list later.
    for (let i = 1; i < this.payslips.length; i++) {
      const current = this.payslips[i];
      const prev = this.payslips[i - 1];
      
      this.momDifferences.push({
        payslip: current,
        salaryDiff: current.netSalary - prev.netSalary,
        holidaysDiff: current.remainingHolidays - prev.remainingHolidays,
        exFestDiff: current.remainingExFest - prev.remainingExFest,
        rolDiff: current.remainingRol - prev.remainingRol
      });
    }
    
    // Reverse for descending chronological order
    this.momDifferences.reverse();
    
    // Now filter the differences to match the selected year
    if (this.selectedYear === 'all') {
      this.filteredMomDifferences = [...this.momDifferences];
    } else {
      const targetYear = parseInt(this.selectedYear as string, 10);
      this.filteredMomDifferences = this.momDifferences.filter(d => d.payslip.year === targetYear);
    }
  }
}
