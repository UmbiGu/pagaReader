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
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in flex-wrap gap-2">
      <div>
        <h2 class="fw-bold mb-0 text-primary">Welcome back{{ employeeName ? ', ' + employeeName : '' }} 👋</h2>
        <p class="text-muted mb-0">Hai <strong>{{ payslipsCount }}</strong> cedolini archiviati e sincronizzati nel tuo vault.</p>
      </div>
      <div *ngIf="latestPayslip" class="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle fs-6 py-2 px-3 rounded-pill d-flex align-items-center">
        <i class="bi bi-calendar2-check me-2"></i> Ultimo cedolino: 
        <strong class="ms-1">{{ payslipService.getMonthName(latestPayslip.month, latestPayslip.aggiuntiva) }} {{ latestPayslip.year }}</strong>
      </div>
    </div>

    <!-- TOP KPI CARDS -->
    <div class="row mb-4">
      <!-- Latest Net Salary -->
      <div class="col-md-3 mb-3 animate-fade-in">
        <div class="card h-100 shadow-sm border-start border-4 border-success p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Ultimo Netto</h6>
                <h3 class="fw-bold mb-0 text-success">€ {{ latestNet | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-success bg-opacity-10 p-2 rounded-circle text-success">
                <i class="bi bi-wallet2 fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">
              {{ latestPayslip ? payslipService.getMonthName(latestPayslip.month, latestPayslip.aggiuntiva) + ' ' + latestPayslip.year : '' }}
            </small>
          </div>
        </div>
      </div>
      
      <!-- RAL -->
      <div class="col-md-3 mb-3 animate-fade-in delay-1">
        <div class="card h-100 shadow-sm border-start border-4 border-primary p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">RAL Stimata</h6>
                <h3 class="fw-bold mb-0 text-primary">€ {{ estimatedRal | number:'1.0-0' }}</h3>
              </div>
              <div class="bg-primary bg-opacity-10 p-2 rounded-circle text-primary">
                <i class="bi bi-briefcase fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.70rem;">*Fissi x 14 mensilità CCNL</small>
          </div>
        </div>
      </div>
      
      <!-- Holidays Balance -->
      <div class="col-md-3 mb-3 animate-fade-in delay-2">
        <div class="card h-100 shadow-sm border-start border-4 border-warning p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="d-flex align-items-center gap-1">
                  <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Saldo Ferie</h6>
                  <i class="bi bi-question-circle text-muted mb-2 cursor-pointer" 
                     title="CCNL Commercio Livello 4: 26 giorni/anno (173,33 ore/anno, ossia ~14,44 ore al mese)"></i>
                </div>
                <h3 class="fw-bold mb-0 text-warning">{{ latestHolidays | number:'1.1-2' }} <small class="fs-6">ore</small></h3>
              </div>
              <div class="bg-warning bg-opacity-10 p-2 rounded-circle text-warning">
                <i class="bi bi-sun fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">Disponibilità attuale</small>
          </div>
        </div>
      </div>

      <!-- ROL Balance -->
      <div class="col-md-3 mb-3 animate-fade-in delay-3">
        <div class="card h-100 shadow-sm border-start border-4 border-info p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="d-flex align-items-center gap-1">
                  <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Permessi & ROL</h6>
                  <i class="bi bi-question-circle text-muted mb-2 cursor-pointer" 
                     title="Ex-Festività: 32h/anno (4 giorni). R.O.L.: 72h/anno (>30 dip.) o 56h (fino a 30 dip.). Nei primi 2 anni di assunzione matura al 50%."></i>
                </div>
                <h3 class="fw-bold mb-0 text-info">{{ latestRolExFest | number:'1.1-2' }} <small class="fs-6">ore</small></h3>
              </div>
              <div class="bg-info bg-opacity-10 p-2 rounded-circle text-info">
                <i class="bi bi-clock-history fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">Ex-Fest: {{ latestExFest | number:'1.1-1' }}h | ROL: {{ latestRol | number:'1.1-1' }}h</small>
          </div>
        </div>
      </div>
    </div>

    <!-- SITUAZIONE DETTAGLIATA ALL'ULTIMO CEDOLINO -->
    <div *ngIf="latestPayslip" class="card shadow-sm border-0 mb-4 animate-fade-in delay-3">
      <div class="card-header bg-body-tertiary fw-bold py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div class="d-flex align-items-center flex-wrap gap-2">
          <i class="bi bi-file-earmark-person-fill text-primary fs-5"></i>
          <span>Situazione all'Ultimo Cedolino — <strong>{{ payslipService.getMonthName(latestPayslip.month, latestPayslip.aggiuntiva) }} {{ latestPayslip.year }}</strong></span>
          <span *ngIf="latestPayslip.aggiuntiva && latestPayslip.month === 12" class="badge bg-warning bg-opacity-10 text-warning border border-warning-subtle">13ª Mensilità</span>
          <span *ngIf="latestPayslip.aggiuntiva && latestPayslip.month === 6" class="badge bg-info bg-opacity-10 text-info border border-info-subtle">14ª Mensilità</span>
        </div>
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <span class="badge bg-body-secondary text-body border">
            {{ latestPayslip.azienda || 'CALZEDONIA S.P.A.' }}
          </span>
          <span class="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle"
                title="Inquadramento contrattuale da cedolino">
            {{ latestPayslip.qualifica || 'Impiegato' }} {{ latestPayslip.livello || 'Livello 4' }} ({{ latestPayslip.mansione || 'DEVELOPER' }})
          </span>
        </div>
      </div>
      <div class="card-body p-4">
        
        <!-- Contract & Profile Highlights Bar -->
        <div class="p-3 bg-body-secondary bg-opacity-25 rounded-3 border mb-4 d-flex flex-wrap gap-4 align-items-center small text-muted">
          <div><i class="bi bi-card-heading text-primary me-1"></i> Matricola: <strong class="text-body">{{ latestPayslip.matricola || '0267582' }}</strong></div>
          <div><i class="bi bi-briefcase text-primary me-1"></i> CCNL: <strong class="text-body">{{ latestPayslip.ccnl || 'CCNL Terziario (Confcommercio)' }}</strong> (CNEL {{ latestPayslip.cnel || 'H011' }})</div>
          <div><i class="bi bi-calendar-check text-success me-1"></i> Assunzione: <strong class="text-body">{{ latestPayslip.dataAssunzione || '04-04-2024' }}</strong></div>
          <div><i class="bi bi-hourglass-split text-warning me-1"></i> Prossimo Scatto: <strong class="text-body">{{ latestPayslip.scattiAnzianita || '5-2027' }}</strong></div>
        </div>

        <div class="row g-4">
          <!-- Retribuzione & Competenze -->
          <div class="col-lg-4 col-md-6 border-end-md">
            <h6 class="fw-bold text-uppercase text-muted small letter-spacing-1 mb-3">
              <i class="bi bi-cash-coin text-success me-1"></i> Retribuzione del Mese
            </h6>
            <ul class="list-group list-group-flush small">
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2">
                <span class="text-muted">Totale Competenze (Lordo):</span>
                <strong class="text-primary">€ {{ latestPayslip.totaleCompetenze | number:'1.2-2' }}</strong>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2">
                <span class="text-muted">Totale Trattenute Fiscali/Prev.:</span>
                <strong class="text-danger">€ {{ latestPayslip.totaleTrattenute | number:'1.2-2' }}</strong>
              </li>
              <li class="list-group-item bg-success bg-opacity-10 d-flex justify-content-between px-2 py-2 rounded mt-1 border-0">
                <span class="fw-bold text-success">Netto in Busta:</span>
                <strong class="text-success fs-6">€ {{ latestPayslip.netSalary | number:'1.2-2' }}</strong>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2">
                <span class="text-muted">Imponibile IRPEF Mese:</span>
                <span>€ {{ latestPayslip.irpefTaxable | number:'1.2-2' }}</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2">
                <span class="text-muted">Imponibile INPS Mese:</span>
                <span>€ {{ latestPayslip.inpsTaxable | number:'1.2-2' }}</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2" *ngIf="latestPayslip.tfrMese">
                <span class="text-muted">Quota TFR del Mese:</span>
                <span class="text-info fw-bold">€ {{ latestPayslip.tfrMese | number:'1.2-2' }}</span>
              </li>
            </ul>
          </div>

          <!-- Elementi Fissi di Paga & Progressivi -->
          <div class="col-lg-4 col-md-6 border-end-lg">
            <h6 class="fw-bold text-uppercase text-muted small letter-spacing-1 mb-3">
              <i class="bi bi-layers text-primary me-1"></i> Basi Contrattuali & Progressivi
            </h6>
            <ul class="list-group list-group-flush small">
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2">
                <span class="text-muted">Paga Base:</span>
                <span>€ {{ latestPayslip.baseSalary | number:'1.2-2' }}</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2">
                <span class="text-muted">Contingenza:</span>
                <span>€ {{ latestPayslip.contingency | number:'1.2-2' }}</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2">
                <span class="text-muted">Superminimo Assorbibile:</span>
                <span class="text-primary fw-medium">€ {{ latestPayslip.superminimo | number:'1.2-2' }}</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2">
                <span class="text-muted">3° Elemento & E.D.R.:</span>
                <span>€ {{ (latestPayslip.terzoElemento + latestPayslip.edr) | number:'1.2-2' }}</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2" *ngIf="latestPayslip.imponibileInpsProgressivo">
                <span class="text-muted">Progressivo INPS Annuo:</span>
                <span class="fw-bold">€ {{ latestPayslip.imponibileInpsProgressivo | number:'1.2-2' }}</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2" *ngIf="latestPayslip.imponibileIrpefProgressivo">
                <span class="text-muted">Progressivo IRPEF Annuo:</span>
                <span class="fw-bold">€ {{ latestPayslip.imponibileIrpefProgressivo | number:'1.2-2' }}</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between px-0 py-2" *ngIf="latestPayslip.fonteDipendente || latestPayslip.fonteAzienda">
                <span class="text-muted">Fondo Pensione FONTE (Dip/Ditta):</span>
                <span class="text-info fw-bold">€ {{ latestPayslip.fonteDipendente | number:'1.2-2' }} / € {{ latestPayslip.fonteAzienda | number:'1.2-2' }}</span>
              </li>
            </ul>
          </div>

          <!-- Saldi Orari Ferie, Permessi e ROL -->
          <div class="col-lg-4 col-md-12">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold text-uppercase text-muted small letter-spacing-1 mb-0">
                <i class="bi bi-calendar-range text-warning me-1"></i> Ferie & Permessi (CCNL Liv. 4)
              </h6>
              <i class="bi bi-info-circle text-muted cursor-pointer" 
                 title="Maturazione CCNL Commercio: Ferie 26 gg/anno (~14,44 h/mese); Ex-Festività 32 h/anno; R.O.L. 72 h/anno (>30 dip.)"></i>
            </div>
            
            <div class="table-responsive">
              <table class="table table-modern table-sm table-hover text-center align-middle mb-0" style="font-size: 0.82rem;">
                <thead class="table-light text-muted">
                  <tr>
                    <th class="text-start">Tipo</th>
                    <th>Res. AP</th>
                    <th>Matur.</th>
                    <th>Godute</th>
                    <th class="text-success fw-bold">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-start fw-bold">
                      Ferie 
                      <i class="bi bi-question-circle text-muted ms-1" style="font-size: 0.75rem;" 
                         title="Ferie contrattuali: 26 giorni lavorativi (173,33 ore all'anno, ~14,44 ore al mese)"></i>
                    </td>
                    <td>{{ latestPayslip.ferieResidueAP | number:'1.1-1' }}</td>
                    <td>{{ latestPayslip.ferieMaturate | number:'1.1-1' }}</td>
                    <td>{{ latestPayslip.ferieGodute | number:'1.1-1' }}</td>
                    <td class="fw-bold text-warning">{{ latestPayslip.remainingHolidays | number:'1.1-1' }}h</td>
                  </tr>
                  <tr>
                    <td class="text-start fw-bold">
                      Ex-Fest.
                      <i class="bi bi-question-circle text-muted ms-1" style="font-size: 0.75rem;" 
                         title="Permessi festività soppresse: 4 giorni all'anno (32 ore/anno, ~2,66 ore al mese)"></i>
                    </td>
                    <td>{{ latestPayslip.exFestResidueAP | number:'1.1-1' }}</td>
                    <td>{{ latestPayslip.exFestMaturate | number:'1.1-1' }}</td>
                    <td>{{ latestPayslip.exFestGodute | number:'1.1-1' }}</td>
                    <td class="fw-bold text-info">{{ latestPayslip.remainingExFest | number:'1.1-1' }}h</td>
                  </tr>
                  <tr>
                    <td class="text-start fw-bold">
                      R.O.L.
                      <i class="bi bi-question-circle text-muted ms-1" style="font-size: 0.75rem;" 
                         title="Riduzione Orario di Lavoro: 72 ore all'anno in aziende con >30 dipendenti (56h se <=30). Primi 2 anni matura al 50%."></i>
                    </td>
                    <td>{{ latestPayslip.rolResiduoAP | number:'1.1-1' }}</td>
                    <td>{{ latestPayslip.rolMaturate | number:'1.1-1' }}</td>
                    <td>{{ latestPayslip.rolGodute | number:'1.1-1' }}</td>
                    <td class="fw-bold text-info">{{ latestPayslip.remainingRol | number:'1.1-1' }}h</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-3 p-2 bg-body-secondary bg-opacity-25 rounded-3 d-flex justify-content-between align-items-center">
              <span class="small text-muted">Totale Ore Disponibili:</span>
              <strong class="text-primary fs-6">
                {{ (latestPayslip.remainingHolidays + latestPayslip.remainingExFest + latestPayslip.remainingRol) | number:'1.1-1' }} ore
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TIME SERIES CHARTS (SALARIO & ANDAMENTO FERIE/ROL CON 4 METRICHE) -->
    <div class="row mb-5 animate-fade-in delay-4">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-body-tertiary fw-bold py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div class="d-flex align-items-center">
              <i class="bi bi-graph-up text-primary me-2"></i>
              <span *ngIf="activeTab === 'salary'">Andamento Netto Mensile (Ultimi Mesi)</span>
              <span *ngIf="activeTab === 'ferie'">Andamento Ferie: Residuo AP, Maturato, Goduto e Saldo</span>
              <span *ngIf="activeTab === 'exfest'">Andamento Permessi Ex-Festività: Residuo AP, Maturato, Goduto e Saldo</span>
              <span *ngIf="activeTab === 'rol'">Andamento R.O.L.: Residuo AP, Maturato, Goduto e Saldo</span>
            </div>
            
            <!-- Tab Selector with theme-friendly classes -->
            <div class="btn-group btn-group-sm" role="group">
              <button type="button" class="btn" [ngClass]="activeTab === 'salary' ? 'btn-primary' : 'btn-outline-primary bg-body'" (click)="setTab('salary')">
                <i class="bi bi-wallet2 me-1"></i> Netto (€)
              </button>
              <button type="button" class="btn" [ngClass]="activeTab === 'ferie' ? 'btn-warning' : 'btn-outline-warning bg-body'" (click)="setTab('ferie')">
                <i class="bi bi-sun me-1"></i> Ferie
              </button>
              <button type="button" class="btn" [ngClass]="activeTab === 'exfest' ? 'btn-info' : 'btn-outline-info bg-body'" (click)="setTab('exfest')">
                <i class="bi bi-calendar-event me-1"></i> Ex-Festività
              </button>
              <button type="button" class="btn" [ngClass]="activeTab === 'rol' ? 'btn-secondary' : 'btn-outline-secondary bg-body'" (click)="setTab('rol')">
                <i class="bi bi-clock-history me-1"></i> R.O.L.
              </button>
            </div>
          </div>
          
          <div class="card-body">
            <div style="display: block; height: 350px;">
              <canvas *ngIf="isBrowser" baseChart
                [data]="activeChartData"
                [options]="activeChartOptions"
                [type]="'line'">
              </canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
  payslipService = inject(PayslipService);
  private platformId = inject(PLATFORM_ID);
  
  isBrowser = false;
  
  employeeName = '';
  payslipsCount = 0;
  latestNet = 0;
  totalNet = 0;
  estimatedRal = 0;
  latestHolidays = 0;
  latestExFest = 0;
  latestRol = 0;
  latestRolExFest = 0;

  latestPayslip: Payslip | null = null;
  payslips: Payslip[] = [];

  activeTab: 'salary' | 'ferie' | 'exfest' | 'rol' = 'salary';

  activeChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  activeChartOptions: ChartConfiguration<'line'>['options'] = {
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
      y: { 
        grid: { color: 'rgba(125, 125, 125, 0.15)' },
        ticks: { color: 'rgba(150, 150, 150, 0.9)' }
      },
      x: { 
        grid: { display: false },
        ticks: { color: 'rgba(150, 150, 150, 0.9)' }
      }
    },
    plugins: { 
      legend: { 
        position: 'top',
        labels: { color: 'rgba(180, 180, 180, 0.95)' }
      },
      tooltip: { mode: 'index', intersect: false }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    this.payslipService.getPayslips().subscribe(data => {
      this.payslips = data || [];
      this.calculateMetrics(this.payslips);
      if (this.isBrowser) {
        this.buildChart();
      }
    });
  }

  setTab(tab: 'salary' | 'ferie' | 'exfest' | 'rol') {
    this.activeTab = tab;
    this.buildChart();
  }

  private calculateMetrics(data: Payslip[]) {
    this.payslipsCount = data.length;
    if (data.length > 0) {
      const latest = data[data.length - 1];
      this.latestPayslip = latest;
      
      if (latest.employeeName) {
         let parts = latest.employeeName.split(' ');
         this.employeeName = parts.length > 1 ? parts[1] : parts[0];
         this.employeeName = this.employeeName.charAt(0).toUpperCase() + this.employeeName.slice(1).toLowerCase();
      }

      this.latestNet = latest.netSalary;
      this.totalNet = data.reduce((acc, curr) => acc + curr.netSalary, 0);
      
      this.latestHolidays = latest.remainingHolidays;
      this.latestExFest = latest.remainingExFest;
      this.latestRol = latest.remainingRol;
      this.latestRolExFest = latest.remainingRol + latest.remainingExFest;
      
      const grossFixed = latest.baseSalary + latest.contingency + latest.superminimo + latest.terzoElemento + latest.straordinarioForfetizzato + latest.edr;
      this.estimatedRal = grossFixed * 14; 
    } else {
      this.latestPayslip = null;
      this.latestNet = 0;
      this.totalNet = 0;
      this.estimatedRal = 0;
      this.latestHolidays = 0;
      this.latestExFest = 0;
      this.latestRol = 0;
      this.latestRolExFest = 0;
    }
  }

  private buildChart() {
    if (!this.payslips || this.payslips.length === 0) return;

    // Use full history or last 12 months for readable trends
    const dataset = this.payslips.length > 12 ? this.payslips.slice(-12) : this.payslips;
    const labels = dataset.map(p => `${this.payslipService.getMonthName(p.month, p.aggiuntiva)} ${p.year}`);

    if (this.activeTab === 'salary') {
      this.activeChartData = {
        labels: [...labels],
        datasets: [
          {
            data: dataset.map(p => p.netSalary),
            label: 'Net Salary (€)',
            borderColor: 'rgba(25, 135, 84, 1)',
            backgroundColor: 'rgba(25, 135, 84, 0.15)',
            fill: true,
            pointBackgroundColor: 'rgba(25, 135, 84, 1)',
            pointHoverBackgroundColor: 'rgba(25, 135, 84, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 2
          },
          {
            data: dataset.map(p => p.totaleCompetenze),
            label: 'Lordo Competenze (€)',
            borderColor: 'rgba(13, 110, 253, 0.8)',
            backgroundColor: 'transparent',
            borderDash: [4, 4],
            fill: false,
            pointBackgroundColor: 'rgba(13, 110, 253, 1)',
            pointHoverBackgroundColor: 'rgba(13, 110, 253, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          }
        ]
      };
    } else if (this.activeTab === 'ferie') {
      this.activeChartData = {
        labels: [...labels],
        datasets: [
          {
            data: dataset.map(p => p.remainingHolidays),
            label: 'Saldo Finale (Ore)',
            borderColor: 'rgba(255, 193, 7, 1)',
            backgroundColor: 'rgba(255, 193, 7, 0.2)',
            fill: true,
            pointBackgroundColor: 'rgba(255, 193, 7, 1)',
            pointHoverBackgroundColor: 'rgba(255, 193, 7, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 2.5
          },
          {
            data: dataset.map(p => p.ferieMaturate),
            label: 'Maturate (Ore)',
            borderColor: 'rgba(13, 110, 253, 1)',
            backgroundColor: 'transparent',
            fill: false,
            pointBackgroundColor: 'rgba(13, 110, 253, 1)',
            pointHoverBackgroundColor: 'rgba(13, 110, 253, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          },
          {
            data: dataset.map(p => p.ferieGodute),
            label: 'Godute (Ore)',
            borderColor: 'rgba(220, 53, 69, 1)',
            backgroundColor: 'transparent',
            fill: false,
            pointBackgroundColor: 'rgba(220, 53, 69, 1)',
            pointHoverBackgroundColor: 'rgba(220, 53, 69, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          },
          {
            data: dataset.map(p => p.ferieResidueAP),
            label: 'Residuo AP (Ore)',
            borderColor: 'rgba(108, 117, 125, 1)',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            fill: false,
            pointBackgroundColor: 'rgba(108, 117, 125, 1)',
            pointHoverBackgroundColor: 'rgba(108, 117, 125, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          }
        ]
      };
    } else if (this.activeTab === 'exfest') {
      this.activeChartData = {
        labels: [...labels],
        datasets: [
          {
            data: dataset.map(p => p.remainingExFest),
            label: 'Saldo Ex-Fest. (Ore)',
            borderColor: 'rgba(13, 202, 240, 1)',
            backgroundColor: 'rgba(13, 202, 240, 0.2)',
            fill: true,
            pointBackgroundColor: 'rgba(13, 202, 240, 1)',
            pointHoverBackgroundColor: 'rgba(13, 202, 240, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 2.5
          },
          {
            data: dataset.map(p => p.exFestMaturate),
            label: 'Maturate (Ore)',
            borderColor: 'rgba(13, 110, 253, 1)',
            backgroundColor: 'transparent',
            fill: false,
            pointBackgroundColor: 'rgba(13, 110, 253, 1)',
            pointHoverBackgroundColor: 'rgba(13, 110, 253, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          },
          {
            data: dataset.map(p => p.exFestGodute),
            label: 'Godute (Ore)',
            borderColor: 'rgba(220, 53, 69, 1)',
            backgroundColor: 'transparent',
            fill: false,
            pointBackgroundColor: 'rgba(220, 53, 69, 1)',
            pointHoverBackgroundColor: 'rgba(220, 53, 69, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          },
          {
            data: dataset.map(p => p.exFestResidueAP),
            label: 'Residuo AP (Ore)',
            borderColor: 'rgba(108, 117, 125, 1)',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            fill: false,
            pointBackgroundColor: 'rgba(108, 117, 125, 1)',
            pointHoverBackgroundColor: 'rgba(108, 117, 125, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          }
        ]
      };
    } else if (this.activeTab === 'rol') {
      this.activeChartData = {
        labels: [...labels],
        datasets: [
          {
            data: dataset.map(p => p.remainingRol),
            label: 'Saldo R.O.L. (Ore)',
            borderColor: 'rgba(111, 66, 193, 1)',
            backgroundColor: 'rgba(111, 66, 193, 0.2)',
            fill: true,
            pointBackgroundColor: 'rgba(111, 66, 193, 1)',
            pointHoverBackgroundColor: 'rgba(111, 66, 193, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 2.5
          },
          {
            data: dataset.map(p => p.rolMaturate),
            label: 'Maturate (Ore)',
            borderColor: 'rgba(13, 110, 253, 1)',
            backgroundColor: 'transparent',
            fill: false,
            pointBackgroundColor: 'rgba(13, 110, 253, 1)',
            pointHoverBackgroundColor: 'rgba(13, 110, 253, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          },
          {
            data: dataset.map(p => p.rolGodute),
            label: 'Godute (Ore)',
            borderColor: 'rgba(220, 53, 69, 1)',
            backgroundColor: 'transparent',
            fill: false,
            pointBackgroundColor: 'rgba(220, 53, 69, 1)',
            pointHoverBackgroundColor: 'rgba(220, 53, 69, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          },
          {
            data: dataset.map(p => p.rolResiduoAP),
            label: 'Residuo AP (Ore)',
            borderColor: 'rgba(108, 117, 125, 1)',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            fill: false,
            pointBackgroundColor: 'rgba(108, 117, 125, 1)',
            pointHoverBackgroundColor: 'rgba(108, 117, 125, 1)',
            pointHoverBorderColor: '#ffffff',
            borderWidth: 1.5
          }
        ]
      };
    }
  }
}
