import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { InvestimentiService } from '../../services/investimenti/investimenti.service';
import { PatrimonioGiornaliero, PortafoglioMovimento } from '../../models/investimenti/investimenti.model';

@Component({
  selector: 'app-investimenti',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in flex-wrap gap-2">
      <div>
        <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
          <h2 class="fw-bold mb-0 text-primary"><i class="bi bi-graph-up-arrow me-2"></i> InvestimentiReader</h2>
          <span *ngIf="latestDataValuta" class="badge bg-success bg-opacity-10 text-success border border-success-subtle fs-6 py-2 px-3 rounded-pill d-inline-flex align-items-center">
            <i class="bi bi-calendar2-check me-2"></i> Situazione al: <strong class="ms-1">{{ formatDate(latestDataValuta) }}</strong>
          </span>
        </div>
        <p class="text-muted mb-0">Monitoraggio portafoglio Directa, flussi di liquidità e rendimenti.</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-danger rounded-pill shadow-sm px-4" (click)="deleteAllData()" [disabled]="patrimoni.length === 0 || isUploading">
          <i class="bi bi-trash-fill me-2"></i> Clear Data
        </button>
        <div>
          <input type="file" id="excelUpload" accept=".xlsx, .xls" class="d-none" (change)="onFileSelected($event)">
          <label for="excelUpload" class="btn btn-primary rounded-pill shadow-sm px-4 m-0" style="cursor: pointer;">
            <i class="bi bi-file-earmark-excel me-2"></i>
            <span *ngIf="!isUploading">Sync Directa Excel</span>
            <span *ngIf="isUploading">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Syncing...
            </span>
          </label>
        </div>
      </div>
    </div>
    
    <div *ngIf="uploadMsg" class="alert shadow-sm mb-4 animate-fade-in d-flex align-items-center justify-content-between"
         [ngClass]="uploadError ? 'alert-danger' : 'alert-success'">
      <div class="d-flex align-items-center">
        <i class="bi me-2 fs-5" [ngClass]="uploadError ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'"></i>
        <span>{{ uploadMsg }}</span>
      </div>
      <button type="button" class="btn-close ms-3" (click)="uploadMsg = ''" aria-label="Close"></button>
    </div>

    <!-- METRICS CARDS -->
    <div class="row mb-4">
      <div class="col-md-4 mb-3 animate-fade-in">
        <div class="card h-100 shadow-sm border-start border-4 border-success p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Patrimonio Totale</h6>
                <h3 class="fw-bold mb-0 text-success">€ {{ latestPatrimonio | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-success bg-opacity-10 p-2 rounded-circle text-success">
                <i class="bi bi-piggy-bank fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">
              {{ latestDataValuta ? 'Rilevato il ' + formatDate(latestDataValuta) : '' }}
            </small>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3 animate-fade-in delay-1">
        <div class="card h-100 shadow-sm border-start border-4 border-primary p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Portafoglio Titoli</h6>
                <h3 class="fw-bold mb-0 text-primary">€ {{ latestPortafoglio | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-primary bg-opacity-10 p-2 rounded-circle text-primary">
                <i class="bi bi-pie-chart fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">Controvalore strumenti</small>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3 animate-fade-in delay-2">
        <div class="card h-100 shadow-sm border-start border-4 border-info p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Liquidità Disponibile</h6>
                <h3 class="fw-bold mb-0 text-info">€ {{ latestLiquidita | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-info bg-opacity-10 p-2 rounded-circle text-info">
                <i class="bi bi-cash-coin fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">Saldo conto trading</small>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CHART AREA -->
    <div class="row animate-fade-in delay-3 mb-5">
      <div class="col-12">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-body-tertiary fw-bold py-3 border-bottom-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <i class="bi bi-graph-up text-primary me-2"></i> Evoluzione Patrimonio nel Tempo
            </div>
            <div class="btn-group btn-group-sm" role="group">
              <button type="button" class="btn btn-outline-secondary" [class.active]="chartWindow === '3m'" (click)="setChartWindow('3m')">3M</button>
              <button type="button" class="btn btn-outline-secondary" [class.active]="chartWindow === '6m'" (click)="setChartWindow('6m')">6M</button>
              <button type="button" class="btn btn-outline-secondary" [class.active]="chartWindow === '1y'" (click)="setChartWindow('1y')">1A</button>
              <button type="button" class="btn btn-outline-secondary" [class.active]="chartWindow === 'all'" (click)="setChartWindow('all')">Tutto</button>
            </div>
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
    <div class="card shadow-sm border-0 animate-fade-in delay-4 mb-5">
      <div class="card-header bg-body-tertiary p-0 border-bottom-0">
        <ul class="nav nav-tabs" id="myTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active fw-bold py-3 px-4" id="patrimonio-tab" data-bs-toggle="tab" data-bs-target="#patrimonio-pane" type="button" role="tab">
              <i class="bi bi-clock-history me-1"></i> Patrimonio Storico ({{ patrimoni.length }})
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link fw-bold py-3 px-4 text-muted" id="movimenti-tab" data-bs-toggle="tab" data-bs-target="#movimenti-pane" type="button" role="tab">
              <i class="bi bi-arrow-left-right me-1"></i> Movimenti Portafoglio ({{ movimenti.length }})
            </button>
          </li>
        </ul>
      </div>
      <div class="card-body p-0">
        <div class="tab-content" id="myTabContent">
          
          <!-- Patrimonio Tab -->
          <div class="tab-pane fade show active" id="patrimonio-pane" role="tabpanel" tabindex="0">
            <div class="table-responsive" style="max-height: 520px;">
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
                      <td colspan="6" class="py-5 text-muted">Nessun dato di patrimonio disponibile. Esegui il sync del file Excel Directa.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Movimenti Tab WITH CATEGORY FILTER, SEARCH, SORTING & TOTALE FINALE -->
          <div class="tab-pane fade" id="movimenti-pane" role="tabpanel" tabindex="0">
            
            <!-- Filters Bar for Movimenti -->
            <div class="p-3 bg-body-secondary bg-opacity-25 border-bottom d-flex gap-3 align-items-center flex-wrap">
              <!-- Search Input -->
              <div class="input-group input-group-sm" style="max-width: 280px;">
                <span class="input-group-text bg-body border-end-0"><i class="bi bi-search text-muted"></i></span>
                <input type="text" class="form-control border-start-0" placeholder="Cerca descrizione, titolo, ticker, isin..." [(ngModel)]="movSearch" (input)="applyMovFilters()">
              </div>

              <!-- Category Filter Dropdown -->
              <div class="d-flex align-items-center gap-2">
                <label class="text-muted small fw-bold">Categoria:</label>
                <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="movCategory" (change)="applyMovFilters()">
                  <option value="all">Tutte le Operazioni ({{ movimenti.length }})</option>
                  <option value="conferimento">Bonifici / Conferimenti</option>
                  <option value="acquisto">Acquisti Titoli</option>
                  <option value="vendita">Vendite Titoli</option>
                  <option value="dividendo">Dividendi / Cedole</option>
                  <option value="altro">Altre Operazioni</option>
                </select>
              </div>

              <!-- Reset Filters -->
              <button *ngIf="movSearch || movCategory !== 'all'" class="btn btn-sm btn-outline-secondary rounded-pill" (click)="resetMovFilters()">
                <i class="bi bi-x-circle me-1"></i> Reset filtri
              </button>

              <span class="ms-auto text-muted small">
                Operazioni filtrate: <strong>{{ filteredMovimenti.length }}</strong> su {{ movimenti.length }}
              </span>
            </div>

            <div class="table-responsive" style="max-height: 520px;">
              <table class="table table-hover table-striped mb-0 align-middle">
                <thead class="table-light text-secondary sticky-top">
                  <tr>
                    <th class="ps-4" style="cursor: pointer; width: 140px;" (click)="sortMovimenti('data')">
                      Data
                      <i class="bi ms-1" [ngClass]="getMovSortIcon('data')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortMovimenti('desc')">
                      Descrizione Movimento
                      <i class="bi ms-1" [ngClass]="getMovSortIcon('desc')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortMovimenti('titolo')">
                      Strumento Finanziario (Isin / Ticker)
                      <i class="bi ms-1" [ngClass]="getMovSortIcon('titolo')"></i>
                    </th>
                    <th class="pe-4 text-end" style="cursor: pointer; width: 160px;" (click)="sortMovimenti('valore')">
                      Valore (€)
                      <i class="bi ms-1" [ngClass]="getMovSortIcon('valore')"></i>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (mov of filteredMovimenti; track mov.id) {
                    <tr>
                      <td class="fw-bold ps-4">{{ formatDate(mov.dataValuta) }}</td>
                      <td>
                        <span class="badge me-2" [ngClass]="getCategoryBadgeClass(mov.descrizione)">
                          {{ getCategoryLabel(mov.descrizione) }}
                        </span>
                        {{ mov.descrizione }}
                      </td>
                      <td class="text-muted small">
                        <span *ngIf="mov.descrizioneTitolo" class="fw-medium text-body">{{ mov.descrizioneTitolo }}</span>
                        <span *ngIf="mov.isin || mov.ticker"> <br><span class="badge bg-light text-dark border">{{ mov.isin }}</span> <span *ngIf="mov.ticker" class="badge bg-primary bg-opacity-10 text-primary ms-1">{{ mov.ticker }}</span></span>
                      </td>
                      <td class="pe-4 text-end fw-bold" [ngClass]="mov.valore > 0 ? 'text-success' : 'text-danger'">
                        {{ mov.valore > 0 ? '+' : '' }}€ {{ mov.valore | number:'1.2-2' }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="py-5 text-center text-muted">Nessun movimento corrispondente ai filtri.</td>
                    </tr>
                  }
                </tbody>
                <!-- TOTALE FINALE -->
                <tfoot *ngIf="filteredMovimenti.length > 0" class="table-group-divider bg-body-tertiary">
                  <tr class="fw-bold">
                    <td class="ps-4">Totale Finale:</td>
                    <td colspan="2">
                      <span class="text-muted fw-normal">Somma algebrica di tutti i flussi e movimenti filtrati</span>
                    </td>
                    <td class="pe-4 text-end fs-6" [ngClass]="totalFilteredMovimentiValore > 0 ? 'text-success' : (totalFilteredMovimentiValore < 0 ? 'text-danger' : '')">
                      {{ totalFilteredMovimentiValore > 0 ? '+' : '' }}€ {{ totalFilteredMovimentiValore | number:'1.2-2' }}
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
export class InvestimentiComponent implements OnInit {
  private investimentiService = inject(InvestimentiService);
  private platformId = inject(PLATFORM_ID);
  
  isBrowser = false;
  isUploading = false;
  uploadMsg = '';
  uploadError = false;

  patrimoni: PatrimonioGiornaliero[] = [];
  movimenti: PortafoglioMovimento[] = [];
  
  patrimoniReverse: PatrimonioGiornaliero[] = [];
  filteredMovimenti: PortafoglioMovimento[] = [];

  latestPatrimonio = 0;
  latestPortafoglio = 0;
  latestLiquidita = 0;
  latestDataValuta: string | null = null;

  // Chart window
  chartWindow: '3m' | '6m' | '1y' | 'all' = 'all';

  // Movimenti Filters & Sorting
  movSearch = '';
  movCategory: 'all' | 'conferimento' | 'acquisto' | 'vendita' | 'dividendo' | 'altro' = 'all';
  movSortField: 'data' | 'desc' | 'titolo' | 'valore' = 'data';
  movSortAsc = false; // Descending by default (most recent first)

  patrimonioChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'line'>['options'] = {
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

  get totalFilteredMovimentiValore(): number {
    return this.filteredMovimenti.reduce((acc, curr) => acc + (curr.valore || 0), 0);
  }

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.fetchData();
    }
  }

  fetchData() {
    this.investimentiService.getPatrimonio().subscribe({
      next: (data) => {
        this.patrimoni = data || [];
        this.patrimoniReverse = [...this.patrimoni].reverse();
        this.updateMetrics();
        this.buildChart();
      },
      error: (err) => console.error('Error fetching patrimonio', err)
    });

    this.investimentiService.getMovimenti().subscribe({
      next: (data) => {
        this.movimenti = data || [];
        this.applyMovFilters();
      },
      error: (err) => console.error('Error fetching movimenti', err)
    });
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    this.isUploading = true;
    this.uploadMsg = '';
    this.uploadError = false;
    
    this.investimentiService.uploadExcel(files[0]).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.uploadError = false;
        this.uploadMsg = res.message || 'Excel sincronizzato con successo!';
        // Reset all filters and re-fetch completely from scratch
        this.movSearch = '';
        this.movCategory = 'all';
        this.fetchData();
        if (event.target) event.target.value = '';
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadError = true;
        this.uploadMsg = err.error?.message || err.error || 'Errore durante il caricamento del file Excel.';
        if (event.target) event.target.value = '';
      }
    });
  }

  deleteAllData() {
    if (confirm('WARNING: Sei sicuro di voler cancellare tutti i dati di patrimonio e movimenti?')) {
      this.investimentiService.deleteAll().subscribe(() => {
        this.fetchData();
        this.uploadMsg = 'Dati cancellati con successo.';
      });
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('it-IT'); // DD/MM/YYYY
  }

  setChartWindow(window: '3m' | '6m' | '1y' | 'all') {
    this.chartWindow = window;
    this.buildChart();
  }

  private updateMetrics() {
    if (this.patrimoni.length > 0) {
      const latest = this.patrimoni[this.patrimoni.length - 1];
      this.latestPatrimonio = latest.patrimonio;
      this.latestPortafoglio = latest.portafoglio;
      this.latestLiquidita = latest.liquidita;
      this.latestDataValuta = latest.dataValuta;
    } else {
      this.latestPatrimonio = 0;
      this.latestPortafoglio = 0;
      this.latestLiquidita = 0;
      this.latestDataValuta = null;
    }
  }

  private buildChart() {
    if (!this.patrimoni || this.patrimoni.length === 0) return;

    let dataset = [...this.patrimoni];
    if (this.chartWindow === '3m' && dataset.length > 90) {
      dataset = dataset.slice(-90);
    } else if (this.chartWindow === '6m' && dataset.length > 180) {
      dataset = dataset.slice(-180);
    } else if (this.chartWindow === '1y' && dataset.length > 365) {
      dataset = dataset.slice(-365);
    }

    const labels = dataset.map(p => this.formatDate(p.dataValuta));
    
    const datasets = [
      {
        data: dataset.map(p => p.patrimonio),
        label: 'Patrimonio Totale (€)',
        borderColor: 'rgba(25, 135, 84, 1)',
        backgroundColor: 'rgba(25, 135, 84, 0.1)',
        borderWidth: 2.2,
        fill: true,
        pointBackgroundColor: 'rgba(25, 135, 84, 1)'
      },
      {
        data: dataset.map(p => p.portafoglio),
        label: 'Portafoglio Titoli (€)',
        borderColor: 'rgba(13, 110, 253, 1)',
        backgroundColor: 'rgba(13, 110, 253, 0.05)',
        borderWidth: 2,
        fill: true,
        pointBackgroundColor: 'rgba(13, 110, 253, 1)'
      },
      {
        data: dataset.map(p => p.liquidita),
        label: 'Liquidità (€)',
        borderColor: 'rgba(13, 202, 240, 1)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        fill: false,
        pointBackgroundColor: 'rgba(13, 202, 240, 1)'
      }
    ];

    this.patrimonioChartData = {
      labels: [...labels],
      datasets: [...datasets]
    };
  }

  applyMovFilters() {
    let list = [...this.movimenti];

    // Filter by Category
    if (this.movCategory !== 'all') {
      list = list.filter(m => {
        const desc = (m.descrizione || '').toLowerCase();
        switch (this.movCategory) {
          case 'conferimento': return desc.includes('bonifico') || desc.includes('conferiment') || desc.includes('versament');
          case 'acquisto': return desc.includes('acquisto') || desc.includes('compra');
          case 'vendita': return desc.includes('vendita');
          case 'dividendo': return desc.includes('dividend') || desc.includes('cedol') || desc.includes('stacco');
          case 'altro': return !desc.includes('bonifico') && !desc.includes('conferiment') && !desc.includes('acquisto') && !desc.includes('vendita') && !desc.includes('dividend');
          default: return true;
        }
      });
    }

    // Filter by Search Query
    if (this.movSearch.trim()) {
      const q = this.movSearch.toLowerCase().trim();
      list = list.filter(m => {
        const desc = (m.descrizione || '').toLowerCase();
        const tit = (m.descrizioneTitolo || '').toLowerCase();
        const isin = (m.isin || '').toLowerCase();
        const ticker = (m.ticker || '').toLowerCase();
        const dateStr = this.formatDate(m.dataValuta).toLowerCase();
        return desc.includes(q) || tit.includes(q) || isin.includes(q) || ticker.includes(q) || dateStr.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (this.movSortField) {
        case 'data':
          valA = new Date(a.dataValuta).getTime();
          valB = new Date(b.dataValuta).getTime();
          return this.movSortAsc ? (valA - valB) : (valB - valA);
        case 'valore':
          valA = a.valore || 0;
          valB = b.valore || 0;
          return this.movSortAsc ? (valA - valB) : (valB - valA);
        case 'desc':
          valA = (a.descrizione || '').toLowerCase();
          valB = (b.descrizione || '').toLowerCase();
          return this.movSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'titolo':
          valA = (a.descrizioneTitolo || a.ticker || '').toLowerCase();
          valB = (b.descrizioneTitolo || b.ticker || '').toLowerCase();
          return this.movSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });

    this.filteredMovimenti = list;
  }

  sortMovimenti(field: 'data' | 'desc' | 'titolo' | 'valore') {
    if (this.movSortField === field) {
      this.movSortAsc = !this.movSortAsc;
    } else {
      this.movSortField = field;
      this.movSortAsc = false; // Descending first
    }
    this.applyMovFilters();
  }

  getMovSortIcon(field: 'data' | 'desc' | 'titolo' | 'valore'): string {
    if (this.movSortField !== field) return 'bi-arrow-down-up text-muted opacity-50';
    return this.movSortAsc ? 'bi-arrow-up text-primary' : 'bi-arrow-down text-primary';
  }

  resetMovFilters() {
    this.movSearch = '';
    this.movCategory = 'all';
    this.applyMovFilters();
  }

  getCategoryLabel(desc: string): string {
    const d = (desc || '').toLowerCase();
    if (d.includes('bonifico') || d.includes('conferiment')) return 'Bonifico';
    if (d.includes('acquisto')) return 'Acquisto';
    if (d.includes('vendita')) return 'Vendita';
    if (d.includes('dividend') || d.includes('cedol')) return 'Dividendo';
    return 'Movimento';
  }

  getCategoryBadgeClass(desc: string): string {
    const d = (desc || '').toLowerCase();
    if (d.includes('bonifico') || d.includes('conferiment')) return 'bg-success bg-opacity-10 text-success border border-success-subtle';
    if (d.includes('acquisto')) return 'bg-primary bg-opacity-10 text-primary border border-primary-subtle';
    if (d.includes('vendita')) return 'bg-warning bg-opacity-10 text-warning border border-warning-subtle';
    if (d.includes('dividend') || d.includes('cedol')) return 'bg-info bg-opacity-10 text-info border border-info-subtle';
    return 'bg-secondary bg-opacity-10 text-secondary border';
  }
}
