import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { InvestimentiService } from '../../services/investimenti/investimenti.service';
import { PatrimonioGiornaliero, PortafoglioMovimento } from '../../models/investimenti/investimenti.model';

@Component({
  selector: 'app-investimenti',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in">
      <div>
        <h2 class="fw-bold mb-0 text-primary"><i class="bi bi-graph-up-arrow me-2"></i> InvestimentiReader</h2>
        <p class="text-muted mb-0">Monitor your Directa portfolio and cash flows.</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-danger rounded-pill shadow-sm px-4" (click)="deleteAllData()" [disabled]="patrimoni.length === 0 || isUploading">
          <i class="bi bi-trash-fill me-2"></i> Clear Data
        </button>
        <div>
          <input type="file" id="excelUpload" accept=".xlsx, .xls" class="d-none" (change)="onFileSelected($event)">
          <label for="excelUpload" class="btn btn-primary rounded-pill shadow-sm px-4 m-0">
            <i class="bi bi-file-earmark-excel me-2"></i>
            <span *ngIf="!isUploading">Sync Directa Excel</span>
            <span *ngIf="isUploading">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Syncing...
            </span>
          </label>
        </div>
      </div>
    </div>
    
    <div *ngIf="uploadMsg" class="alert alert-info shadow-sm mb-4 animate-fade-in">
      {{ uploadMsg }}
    </div>

    <div class="row mb-4">
      <div class="col-md-4 mb-3 animate-fade-in">
        <div class="card h-100 shadow-sm border-start border-4 border-success p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Current Net Worth</h6>
                <h3 class="fw-bold mb-0 text-success">€ {{ latestPatrimonio | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-success bg-opacity-10 p-2 rounded-circle text-success">
                <i class="bi bi-piggy-bank fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3 animate-fade-in delay-1">
        <div class="card h-100 shadow-sm border-start border-4 border-primary p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Invested Portfolio</h6>
                <h3 class="fw-bold mb-0 text-primary">€ {{ latestPortafoglio | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-primary bg-opacity-10 p-2 rounded-circle text-primary">
                <i class="bi bi-pie-chart fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3 animate-fade-in delay-2">
        <div class="card h-100 shadow-sm border-start border-4 border-info p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Available Liquidity</h6>
                <h3 class="fw-bold mb-0 text-info">€ {{ latestLiquidita | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-info bg-opacity-10 p-2 rounded-circle text-info">
                <i class="bi bi-cash-coin fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CHART AREA -->
    <div class="row animate-fade-in delay-3 mb-5">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-body-tertiary fw-bold py-3 border-bottom-0">
            <i class="bi bi-graph-up text-primary me-2"></i> Net Worth Evolution (Patrimonio vs Portafoglio vs Liquidità)
          </div>
          <div class="card-body">
            <div style="display: block; height: 400px;">
              <canvas *ngIf="isBrowser" baseChart
                [data]="patrimonioChartData"
                [options]="chartOptions"
                [type]="'line'">
              </canvas>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DATA TABLES TABS -->
    <div class="card shadow-sm border-0 animate-fade-in delay-4">
      <div class="card-header bg-body-tertiary p-0 border-bottom-0">
        <ul class="nav nav-tabs" id="myTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active fw-bold py-3 px-4" id="patrimonio-tab" data-bs-toggle="tab" data-bs-target="#patrimonio-pane" type="button" role="tab">Patrimonio Storico</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link fw-bold py-3 px-4 text-muted" id="movimenti-tab" data-bs-toggle="tab" data-bs-target="#movimenti-pane" type="button" role="tab">Movimenti Portafoglio</button>
          </li>
        </ul>
      </div>
      <div class="card-body p-0">
        <div class="tab-content" id="myTabContent">
          
          <!-- Patrimonio Tab -->
          <div class="tab-pane fade show active" id="patrimonio-pane" role="tabpanel" tabindex="0">
            <div class="table-responsive" style="max-height: 500px;">
              <table class="table table-hover table-striped mb-0 align-middle text-center">
                <thead class="table-light text-secondary sticky-top">
                  <tr>
                    <th class="text-start ps-4">Data</th>
                    <th>Liquidità</th>
                    <th>Finanziamento Long</th>
                    <th>Garanzia Short</th>
                    <th>Portafoglio</th>
                    <th class="pe-4 text-success">Patrimonio</th>
                  </tr>
                </thead>
                <tbody>
                  @for (pat of patrimoniReverse; track pat.id) {
                    <tr>
                      <td class="text-start fw-bold ps-4">{{ formatDate(pat.dataValuta) }}</td>
                      <td>€ {{ pat.liquidita | number:'1.2-2' }}</td>
                      <td>€ {{ pat.finanziamentoLong | number:'1.2-2' }}</td>
                      <td>€ {{ pat.garanziaShort | number:'1.2-2' }}</td>
                      <td class="text-primary fw-medium">€ {{ pat.portafoglio | number:'1.2-2' }}</td>
                      <td class="pe-4 text-success fw-bold">€ {{ pat.patrimonio | number:'1.2-2' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="py-5 text-muted">No data available. Please sync your Directa Excel file.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Movimenti Tab -->
          <div class="tab-pane fade" id="movimenti-pane" role="tabpanel" tabindex="0">
            <div class="table-responsive" style="max-height: 500px;">
              <table class="table table-hover table-striped mb-0 align-middle">
                <thead class="table-light text-secondary sticky-top">
                  <tr>
                    <th class="ps-4">Data</th>
                    <th>Descrizione Movimento</th>
                    <th>Titolo (Isin - Ticker)</th>
                    <th class="pe-4 text-end">Valore</th>
                  </tr>
                </thead>
                <tbody>
                  @for (mov of movimentiReverse; track mov.id) {
                    <tr>
                      <td class="fw-bold ps-4">{{ formatDate(mov.dataValuta) }}</td>
                      <td>{{ mov.descrizione }}</td>
                      <td class="text-muted small">
                        <span *ngIf="mov.descrizioneTitolo">{{ mov.descrizioneTitolo }}</span>
                        <span *ngIf="mov.isin || mov.ticker"> <br>({{ mov.isin }} / {{ mov.ticker }})</span>
                      </td>
                      <td class="pe-4 text-end fw-bold" [ngClass]="mov.valore > 0 ? 'text-success' : 'text-danger'">
                        {{ mov.valore > 0 ? '+' : '' }}€ {{ mov.valore | number:'1.2-2' }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="py-5 text-center text-muted">No data available.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `
})
export class InvestimentiComponent implements OnInit {
  private investimentiService = inject(InvestimentiService);
  private platformId = inject(PLATFORM_ID);
  
  isBrowser = false;
  isUploading = false;
  uploadMsg = '';

  patrimoni: PatrimonioGiornaliero[] = [];
  movimenti: PortafoglioMovimento[] = [];
  
  patrimoniReverse: PatrimonioGiornaliero[] = [];
  movimentiReverse: PortafoglioMovimento[] = [];

  latestPatrimonio = 0;
  latestPortafoglio = 0;
  latestLiquidita = 0;

  patrimonioChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { line: { tension: 0.4 }, point: { radius: 0, hitRadius: 10 } },
    scales: {
      y: { grid: { color: 'rgba(150, 150, 150, 0.1)' } },
      x: { grid: { display: false } }
    },
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.fetchData();
    }
  }

  fetchData() {
    this.investimentiService.getPatrimonio().subscribe(data => {
      this.patrimoni = data;
      this.patrimoniReverse = [...data].reverse();
      this.updateMetrics();
      this.buildChart();
    });

    this.investimentiService.getMovimenti().subscribe(data => {
      this.movimenti = data;
      this.movimentiReverse = [...data].reverse();
    });
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files.length === 0) return;

    this.isUploading = true;
    this.uploadMsg = '';
    
    this.investimentiService.uploadExcel(files[0]).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.uploadMsg = res.message || 'Excel synced successfully!';
        this.fetchData();
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadMsg = err.error || 'Error uploading file.';
      }
    });
  }

  deleteAllData() {
    if (confirm('WARNING: Are you sure you want to delete all your investment data?')) {
      this.investimentiService.deleteAll().subscribe(() => {
        this.fetchData();
        this.uploadMsg = 'Data cleared.';
      });
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('it-IT'); // DD/MM/YYYY
  }

  private updateMetrics() {
    if (this.patrimoni.length > 0) {
      const latest = this.patrimoni[this.patrimoni.length - 1];
      this.latestPatrimonio = latest.patrimonio;
      this.latestPortafoglio = latest.portafoglio;
      this.latestLiquidita = latest.liquidita;
    } else {
      this.latestPatrimonio = 0;
      this.latestPortafoglio = 0;
      this.latestLiquidita = 0;
    }
  }

  private buildChart() {
    if (!this.patrimoni || this.patrimoni.length === 0) return;

    const labels = this.patrimoni.map(p => this.formatDate(p.dataValuta));
    
    const datasets = [
      {
        data: this.patrimoni.map(p => p.patrimonio),
        label: 'Patrimonio Totale (€)',
        borderColor: 'rgba(25, 135, 84, 1)',
        backgroundColor: 'rgba(25, 135, 84, 0.1)',
        borderWidth: 2,
        fill: true
      },
      {
        data: this.patrimoni.map(p => p.portafoglio),
        label: 'Portafoglio Titoli (€)',
        borderColor: 'rgba(13, 110, 253, 1)',
        backgroundColor: 'rgba(13, 110, 253, 0.05)',
        borderWidth: 2,
        fill: true
      },
      {
        data: this.patrimoni.map(p => p.liquidita),
        label: 'Liquidità (€)',
        borderColor: 'rgba(13, 202, 240, 1)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false
      }
    ];

    this.patrimonioChartData = {
      labels: [...labels],
      datasets: [...datasets]
    };
  }
}
