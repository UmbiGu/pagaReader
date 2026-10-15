import { Component, OnInit, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { PayslipService } from '../../services/payslip.service';
import { Payslip } from '../../models/payslip.model';
import { CustomChartService, CustomChartConfig } from '../../services/custom-chart.service';

declare var bootstrap: any;

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in flex-wrap gap-2">
      <div>
        <h2 class="mb-0 fw-bold text-primary"><i class="bi bi-bar-chart-line me-2"></i> Analytics & Trend Cedolini</h2>
        <p class="text-muted mb-0">Analisi retributiva, delta mese su mese e grafici personalizzati.</p>
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

        <button class="btn btn-primary rounded-pill shadow-sm px-3 btn-sm" (click)="openCustomChartModal()">
          <i class="bi bi-plus-circle me-1"></i> + Crea Grafico
        </button>
      </div>
    </div>

    <!-- MAIN CHART AREA -->
    <div class="row animate-fade-in delay-1 mb-4">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-transparent py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div class="fw-bold d-flex align-items-center">
              <span *ngIf="selectedChart === 'salary'"><i class="bi bi-bezier2 text-primary me-2"></i> Evoluzione Retributiva</span>
              <span *ngIf="selectedChart === 'fonte'"><i class="bi bi-piggy-bank text-success me-2"></i> Fondo Pensione FONTE</span>
              <span *ngIf="selectedChart === 'holidays'"><i class="bi bi-sun text-warning me-2"></i> Saldo Ferie</span>
              <span *ngIf="selectedChart === 'rol'"><i class="bi bi-clock text-info me-2"></i> Saldi ROL ed Ex-Festività</span>
            </div>

            <div class="d-flex align-items-center gap-2">
              <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-secondary" [class.active]="zoomRange === '3m'" (click)="setZoom('3m')">3M</button>
                <button type="button" class="btn btn-outline-secondary" [class.active]="zoomRange === '6m'" (click)="setZoom('6m')">6M</button>
                <button type="button" class="btn btn-outline-secondary" [class.active]="zoomRange === '12m'" (click)="setZoom('12m')">12M</button>
                <button type="button" class="btn btn-outline-secondary" [class.active]="zoomRange === 'all'" (click)="setZoom('all')">Tutto</button>
              </div>
            </div>
          </div>

          <!-- Series Filters (Salary Chart Only) -->
          <div *ngIf="selectedChart === 'salary'" class="px-4 py-2 bg-body-secondary border-bottom d-flex gap-3 flex-wrap align-items-center small">
            <span class="text-muted fw-bold me-1">Mostra:</span>
            <div class="form-check form-check-inline m-0">
              <input class="form-check-input" type="checkbox" id="showNet" [(ngModel)]="showSeries.net" (change)="updateChart()">
              <label class="form-check-label fw-medium text-success" for="showNet">Stipendio Netto</label>
            </div>
            <div class="form-check form-check-inline m-0">
              <input class="form-check-input" type="checkbox" id="showGross" [(ngModel)]="showSeries.gross" (change)="updateChart()">
              <label class="form-check-label fw-medium text-primary" for="showGross">Competenze</label>
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
            <div style="display: block; height: 380px; position: relative; width: 100%;">
              <canvas *ngIf="isBrowser && filteredPayslips.length > 0" baseChart
                [data]="mainChartData"
                [options]="mainChartOptions"
                [type]="'line'">
              </canvas>
              <div *ngIf="isBrowser && filteredPayslips.length === 0" class="text-center py-5 text-muted">
                Nessun dato di busta paga per il filtro selezionato.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CUSTOM CHARTS SECTION (If user created any) -->
    <div class="card shadow-sm border-0 mb-4" *ngIf="customCharts.length > 0">
      <div class="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
        <h6 class="fw-bold mb-0 text-primary">
          <i class="bi bi-stars me-2"></i> I tuoi Grafici Personalizzati (Cedolini)
        </h6>
        <span class="badge bg-body-secondary text-body border rounded-pill px-3 py-1">
          {{ customCharts.length }} salvati
        </span>
      </div>
      <div class="card-body">
        <div class="row g-4">
          <div class="col-lg-6" *ngFor="let cfg of customCharts">
            <div class="card border shadow-none h-100">
              <div class="card-header bg-transparent d-flex justify-content-between align-items-center py-2">
                <span class="fw-bold small">{{ cfg.title }}</span>
                <button class="btn btn-sm btn-link text-danger p-0" (click)="deleteCustomChart(cfg.id)" title="Elimina grafico">
                  <i class="bi bi-x-circle"></i>
                </button>
              </div>
              <div class="card-body">
                <div style="display: block; height: 260px; position: relative; width: 100%;">
                  <canvas baseChart [data]="getCustomChartData(cfg)" [options]="mainChartOptions" [type]="getChartType(cfg.chartType)"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DELTA TABLE MESE SU MESE -->
    <div class="row animate-fade-in delay-2 mb-5">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-transparent border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h5 class="mb-0 fw-bold text-body">
              <i class="bi bi-calculator text-primary me-2"></i> Delta Mese su Mese
            </h5>
            <span class="badge bg-body-secondary text-body border px-3 py-2 rounded-pill small">
              {{ displayMomDifferences.length }} variazioni storiche
            </span>
          </div>

          <!-- Table Filters Toolbar -->
          <div class="p-3 border-bottom d-flex gap-3 align-items-center flex-wrap">
            <div class="input-group input-group-sm" style="max-width: 280px;">
              <span class="input-group-text bg-body border-end-0"><i class="bi bi-search text-muted"></i></span>
              <input type="text" class="form-control border-start-0" placeholder="Cerca mese o anno..." [(ngModel)]="tableSearch" (input)="applyTableFilters()">
            </div>

            <div class="d-flex align-items-center gap-2">
              <label class="text-muted small fw-bold">Tipo:</label>
              <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="tableTypeFilter" (change)="applyTableFilters()">
                <option value="all">Tutti i tipi</option>
                <option value="ordinaria">Solo Ordinarie</option>
                <option value="13ma">Solo 13ª Mensilità</option>
                <option value="14ma">Solo 14ª Mensilità</option>
              </select>
            </div>

            <button *ngIf="tableSearch || tableTypeFilter !== 'all'" class="btn btn-sm btn-outline-secondary rounded-pill" (click)="resetTableFilters()">
              <i class="bi bi-x-circle me-1"></i> Reset filtri
            </button>
          </div>

          <div class="card-body p-0">
            <div class="table-responsive" style="max-height: 520px;">
              <table class="table table-modern table-hover mb-0 align-middle text-center">
                <thead class="table-light sticky-top">
                  <tr>
                    <th class="text-start ps-4" style="cursor: pointer;" (click)="sortTable('period')">
                      Periodo <i class="bi ms-1" [ngClass]="getSortIcon('period')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortTable('salary')">
                      Delta Netto <i class="bi ms-1" [ngClass]="getSortIcon('salary')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortTable('holidays')">
                      Delta Ferie <i class="bi ms-1" [ngClass]="getSortIcon('holidays')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortTable('exfest')">
                      Delta Ex-Fest. <i class="bi ms-1" [ngClass]="getSortIcon('exfest')"></i>
                    </th>
                    <th class="pe-4" style="cursor: pointer;" (click)="sortTable('rol')">
                      Delta ROL <i class="bi ms-1" [ngClass]="getSortIcon('rol')"></i>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (diff of displayMomDifferences; track diff.payslip.id) {
                    <tr>
                      <td class="text-start fw-bold ps-4 text-body">
                        {{ payslipService.getMonthName(diff.payslip.month, diff.payslip.aggiuntiva) }} {{ diff.payslip.year }}
                        <span *ngIf="diff.payslip.aggiuntiva && diff.payslip.month === 12" class="badge bg-warning bg-opacity-10 text-warning border border-warning-subtle ms-1">13ª</span>
                        <span *ngIf="diff.payslip.aggiuntiva && diff.payslip.month === 6" class="badge bg-info bg-opacity-10 text-info border border-info-subtle ms-1">14ª</span>
                      </td>
                      <td>
                        <span class="badge rounded-pill px-3 py-2" 
                              [ngClass]="diff.salaryDiff > 0 ? 'bg-success bg-opacity-10 text-success' : (diff.salaryDiff < 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.salaryDiff > 0 ? 'bi-arrow-up' : (diff.salaryDiff < 0 ? 'bi-arrow-down' : 'bi-dash')"></i>
                          € {{ diff.salaryDiff | number:'1.2-2' }}
                        </span>
                      </td>
                      <td>
                        <span class="badge rounded-pill px-3 py-2"
                              [ngClass]="diff.holidaysDiff > 0 ? 'bg-primary bg-opacity-10 text-primary' : (diff.holidaysDiff < 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.holidaysDiff > 0 ? 'bi-arrow-up' : (diff.holidaysDiff < 0 ? 'bi-arrow-down' : 'bi-dash')"></i>
                          {{ diff.holidaysDiff | number:'1.1-2' }} h
                        </span>
                      </td>
                      <td>
                        <span class="badge rounded-pill px-3 py-2"
                              [ngClass]="diff.exFestDiff > 0 ? 'bg-primary bg-opacity-10 text-primary' : (diff.exFestDiff < 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.exFestDiff > 0 ? 'bi-arrow-up' : (diff.exFestDiff < 0 ? 'bi-arrow-down' : 'bi-dash')"></i>
                          {{ diff.exFestDiff | number:'1.1-2' }} h
                        </span>
                      </td>
                      <td class="pe-4">
                        <span class="badge rounded-pill px-3 py-2"
                              [ngClass]="diff.rolDiff > 0 ? 'bg-info bg-opacity-10 text-info' : (diff.rolDiff < 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary')">
                          <i class="bi" [ngClass]="diff.rolDiff > 0 ? 'bi-arrow-up' : (diff.rolDiff < 0 ? 'bi-arrow-down' : 'bi-dash')"></i>
                          {{ diff.rolDiff | number:'1.1-2' }} h
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="py-5 text-center text-muted">Nessuna differenza corrispondente ai filtri.</td>
                    </tr>
                  }
                </tbody>
                <tfoot *ngIf="displayMomDifferences.length > 0" class="table-light fw-bold">
                  <tr>
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

    <!-- MODAL: CREA GRAFICO PERSONALIZZATO BUSTE PAGA -->
    <div class="modal fade" id="customPayslipChartModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 shadow-lg">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold text-primary">
              <i class="bi bi-magic me-2"></i> Crea Nuovo Grafico Cedolini
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-3">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label small fw-bold">Titolo Grafico *</label>
                <input type="text" class="form-control" placeholder="Es. Andamento Saldo Ferie Annuale" [(ngModel)]="newChartForm.title">
              </div>

              <div class="col-6">
                <label class="form-label small fw-bold">Tipo Grafico *</label>
                <select class="form-select" [(ngModel)]="newChartForm.chartType">
                  <option value="line">Lineare (Line)</option>
                  <option value="bar">A Barre (Bar)</option>
                  <option value="doughnut">A Ciambella (Doughnut)</option>
                  <option value="pie">A Torta (Pie)</option>
                </select>
              </div>

              <div class="col-6">
                <label class="form-label small fw-bold">Metrica Dati *</label>
                <select class="form-select" [(ngModel)]="newChartForm.metric">
                  <option value="netSalary">Stipendio Netto</option>
                  <option value="baseSalary">Paga Base</option>
                  <option value="inpsTaxable">Imponibile INPS</option>
                  <option value="irpefTaxable">Imponibile IRPEF</option>
                  <option value="totalCompetenze">Competenze Totali</option>
                  <option value="totalTrattenute">Trattenute Totali</option>
                  <option value="remainingHolidays">Saldo Ore Ferie</option>
                  <option value="remainingRol">Saldo Ore ROL</option>
                </select>
              </div>

              <div class="col-12">
                <label class="form-label small fw-bold">Colore Tema</label>
                <select class="form-select" [(ngModel)]="newChartForm.colorScheme">
                  <option value="blue">Blu Primario</option>
                  <option value="green">Verde Netto</option>
                  <option value="purple">Viola Accent</option>
                  <option value="amber">Ambra / ROL</option>
                  <option value="rose">Rosso Trattenute</option>
                  <option value="teal">Ciano</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer border-top-0 pt-0">
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-primary rounded-pill px-4" (click)="saveCustomChart()">
              Genera e Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChartsComponent implements OnInit {
  payslipService = inject(PayslipService);
  customChartService = inject(CustomChartService);
  private platformId = inject(PLATFORM_ID);
  
  isBrowser = false;
  payslips: Payslip[] = [];
  filteredPayslips: Payslip[] = [];
  selectedChart: 'salary' | 'holidays' | 'rol' | 'fonte' = 'salary';
  
  selectedYear: string | 'all' = 'all';
  availableYears: number[] = [];

  zoomRange: '3m' | '6m' | '12m' | 'all' = 'all';
  zoomSliceCount: number | null = null;

  showSeries = {
    net: true,
    gross: true,
    deductions: true,
    inps: false,
    irpef: false
  };

  mainChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  mainChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { 
      line: { tension: 0.3 }, 
      point: { radius: 2, hoverRadius: 6 } 
    },
    scales: {
      y: { ticks: { callback: (val) => `€ ${Number(val).toLocaleString('it-IT')}` } },
      x: { grid: { display: false } }
    },
    plugins: { 
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false }
    }
  };

  momDifferences: any[] = [];
  displayMomDifferences: any[] = [];

  // Table sorting & filters
  tableSearch = '';
  tableTypeFilter: 'all' | 'ordinaria' | '13ma' | '14ma' = 'all';
  sortField: 'period' | 'salary' | 'holidays' | 'exfest' | 'rol' = 'period';
  sortAsc = false;

  // Custom charts
  customCharts: CustomChartConfig[] = [];
  customChartModalInstance: any;
  newChartForm: any = {
    title: '',
    chartType: 'line',
    metric: 'netSalary',
    colorScheme: 'blue'
  };

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    this.payslipService.getPayslips().subscribe(data => {
      this.payslips = data || [];
      this.availableYears = [...new Set(this.payslips.map(p => p.year))].sort((a, b) => b - a);
      if (this.isBrowser) {
        this.loadCustomCharts();
      }
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
    
    this.calculateMomDifferences();
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

  updateChart() {
    if (!this.filteredPayslips || this.filteredPayslips.length === 0) {
      this.mainChartData = { labels: [], datasets: [] };
      return;
    }

    let dataset = [...this.filteredPayslips];
    if (this.zoomSliceCount && dataset.length > this.zoomSliceCount) {
      dataset = dataset.slice(dataset.length - this.zoomSliceCount);
    }

    const labels = dataset.map(p => `${this.payslipService.getMonthName(p.month, p.aggiuntiva)} ${p.year}`);
    const datasets: any[] = [];

    if (this.selectedChart === 'salary') {
      if (this.showSeries.net) {
        datasets.push({
          data: dataset.map(p => p.netSalary),
          label: 'Stipendio Netto (€)',
          borderColor: '#198754',
          backgroundColor: 'rgba(25, 135, 84, 0.1)',
          fill: true,
          borderWidth: 2.2
        });
      }
      if (this.showSeries.gross) {
        datasets.push({
          data: dataset.map(p => p.totaleCompetenze),
          label: 'Competenze Totali (€)',
          borderColor: '#0d6efd',
          backgroundColor: 'transparent',
          borderWidth: 2
        });
      }
      if (this.showSeries.deductions) {
        datasets.push({
          data: dataset.map(p => p.totaleTrattenute),
          label: 'Trattenute Totali (€)',
          borderColor: '#dc3545',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [4, 4]
        });
      }
      if (this.showSeries.inps) {
        datasets.push({
          data: dataset.map(p => p.inpsTaxable),
          label: 'Imponibile INPS (€)',
          borderColor: '#0dcaf0',
          backgroundColor: 'transparent',
          borderWidth: 1.5
        });
      }
      if (this.showSeries.irpef) {
        datasets.push({
          data: dataset.map(p => p.irpefTaxable),
          label: 'Imponibile IRPEF (€)',
          borderColor: '#ffc107',
          backgroundColor: 'transparent',
          borderWidth: 1.5
        });
      }
    } else if (this.selectedChart === 'fonte') {
      datasets.push(
        {
          data: dataset.map(p => p.fonteAzienda || 0),
          label: 'Contributo Ditta (€)',
          borderColor: '#198754',
          backgroundColor: 'rgba(25, 135, 84, 0.1)',
          fill: true
        },
        {
          data: dataset.map(p => p.fonteDipendente || 0),
          label: 'Contributo Dipendente (€)',
          borderColor: '#0d6efd',
          backgroundColor: 'transparent'
        }
      );
    } else if (this.selectedChart === 'holidays') {
      datasets.push({
        data: dataset.map(p => p.remainingHolidays),
        label: 'Saldo Ore Ferie',
        borderColor: '#ffc107',
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        fill: true
      });
    } else if (this.selectedChart === 'rol') {
      datasets.push(
        {
          data: dataset.map(p => p.remainingRol),
          label: 'Saldo ROL (ore)',
          borderColor: '#0dcaf0',
          backgroundColor: 'transparent'
        },
        {
          data: dataset.map(p => p.remainingExFest),
          label: 'Saldo Ex-Festività (ore)',
          borderColor: '#6f42c1',
          backgroundColor: 'transparent'
        }
      );
    }

    this.mainChartData = {
      labels: [...labels],
      datasets: [...datasets]
    };

    if (this.chart) {
      this.chart.update();
    }
  }

  // --- CUSTOM CHARTS BUILDER ---
  loadCustomCharts() {
    this.customCharts = this.customChartService.getCharts('payslips');
  }

  openCustomChartModal() {
    this.newChartForm = {
      title: '',
      chartType: 'line',
      metric: 'netSalary',
      colorScheme: 'blue'
    };
    if (!this.customChartModalInstance && typeof bootstrap !== 'undefined') {
      const el = document.getElementById('customPayslipChartModal');
      if (el) this.customChartModalInstance = new bootstrap.Modal(el);
    }
    this.customChartModalInstance?.show();
  }

  saveCustomChart() {
    if (!this.newChartForm.title.trim()) {
      alert('Inserisci un titolo per il grafico.');
      return;
    }

    this.customChartService.saveChart({
      title: this.newChartForm.title.trim(),
      sourceModule: 'payslips',
      chartType: this.newChartForm.chartType,
      metric: this.newChartForm.metric,
      colorScheme: this.newChartForm.colorScheme
    });

    this.customChartModalInstance?.hide();
    this.loadCustomCharts();
  }

  deleteCustomChart(id: string) {
    if (confirm('Vuoi eliminare questo grafico personalizzato?')) {
      this.customChartService.deleteChart(id);
      this.loadCustomCharts();
    }
  }

  getChartType(t: string): ChartType {
    return t as ChartType;
  }

  getCustomChartData(cfg: CustomChartConfig): any {
    const labels = this.filteredPayslips.map(p => `${this.payslipService.getMonthName(p.month, p.aggiuntiva)} ${p.year}`);
    let data: number[] = [];
    let bg = 'rgba(13, 110, 253, 0.7)';
    let border = '#0d6efd';

    if (cfg.colorScheme === 'green') { bg = 'rgba(25, 135, 84, 0.7)'; border = '#198754'; }
    else if (cfg.colorScheme === 'purple') { bg = 'rgba(111, 66, 193, 0.7)'; border = '#6f42c1'; }
    else if (cfg.colorScheme === 'amber') { bg = 'rgba(255, 193, 7, 0.7)'; border = '#ffc107'; }
    else if (cfg.colorScheme === 'rose') { bg = 'rgba(220, 53, 69, 0.7)'; border = '#dc3545'; }
    else if (cfg.colorScheme === 'teal') { bg = 'rgba(13, 202, 240, 0.7)'; border = '#0dcaf0'; }

    const prop = cfg.metric as keyof Payslip;
    data = this.filteredPayslips.map(p => Number(p[prop]) || 0);

    return {
      labels,
      datasets: [
        {
          data,
          label: cfg.title,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 2,
          fill: cfg.chartType === 'line'
        }
      ]
    };
  }

  // --- MOM DIFFERENCES COMPUTATION ---
  calculateMomDifferences() {
    this.momDifferences = [];
    for (let i = 1; i < this.filteredPayslips.length; i++) {
      const current = this.filteredPayslips[i];
      const prev = this.filteredPayslips[i - 1];

      this.momDifferences.push({
        payslip: current,
        salaryDiff: current.netSalary - prev.netSalary,
        holidaysDiff: current.remainingHolidays - prev.remainingHolidays,
        exFestDiff: current.remainingExFest - prev.remainingExFest,
        rolDiff: current.remainingRol - prev.remainingRol
      });
    }
    this.momDifferences.reverse();
  }

  applyTableFilters() {
    let list = [...this.momDifferences];

    if (this.tableTypeFilter !== 'all') {
      list = list.filter(item => {
        if (this.tableTypeFilter === '13ma') return item.payslip.aggiuntiva && item.payslip.month === 12;
        if (this.tableTypeFilter === '14ma') return item.payslip.aggiuntiva && item.payslip.month === 6;
        if (this.tableTypeFilter === 'ordinaria') return !item.payslip.aggiuntiva;
        return true;
      });
    }

    if (this.tableSearch.trim()) {
      const q = this.tableSearch.toLowerCase().trim();
      list = list.filter(item => {
        const monthName = this.payslipService.getMonthName(item.payslip.month, item.payslip.aggiuntiva).toLowerCase();
        const year = item.payslip.year.toString();
        return monthName.includes(q) || year.includes(q);
      });
    }

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (this.sortField) {
        case 'period':
          valA = a.payslip.year * 100 + a.payslip.month;
          valB = b.payslip.year * 100 + b.payslip.month;
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
      this.sortAsc = false;
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
}
