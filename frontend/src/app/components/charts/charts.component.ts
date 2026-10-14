import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in flex-wrap gap-2">
      <div>
        <h2 class="mb-0 fw-bold text-primary"><i class="bi bi-bar-chart-line me-2"></i> Analytics & Trend Cedolini</h2>
        <p class="text-muted mb-0">Analisi retributiva, delta mese su mese e proiezioni temporali.</p>
      </div>
      
      <div class="d-flex gap-2 flex-wrap align-items-center">
        <!-- Year Filter -->
        <select class="form-select shadow-sm rounded-pill px-3" style="width: auto; min-width: 140px;" [(ngModel)]="selectedYear" (change)="onYearChange()">
          <option value="all">Tutti gli anni</option>
          <option *ngFor="let year of availableYears" [value]="year">Anno {{ year }}</option>
        </select>

        <!-- Chart Type Selector -->
        <div class="btn-group shadow-sm" role="group">
          <button type="button" class="btn btn-sm" [ngClass]="selectedChart === 'salary' ? 'btn-primary' : 'btn-outline-primary bg-body'" (click)="setChart('salary')">
            <i class="bi bi-cash-stack d-none d-md-inline me-1"></i> Retribuzione
          </button>
          <button type="button" class="btn btn-sm" [ngClass]="selectedChart === 'fonte' ? 'btn-primary' : 'btn-outline-primary bg-body'" (click)="setChart('fonte')">
            <i class="bi bi-piggy-bank d-none d-md-inline me-1"></i> FONTE
          </button>
          <button type="button" class="btn btn-sm" [ngClass]="selectedChart === 'holidays' ? 'btn-primary' : 'btn-outline-primary bg-body'" (click)="setChart('holidays')">
            <i class="bi bi-sun d-none d-md-inline me-1"></i> Ferie
          </button>
          <button type="button" class="btn btn-sm" [ngClass]="selectedChart === 'rol' ? 'btn-primary' : 'btn-outline-primary bg-body'" (click)="setChart('rol')">
            <i class="bi bi-clock-history d-none d-md-inline me-1"></i> ROL & Ex-Fest
          </button>
        </div>
      </div>
    </div>

    <!-- MAIN CHART AREA WITH SERIES TOGGLES AND ZOOM CONTROLS -->
    <div class="row animate-fade-in delay-1 mb-5">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-body-tertiary py-3 border-bottom-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div class="fw-bold d-flex align-items-center">
              <span *ngIf="selectedChart === 'salary'"><i class="bi bi-bezier2 text-primary me-2"></i> Evoluzione Retributiva (Lordo, Netto, Trattenute, Imponibili)</span>
              <span *ngIf="selectedChart === 'fonte'"><i class="bi bi-piggy-bank text-success me-2"></i> Contributi Fondo Pensione FONTE</span>
              <span *ngIf="selectedChart === 'holidays'"><i class="bi bi-sun text-warning me-2"></i> Andamento Saldo Ferie</span>
              <span *ngIf="selectedChart === 'rol'"><i class="bi bi-clock text-info me-2"></i> Andamento Saldi ROL ed Ex-Festività</span>
            </div>

            <!-- Zoom & Range Controls -->
            <div class="d-flex align-items-center gap-2">
              <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-secondary" [class.active]="zoomRange === '3m'" (click)="setZoom('3m')">3M</button>
                <button type="button" class="btn btn-outline-secondary" [class.active]="zoomRange === '6m'" (click)="setZoom('6m')">6M</button>
                <button type="button" class="btn btn-outline-secondary" [class.active]="zoomRange === '12m'" (click)="setZoom('12m')">12M</button>
                <button type="button" class="btn btn-outline-secondary" [class.active]="zoomRange === 'all'" (click)="setZoom('all')">Tutto</button>
              </div>
              <div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-outline-primary" (click)="zoomIn()" title="Zoom In (+)">
                  <i class="bi bi-zoom-in"></i>
                </button>
                <button type="button" class="btn btn-outline-primary" (click)="zoomOut()" title="Zoom Out (-)">
                  <i class="bi bi-zoom-out"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" (click)="resetZoom()" title="Reset Zoom">
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Series Selector Checkboxes (Only for Salary chart) -->
          <div *ngIf="selectedChart === 'salary'" class="bg-body-secondary bg-opacity-50 px-4 py-2 border-bottom d-flex align-items-center gap-3 flex-wrap small">
            <span class="text-muted fw-bold me-1"><i class="bi bi-sliders2 me-1"></i> Serie visibili:</span>
            <div class="form-check form-check-inline m-0">
              <input class="form-check-input" type="checkbox" id="showNet" [(ngModel)]="showSeries.net" (change)="updateChart()">
              <label class="form-check-label fw-medium text-success" for="showNet">Netto Mese</label>
            </div>
            <div class="form-check form-check-inline m-0">
              <input class="form-check-input" type="checkbox" id="showGross" [(ngModel)]="showSeries.gross" (change)="updateChart()">
              <label class="form-check-label fw-medium text-primary" for="showGross">Lordo Competenze</label>
            </div>
            <div class="form-check form-check-inline m-0">
              <input class="form-check-input" type="checkbox" id="showDeductions" [(ngModel)]="showSeries.deductions" (change)="updateChart()">
              <label class="form-check-label fw-medium text-danger" for="showDeductions">Trattenute</label>
            </div>
            <div class="form-check form-check-inline m-0">
              <input class="form-check-input" type="checkbox" id="showInps" [(ngModel)]="showSeries.inps" (change)="updateChart()">
              <label class="form-check-label fw-medium text-info" for="showInps">Imponibile INPS</label>
            </div>
            <div class="form-check form-check-inline m-0">
              <input class="form-check-input" type="checkbox" id="showIrpef" [(ngModel)]="showSeries.irpef" (change)="updateChart()">
              <label class="form-check-label fw-medium text-warning" for="showIrpef">Imponibile IRPEF</label>
            </div>
          </div>

          <div class="card-body">
            <div style="display: block; height: 420px;">
              <canvas *ngIf="isBrowser" baseChart
                [data]="mainChartData"
                [options]="mainChartOptions"
                [type]="'line'">
              </canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MONTH-OVER-MONTH DIFFERENCE SECTION WITH DYNAMIC FILTERS & SORTING -->
    <div class="d-flex justify-content-between align-items-center mb-3 animate-fade-in delay-2 flex-wrap gap-2">
      <h4 class="mb-0 fw-bold"><i class="bi bi-calculator text-primary me-2"></i> Delta Mese su Mese ({{ selectedYear === 'all' ? 'Tutto lo storico' : 'Anno ' + selectedYear }})</h4>
      <span class="badge bg-body-secondary text-body-emphasis border px-3 py-2 rounded-pill">
        Mostrati: <strong>{{ displayMomDifferences.length }}</strong> cedolini
      </span>
    </div>
    
    <div class="row animate-fade-in delay-3">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          
          <!-- Filter Controls Bar -->
          <div class="card-header bg-body-tertiary py-3 border-bottom-0 d-flex gap-3 align-items-center flex-wrap">
            <!-- Search Text Filter -->
            <div class="input-group input-group-sm" style="max-width: 250px;">
              <span class="input-group-text bg-body border-end-0"><i class="bi bi-search text-muted"></i></span>
              <input type="text" class="form-control border-start-0" placeholder="Filtra periodo (es. Dic, 2025)..." [(ngModel)]="tableSearch" (input)="applyTableFilters()">
            </div>

            <!-- Type Filter (Ordinarie vs 13ma vs 14ma) -->
            <div class="d-flex align-items-center gap-2">
              <label class="text-muted small fw-bold">Tipologia:</label>
              <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="tableTypeFilter" (change)="applyTableFilters()">
                <option value="all">Tutti i tipi</option>
                <option value="ordinaria">Solo Ordinarie</option>
                <option value="13ma">Solo 13ª Mensilità</option>
                <option value="14ma">Solo 14ª Mensilità</option>
              </select>
            </div>

            <!-- Clear Filters Button -->
            <button *ngIf="tableSearch || tableTypeFilter !== 'all'" class="btn btn-sm btn-outline-secondary rounded-pill" (click)="resetTableFilters()">
              <i class="bi bi-x-circle me-1"></i> Reset filtri
            </button>
          </div>

          <div class="card-body p-0">
            <div class="table-responsive" style="max-height: 520px;">
              <table class="table table-hover mb-0 align-middle text-center">
                <thead class="table-light text-secondary sticky-top">
                  <tr>
                    <th class="text-start ps-4" style="cursor: pointer;" (click)="sortTable('period')">
                      Periodo
                      <i class="bi ms-1" [ngClass]="getSortIcon('period')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortTable('salary')">
                      Delta Netto
                      <i class="bi ms-1" [ngClass]="getSortIcon('salary')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortTable('holidays')">
                      Delta Ferie
                      <i class="bi ms-1" [ngClass]="getSortIcon('holidays')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortTable('exfest')">
                      Delta Ex-Fest.
                      <i class="bi ms-1" [ngClass]="getSortIcon('exfest')"></i>
                    </th>
                    <th class="pe-4" style="cursor: pointer;" (click)="sortTable('rol')">
                      Delta ROL
                      <i class="bi ms-1" [ngClass]="getSortIcon('rol')"></i>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (diff of displayMomDifferences; track diff.payslip.id) {
                    <tr>
                      <td class="text-start fw-bold ps-4">
                        {{ payslipService.getMonthName(diff.payslip.month, diff.payslip.aggiuntiva) }} {{ diff.payslip.year }}
                        <span *ngIf="diff.payslip.aggiuntiva && diff.payslip.month === 12" class="badge bg-warning bg-opacity-10 text-warning border border-warning-subtle ms-1">13ª</span>
                        <span *ngIf="diff.payslip.aggiuntiva && diff.payslip.month === 6" class="badge bg-info bg-opacity-10 text-info border border-info-subtle ms-1">14ª</span>
                      </td>
                      
                      <!-- Salary Delta -->
                      <td>
                        <span class="badge rounded-pill px-3 py-2" 
                              [ngClass]="diff.salaryDiff > 0 ? 'bg-success bg-opacity-10 text-success' : (diff.salaryDiff < 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.salaryDiff > 0 ? 'bi-arrow-up' : (diff.salaryDiff < 0 ? 'bi-arrow-down' : 'bi-dash')"></i>
                          € {{ diff.salaryDiff | number:'1.2-2' }}
                        </span>
                      </td>

                      <!-- Holidays Delta -->
                      <td>
                        <span class="badge rounded-pill px-2 py-1" 
                              [ngClass]="diff.holidaysDiff > 0 ? 'bg-primary bg-opacity-10 text-primary' : (diff.holidaysDiff < 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.holidaysDiff > 0 ? 'bi-plus' : (diff.holidaysDiff < 0 ? 'bi-dash' : 'bi-dash')"></i>
                          {{ diff.holidaysDiff > 0 ? '+' : '' }}{{ diff.holidaysDiff | number:'1.1-2' }} h
                        </span>
                      </td>

                      <!-- Ex-Fest Delta -->
                      <td>
                        <span class="badge rounded-pill px-2 py-1" 
                              [ngClass]="diff.exFestDiff > 0 ? 'bg-primary bg-opacity-10 text-primary' : (diff.exFestDiff < 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.exFestDiff > 0 ? 'bi-plus' : (diff.exFestDiff < 0 ? 'bi-dash' : 'bi-dash')"></i>
                          {{ diff.exFestDiff > 0 ? '+' : '' }}{{ diff.exFestDiff | number:'1.1-2' }} h
                        </span>
                      </td>

                      <!-- ROL Delta -->
                      <td class="pe-4">
                        <span class="badge rounded-pill px-2 py-1" 
                              [ngClass]="diff.rolDiff > 0 ? 'bg-info bg-opacity-10 text-info' : (diff.rolDiff < 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.rolDiff > 0 ? 'bi-plus' : (diff.rolDiff < 0 ? 'bi-dash' : 'bi-dash')"></i>
                          {{ diff.rolDiff > 0 ? '+' : '' }}{{ diff.rolDiff | number:'1.1-2' }} h
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="py-5 text-muted">Nessun dato corrispondente ai filtri impostati.</td>
                    </tr>
                  }
                </tbody>
                <tfoot *ngIf="displayMomDifferences.length > 0" class="table-group-divider bg-body-tertiary">
                  <tr class="fw-bold">
                    <td class="text-start ps-4">Totale Delta Filtrato</td>
                    <td [ngClass]="filteredTotalSalaryDiff > 0 ? 'text-success' : (filteredTotalSalaryDiff < 0 ? 'text-danger' : '')">
                      {{ filteredTotalSalaryDiff > 0 ? '+' : '' }}€ {{ filteredTotalSalaryDiff | number:'1.2-2' }}
                    </td>
                    <td [ngClass]="filteredTotalHolidaysDiff > 0 ? 'text-primary' : (filteredTotalHolidaysDiff < 0 ? 'text-warning' : '')">
                      {{ filteredTotalHolidaysDiff > 0 ? '+' : '' }}{{ filteredTotalHolidaysDiff | number:'1.1-2' }} h
                    </td>
                    <td [ngClass]="filteredTotalExFestDiff > 0 ? 'text-primary' : (filteredTotalExFestDiff < 0 ? 'text-warning' : '')">
                      {{ filteredTotalExFestDiff > 0 ? '+' : '' }}{{ filteredTotalExFestDiff | number:'1.1-2' }} h
                    </td>
                    <td class="pe-4" [ngClass]="filteredTotalRolDiff > 0 ? 'text-info' : (filteredTotalRolDiff < 0 ? 'text-warning' : '')">
                      {{ filteredTotalRolDiff > 0 ? '+' : '' }}{{ filteredTotalRolDiff | number:'1.1-2' }} h
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
  private platformId = inject(PLATFORM_ID);
  
  isBrowser = false;
  payslips: Payslip[] = [];
  filteredPayslips: Payslip[] = [];
  selectedChart: 'salary' | 'holidays' | 'rol' | 'fonte' = 'salary';
  
  selectedYear: string | 'all' = 'all';
  availableYears: number[] = [];

  // Zoom & time window state
  zoomRange: '3m' | '6m' | '12m' | 'all' = 'all';
  zoomSliceCount: number | null = null;

  // Series visibility toggles for salary chart
  showSeries = {
    net: true,
    gross: true,
    deductions: true,
    inps: false,
    irpef: false
  };

  // Table filters & sorting
  tableSearch = '';
  tableTypeFilter: 'all' | 'ordinaria' | '13ma' | '14ma' = 'all';
  sortField: 'period' | 'salary' | 'holidays' | 'exfest' | 'rol' = 'period';
  sortAsc = false; // Descending by default

  mainChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  mainChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { 
      line: { tension: 0.4 }, 
      point: { 
        radius: 0, 
        hitRadius: 10, 
        hoverRadius: 6, 
        hoverBorderWidth: 2 
      } 
    },
    scales: {
      y: { grid: { color: 'rgba(125, 125, 125, 0.15)' } },
      x: { grid: { display: false } }
    },
    plugins: { 
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  momDifferences: any[] = [];
  displayMomDifferences: any[] = [];

  get filteredTotalSalaryDiff(): number {
    return this.displayMomDifferences.reduce((acc, curr) => acc + curr.salaryDiff, 0);
  }

  get filteredTotalHolidaysDiff(): number {
    return this.displayMomDifferences.reduce((acc, curr) => acc + curr.holidaysDiff, 0);
  }

  get filteredTotalExFestDiff(): number {
    return this.displayMomDifferences.reduce((acc, curr) => acc + curr.exFestDiff, 0);
  }

  get filteredTotalRolDiff(): number {
    return this.displayMomDifferences.reduce((acc, curr) => acc + curr.rolDiff, 0);
  }

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    this.payslipService.getPayslips().subscribe(data => {
      this.payslips = data || [];
      this.availableYears = [...new Set(this.payslips.map(p => p.year))].sort((a, b) => b - a);
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
    
    this.calculateDifferences();
    this.applyTableFilters();
    this.updateChart();
  }

  setChart(type: 'salary' | 'holidays' | 'rol' | 'fonte') {
    this.selectedChart = type;
    this.updateChart();
  }

  setZoom(range: '3m' | '6m' | '12m' | 'all') {
    this.zoomRange = range;
    switch (range) {
      case '3m': this.zoomSliceCount = 3; break;
      case '6m': this.zoomSliceCount = 6; break;
      case '12m': this.zoomSliceCount = 12; break;
      case 'all': this.zoomSliceCount = null; break;
    }
    this.updateChart();
  }

  zoomIn() {
    const currentCount = this.zoomSliceCount ?? this.filteredPayslips.length;
    if (currentCount > 3) {
      this.zoomSliceCount = Math.max(3, currentCount - 3);
      this.zoomRange = 'all'; // Custom
      this.updateChart();
    }
  }

  zoomOut() {
    const currentCount = this.zoomSliceCount ?? this.filteredPayslips.length;
    if (currentCount < this.filteredPayslips.length) {
      this.zoomSliceCount = Math.min(this.filteredPayslips.length, currentCount + 3);
      this.zoomRange = 'all';
      this.updateChart();
    }
  }

  resetZoom() {
    this.zoomRange = 'all';
    this.zoomSliceCount = null;
    this.updateChart();
  }

  updateChart() {
    let dataset = [...this.filteredPayslips];
    if (this.zoomSliceCount && this.zoomSliceCount < dataset.length) {
      dataset = dataset.slice(-this.zoomSliceCount);
    }

    const labels = dataset.map(p => `${this.payslipService.getMonthName(p.month, p.aggiuntiva)} ${p.year}`);
    let datasets: any[] = [];

    if (this.selectedChart === 'salary') {
      if (this.showSeries.net) {
        datasets.push({
          data: dataset.map(p => p.netSalary),
          label: 'Net Salary (€)',
          borderColor: 'rgba(25, 135, 84, 1)',
          backgroundColor: 'rgba(25, 135, 84, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(25, 135, 84, 1)',
          borderWidth: 2
        });
      }
      if (this.showSeries.gross) {
        datasets.push({
          data: dataset.map(p => p.totaleCompetenze),
          label: 'Total Gross (€)',
          borderColor: 'rgba(13, 110, 253, 1)',
          backgroundColor: 'transparent',
          fill: false,
          pointBackgroundColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 2
        });
      }
      if (this.showSeries.deductions) {
        datasets.push({
          data: dataset.map(p => p.totaleTrattenute),
          label: 'Deductions (€)',
          borderColor: 'rgba(220, 53, 69, 1)',
          backgroundColor: 'transparent',
          fill: false,
          pointBackgroundColor: 'rgba(220, 53, 69, 1)',
          borderWidth: 1.8
        });
      }
      if (this.showSeries.inps) {
        datasets.push({
          data: dataset.map(p => p.inpsTaxable),
          label: 'Imponibile INPS (€)',
          borderColor: 'rgba(13, 202, 240, 1)',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          fill: false,
          pointBackgroundColor: 'rgba(13, 202, 240, 1)',
          borderWidth: 1.5
        });
      }
      if (this.showSeries.irpef) {
        datasets.push({
          data: dataset.map(p => p.irpefTaxable),
          label: 'Imponibile IRPEF (€)',
          borderColor: 'rgba(255, 193, 7, 1)',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          fill: false,
          pointBackgroundColor: 'rgba(255, 193, 7, 1)',
          borderWidth: 1.5
        });
      }
    } else if (this.selectedChart === 'fonte') {
      datasets = [
        {
          data: dataset.map(p => p.fonteDipendente),
          label: 'Quota Dipendente (€)',
          borderColor: 'rgba(32, 201, 151, 1)',
          backgroundColor: 'rgba(32, 201, 151, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(32, 201, 151, 1)',
          borderWidth: 2
        },
        {
          data: dataset.map(p => p.fonteAzienda),
          label: 'Quota Azienda C/Ditta (€)',
          borderColor: 'rgba(111, 66, 193, 1)',
          backgroundColor: 'rgba(111, 66, 193, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(111, 66, 193, 1)',
          borderWidth: 2
        }
      ];
    } else if (this.selectedChart === 'holidays') {
      datasets = [
        {
          data: dataset.map(p => p.remainingHolidays),
          label: 'Saldo Ferie (Ore)',
          borderColor: 'rgba(255, 193, 7, 1)',
          backgroundColor: 'rgba(255, 193, 7, 0.15)',
          fill: true,
          pointBackgroundColor: 'rgba(255, 193, 7, 1)',
          borderWidth: 2.5
        },
        {
          data: dataset.map(p => p.ferieMaturate),
          label: 'Ferie Maturate (Ore)',
          borderColor: 'rgba(13, 110, 253, 0.8)',
          backgroundColor: 'transparent',
          fill: false,
          pointBackgroundColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 1.5
        },
        {
          data: dataset.map(p => p.ferieGodute),
          label: 'Ferie Godute (Ore)',
          borderColor: 'rgba(220, 53, 69, 0.8)',
          backgroundColor: 'transparent',
          fill: false,
          pointBackgroundColor: 'rgba(220, 53, 69, 1)',
          borderWidth: 1.5
        }
      ];
    } else if (this.selectedChart === 'rol') {
      datasets = [
        {
          data: dataset.map(p => p.remainingRol),
          label: 'Saldo R.O.L. (Ore)',
          borderColor: 'rgba(13, 202, 240, 1)',
          backgroundColor: 'rgba(13, 202, 240, 0.15)',
          fill: true,
          pointBackgroundColor: 'rgba(13, 202, 240, 1)',
          borderWidth: 2.5
        },
        {
          data: dataset.map(p => p.remainingExFest),
          label: 'Saldo Ex-Festività (Ore)',
          borderColor: 'rgba(102, 16, 242, 1)',
          backgroundColor: 'rgba(102, 16, 242, 0.1)',
          fill: true,
          pointBackgroundColor: 'rgba(102, 16, 242, 1)',
          borderWidth: 2
        }
      ];
    }

    this.mainChartData = {
      labels: [...labels],
      datasets: [...datasets]
    };
  }

  private calculateDifferences() {
    this.momDifferences = [];
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
    
    // Default reverse for descending chronological order
    this.momDifferences.reverse();
  }

  applyTableFilters() {
    let list = [...this.momDifferences];

    // Filter by year if specific year selected
    if (this.selectedYear !== 'all') {
      const targetYear = parseInt(this.selectedYear as string, 10);
      list = list.filter(d => d.payslip.year === targetYear);
    }

    // Filter by type (ordinaria, 13ma, 14ma)
    if (this.tableTypeFilter === 'ordinaria') {
      list = list.filter(d => !d.payslip.aggiuntiva);
    } else if (this.tableTypeFilter === '13ma') {
      list = list.filter(d => d.payslip.aggiuntiva && d.payslip.month === 12);
    } else if (this.tableTypeFilter === '14ma') {
      list = list.filter(d => d.payslip.aggiuntiva && d.payslip.month === 6);
    }

    // Filter by search text
    if (this.tableSearch.trim()) {
      const q = this.tableSearch.toLowerCase().trim();
      list = list.filter(d => {
        const monthName = this.payslipService.getMonthName(d.payslip.month, d.payslip.aggiuntiva).toLowerCase();
        const yearStr = d.payslip.year.toString();
        return monthName.includes(q) || yearStr.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      switch (this.sortField) {
        case 'period':
          valA = a.payslip.year * 100 + a.payslip.month + (a.payslip.aggiuntiva ? 0.5 : 0);
          valB = b.payslip.year * 100 + b.payslip.month + (b.payslip.aggiuntiva ? 0.5 : 0);
          break;
        case 'salary':
          valA = a.salaryDiff;
          valB = b.salaryDiff;
          break;
        case 'holidays':
          valA = a.holidaysDiff;
          valB = b.holidaysDiff;
          break;
        case 'exfest':
          valA = a.exFestDiff;
          valB = b.exFestDiff;
          break;
        case 'rol':
          valA = a.rolDiff;
          valB = b.rolDiff;
          break;
      }

      return this.sortAsc ? (valA - valB) : (valB - valA);
    });

    this.displayMomDifferences = list;
  }

  sortTable(field: 'period' | 'salary' | 'holidays' | 'exfest' | 'rol') {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = false; // Descending first
    }
    this.applyTableFilters();
  }

  getSortIcon(field: 'period' | 'salary' | 'holidays' | 'exfest' | 'rol'): string {
    if (this.sortField !== field) return 'bi-arrow-down-up text-muted opacity-50';
    return this.sortAsc ? 'bi-arrow-up text-primary' : 'bi-arrow-down text-primary';
  }

  resetTableFilters() {
    this.tableSearch = '';
    this.tableTypeFilter = 'all';
    this.applyTableFilters();
  }
}
