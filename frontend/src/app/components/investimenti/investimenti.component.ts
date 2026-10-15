import { Component, OnInit, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { InvestimentiService } from '../../services/investimenti/investimenti.service';
import { PatrimonioGiornaliero, PortafoglioMovimento } from '../../models/investimenti/investimenti.model';
import { CustomChartService, CustomChartConfig } from '../../services/custom-chart.service';

declare var bootstrap: any;

@Component({
  selector: 'app-investimenti',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in flex-wrap gap-2">
      <div>
        <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
          <h2 class="fw-bold mb-0 text-success"><i class="bi bi-graph-up-arrow me-2"></i> InvestimentiReader</h2>
          <span *ngIf="latestDataValuta" class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 fs-6 py-2 px-3 rounded-pill d-inline-flex align-items-center">
            <i class="bi bi-calendar2-check me-2"></i> Situazione al: <strong class="ms-1">{{ formatDate(latestDataValuta) }}</strong>
          </span>
        </div>
        <p class="text-muted mb-0">Monitoraggio portafoglio titoli, flussi di liquidità, rendimenti e allocazione.</p>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-danger rounded-pill shadow-sm px-3" (click)="deleteAllData()" [disabled]="patrimoni.length === 0 || isUploading">
          <i class="bi bi-trash-fill me-1"></i> Reset Dati
        </button>
        <button class="btn btn-outline-success rounded-pill shadow-sm px-3" (click)="openCustomChartModal()">
          <i class="bi bi-plus-circle me-1"></i> + Crea Grafico
        </button>
        <div>
          <input type="file" id="excelUpload" accept=".xlsx, .xls" class="d-none" (change)="onFileSelected($event)">
          <label for="excelUpload" class="btn btn-success rounded-pill shadow-sm px-4 m-0 fw-medium" style="cursor: pointer;">
            <i class="bi bi-file-earmark-excel me-2"></i>
            <span *ngIf="!isUploading">Sync Incrementale Excel</span>
            <span *ngIf="isUploading">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sincronizzazione...
            </span>
          </label>
        </div>
      </div>
    </div>
    
    <div *ngIf="uploadMsg" class="alert shadow-sm mb-4 animate-fade-in d-flex align-items-center justify-content-between rounded-4"
         [ngClass]="uploadError ? 'alert-danger' : 'alert-success'">
      <div class="d-flex align-items-center">
        <i class="bi me-2 fs-5" [ngClass]="uploadError ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'"></i>
        <span>{{ uploadMsg }}</span>
      </div>
      <button type="button" class="btn-close ms-3" (click)="uploadMsg = ''" aria-label="Close"></button>
    </div>

    <!-- METRICS CARDS -->
    <div class="row g-3 mb-4 animate-fade-in">
      <div class="col-md-4">
        <div class="card h-100 shadow-sm border-0 border-start border-4 border-success">
          <div class="card-body p-4 d-flex justify-content-between align-items-center">
            <div>
              <span class="text-muted small text-uppercase fw-bold">Patrimonio Totale</span>
              <h3 class="fw-bold mb-0 text-success mt-1">€ {{ latestPatrimonio | number:'1.2-2' }}</h3>
              <small class="text-muted mt-1 d-block">Valore complessivo asset</small>
            </div>
            <div class="bg-success bg-opacity-10 p-3 rounded-circle text-success">
              <i class="bi bi-safe2 fs-3"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card h-100 shadow-sm border-0 border-start border-4 border-primary">
          <div class="card-body p-4 d-flex justify-content-between align-items-center">
            <div>
              <span class="text-muted small text-uppercase fw-bold">Portafoglio Titoli</span>
              <h3 class="fw-bold mb-0 text-primary mt-1">€ {{ latestPortafoglio | number:'1.2-2' }}</h3>
              <small class="text-muted mt-1 d-block">Azioni, ETF e obbligazioni</small>
            </div>
            <div class="bg-primary bg-opacity-10 p-3 rounded-circle text-primary">
              <i class="bi bi-pie-chart fs-3"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card h-100 shadow-sm border-0 border-start border-4 border-info">
          <div class="card-body p-4 d-flex justify-content-between align-items-center">
            <div>
              <span class="text-muted small text-uppercase fw-bold">Liquidità Disponibile</span>
              <h3 class="fw-bold mb-0 text-info mt-1">€ {{ latestLiquidita | number:'1.2-2' }}</h3>
              <small class="text-muted mt-1 d-block">Saldo conto trading</small>
            </div>
            <div class="bg-info bg-opacity-10 p-3 rounded-circle text-info">
              <i class="bi bi-cash-coin fs-3"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CHARTS SECTION -->
    <div class="row g-4 mb-4">
      <!-- 1. Main Line Chart: Andamento Storico -->
      <div class="col-lg-8">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h6 class="fw-bold mb-0 text-body">
              <i class="bi bi-graph-up me-2 text-success"></i> Andamento Patrimonio nel Tempo
            </h6>
            <div class="btn-group btn-group-sm" role="group">
              <button type="button" class="btn btn-outline-secondary" [class.active]="chartWindow === '1m'" (click)="setChartWindow('1m')">1M</button>
              <button type="button" class="btn btn-outline-secondary" [class.active]="chartWindow === '3m'" (click)="setChartWindow('3m')">3M</button>
              <button type="button" class="btn btn-outline-secondary" [class.active]="chartWindow === '6m'" (click)="setChartWindow('6m')">6M</button>
              <button type="button" class="btn btn-outline-secondary" [class.active]="chartWindow === '1y'" (click)="setChartWindow('1y')">1A</button>
              <button type="button" class="btn btn-outline-secondary" [class.active]="chartWindow === 'all'" (click)="setChartWindow('all')">Tutto</button>
            </div>
          </div>
          <div class="card-body">
            <div style="display: block; height: 340px; position: relative; width: 100%;">
              <canvas *ngIf="isBrowser && patrimoni.length > 0" baseChart
                [data]="patrimonioChartData"
                [options]="chartOptions"
                [type]="'line'">
              </canvas>
              <div *ngIf="isBrowser && patrimoni.length === 0" class="text-center py-5 text-muted">
                Nessun dato di patrimonio disponibile per generare il grafico.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Asset Allocation Doughnut Chart -->
      <div class="col-lg-4">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
            <h6 class="fw-bold mb-0 text-body">
              <i class="bi bi-pie-chart-fill text-primary me-2"></i> Asset Allocation
            </h6>
            <span class="badge bg-body-secondary text-body border rounded-pill small">Attuale</span>
          </div>
          <div class="card-body">
            <div style="display: block; height: 340px; position: relative; width: 100%;">
              <canvas *ngIf="isBrowser && (latestPortafoglio > 0 || latestLiquidita > 0)" baseChart
                [data]="allocationChartData"
                [options]="doughnutOptions"
                [type]="'doughnut'">
              </canvas>
              <div *ngIf="isBrowser && latestPortafoglio === 0 && latestLiquidita === 0" class="text-center py-5 text-muted">
                Nessun asset presente.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CUSTOM CHARTS SECTION (If user saved any custom charts) -->
    <div class="card shadow-sm border-0 mb-4" *ngIf="customCharts.length > 0">
      <div class="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
        <h6 class="fw-bold mb-0 text-success">
          <i class="bi bi-stars me-2"></i> I tuoi Grafici Personalizzati (Investimenti)
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
                  <canvas *ngIf="cfg.chartType === 'line'" baseChart [data]="getCustomChartData(cfg)" [options]="chartOptions" [type]="'line'"></canvas>
                  <canvas *ngIf="cfg.chartType === 'bar'" baseChart [data]="getCustomChartData(cfg)" [options]="chartOptions" [type]="'bar'"></canvas>
                  <canvas *ngIf="cfg.chartType === 'doughnut'" baseChart [data]="getCustomChartData(cfg)" [options]="doughnutOptions" [type]="'doughnut'"></canvas>
                  <canvas *ngIf="cfg.chartType === 'pie'" baseChart [data]="getCustomChartData(cfg)" [options]="doughnutOptions" [type]="'pie'"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DATA TABLES TABS -->
    <div class="card shadow-sm border-0 animate-fade-in delay-4 mb-5">
      <div class="card-header bg-transparent border-bottom p-0">
        <ul class="nav nav-tabs border-bottom-0" id="myTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active fw-bold py-3 px-4 border-0 border-bottom border-3 border-success" 
                    id="patrimonio-tab" data-bs-toggle="tab" data-bs-target="#patrimonio-pane" type="button" role="tab">
              <i class="bi bi-clock-history me-1"></i> Patrimonio Storico ({{ patrimoni.length }})
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link fw-bold py-3 px-4 text-muted border-0" 
                    id="movimenti-tab" data-bs-toggle="tab" data-bs-target="#movimenti-pane" type="button" role="tab">
              <i class="bi bi-arrow-left-right me-1"></i> Movimenti Portafoglio ({{ movimenti.length }})
            </button>
          </li>
        </ul>
      </div>
      <div class="card-body p-0">
        <div class="tab-content" id="myTabContent">
          
          <!-- Patrimonio Tab (Fixed Height with Totals Footer) -->
          <div class="tab-pane fade show active" id="patrimonio-pane" role="tabpanel" tabindex="0">
            <div class="table-responsive" style="height: 480px; max-height: 480px; overflow-y: auto;">
              <table class="table table-modern table-hover mb-0 align-middle text-center">
                <thead class="table-light sticky-top">
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
                      <td class="text-start fw-bold ps-4 text-body">{{ formatDate(pat.dataValuta) }}</td>
                      <td>€ {{ pat.liquidita | number:'1.2-2' }}</td>
                      <td class="text-secondary">€ {{ pat.finanziamentoLong | number:'1.2-2' }}</td>
                      <td class="text-secondary">€ {{ pat.garanziaShort | number:'1.2-2' }}</td>
                      <td class="text-primary fw-medium">€ {{ pat.portafoglio | number:'1.2-2' }}</td>
                      <td class="pe-4 text-success fw-bold">€ {{ pat.patrimonio | number:'1.2-2' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="py-5 text-muted">Nessun dato di patrimonio disponibile. Esegui il sync del file Excel Directa.</td>
                    </tr>
                  }
                </tbody>
                <tfoot *ngIf="patrimoni.length > 0" class="table-light fw-bold sticky-bottom">
                  <tr>
                    <td class="text-start ps-4">Ultima Rilevazione:</td>
                    <td>€ {{ latestLiquidita | number:'1.2-2' }}</td>
                    <td class="text-secondary">-</td>
                    <td class="text-secondary">-</td>
                    <td class="text-primary">€ {{ latestPortafoglio | number:'1.2-2' }}</td>
                    <td class="pe-4 text-success fw-bold fs-6">€ {{ latestPatrimonio | number:'1.2-2' }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <!-- Movimenti Tab WITH CATEGORY TOTALS BREAKDOWN -->
          <div class="tab-pane fade" id="movimenti-pane" role="tabpanel" tabindex="0">
            
            <!-- CATEGORY SUMMARY BADGES BAR -->
            <div class="p-3 border-bottom bg-body-tertiary">
              <div class="row g-2 text-center text-md-start">
                <div class="col-md col-6">
                  <div class="p-2 px-3 rounded-3 border bg-body">
                    <small class="text-muted d-block" style="font-size: 0.72rem;">Bonifici / Conferimenti</small>
                    <strong class="text-success small">+€ {{ categoryTotals.conferimenti | number:'1.2-2' }}</strong>
                  </div>
                </div>
                <div class="col-md col-6">
                  <div class="p-2 px-3 rounded-3 border bg-body">
                    <small class="text-muted d-block" style="font-size: 0.72rem;">Acquisti Titoli</small>
                    <strong class="text-primary small">€ {{ categoryTotals.acquisti | number:'1.2-2' }}</strong>
                  </div>
                </div>
                <div class="col-md col-6">
                  <div class="p-2 px-3 rounded-3 border bg-body">
                    <small class="text-muted d-block" style="font-size: 0.72rem;">Vendite Titoli</small>
                    <strong class="text-warning small">+€ {{ categoryTotals.vendite | number:'1.2-2' }}</strong>
                  </div>
                </div>
                <div class="col-md col-6">
                  <div class="p-2 px-3 rounded-3 border bg-body">
                    <small class="text-muted d-block" style="font-size: 0.72rem;">Dividendi / Cedole</small>
                    <strong class="text-info small">+€ {{ categoryTotals.dividendi | number:'1.2-2' }}</strong>
                  </div>
                </div>
                <div class="col-md col-12">
                  <div class="p-2 px-3 rounded-3 border border-danger border-opacity-50 bg-danger bg-opacity-10">
                    <small class="text-danger fw-bold d-block" style="font-size: 0.72rem;">
                      <i class="bi bi-receipt-cutoff me-1"></i> Bollo & Spese (Costi)
                    </small>
                    <strong class="text-danger small">€ {{ categoryTotals.bollo | number:'1.2-2' }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Filters Bar -->
            <div class="p-3 border-bottom d-flex gap-3 align-items-center flex-wrap">
              <div class="input-group input-group-sm" style="max-width: 320px;">
                <span class="input-group-text bg-body border-end-0"><i class="bi bi-search text-muted"></i></span>
                <input type="text" class="form-control border-start-0" placeholder="Cerca descrizione, titolo, ticker, isin..." [(ngModel)]="movSearch" (input)="applyMovFilters()">
              </div>

              <div class="d-flex align-items-center gap-2">
                <label class="text-muted small fw-bold">Categoria:</label>
                <select class="form-select form-select-sm" style="width: auto;" [(ngModel)]="movCategory" (change)="applyMovFilters()">
                  <option value="all">Tutte le Operazioni ({{ movimenti.length }})</option>
                  <option value="conferimento">Bonifici / Conferimenti</option>
                  <option value="acquisto">Acquisti Titoli</option>
                  <option value="vendita">Vendite Titoli</option>
                  <option value="dividendo">Dividendi / Cedole</option>
                  <option value="bollo">Bollo & Spese (Costi)</option>
                  <option value="altro">Altre Operazioni</option>
                </select>
              </div>

              <button *ngIf="movSearch || movCategory !== 'all'" class="btn btn-sm btn-outline-secondary rounded-pill" (click)="resetMovFilters()">
                <i class="bi bi-x-circle me-1"></i> Reset filtri
              </button>

              <span class="ms-auto text-muted small">
                Operazioni: <strong>{{ filteredMovimenti.length }}</strong> su {{ movimenti.length }}
              </span>
            </div>

            <div class="table-responsive" style="height: 480px; max-height: 480px; overflow-y: auto;">
              <table class="table table-modern table-hover mb-0 align-middle">
                <thead class="table-light sticky-top">
                  <tr>
                    <th class="ps-4" style="cursor: pointer; width: 140px;" (click)="sortMovimenti('data')">
                      Data <i class="bi ms-1" [ngClass]="getMovSortIcon('data')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortMovimenti('desc')">
                      Descrizione Movimento <i class="bi ms-1" [ngClass]="getMovSortIcon('desc')"></i>
                    </th>
                    <th style="cursor: pointer;" (click)="sortMovimenti('titolo')">
                      Strumento Finanziario <i class="bi ms-1" [ngClass]="getMovSortIcon('titolo')"></i>
                    </th>
                    <th class="pe-4 text-end" style="cursor: pointer; width: 160px;" (click)="sortMovimenti('valore')">
                      Valore (€) <i class="bi ms-1" [ngClass]="getMovSortIcon('valore')"></i>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (mov of filteredMovimenti; track mov.id) {
                    <tr>
                      <td class="fw-bold ps-4 text-body">{{ formatDate(mov.dataValuta) }}</td>
                      <td>
                        <span class="badge me-2" [ngClass]="getCategoryBadgeClass(mov.descrizione)">
                          {{ getCategoryLabel(mov.descrizione) }}
                        </span>
                        {{ mov.descrizione }}
                      </td>
                      <td class="text-muted small">
                        <span *ngIf="mov.descrizioneTitolo" class="fw-medium text-body">{{ mov.descrizioneTitolo }}</span>
                        <span *ngIf="mov.isin || mov.ticker">
                          <br>
                          <span class="badge bg-body-secondary text-body border">{{ mov.isin }}</span> 
                          <span *ngIf="mov.ticker" class="badge bg-primary bg-opacity-10 text-primary ms-1 border border-primary border-opacity-25">{{ mov.ticker }}</span>
                        </span>
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
                <tfoot *ngIf="filteredMovimenti.length > 0" class="table-light fw-bold sticky-bottom">
                  <tr>
                    <td class="ps-4">Totale Flusso Filtrato:</td>
                    <td colspan="2">
                      <span class="text-muted fw-normal">Somma algebrica delle operazioni visualizzate ({{ filteredMovimenti.length }} record)</span>
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

    <!-- MODAL: CREA GRAFICO PERSONALIZZATO INVESTIMENTI -->
    <div class="modal fade" id="customInvestChartModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 shadow-lg">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold text-success">
              <i class="bi bi-magic me-2"></i> Crea Nuovo Grafico Investimenti
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-3">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label small fw-bold">Titolo Grafico *</label>
                <input type="text" class="form-control" placeholder="Es. Evoluzione Portafoglio Titoli" [(ngModel)]="newChartForm.title">
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
                  <option value="patrimonio">Patrimonio Totale</option>
                  <option value="portafoglio">Portafoglio Titoli</option>
                  <option value="liquidita">Liquidità</option>
                </select>
              </div>

              <div class="col-12">
                <label class="form-label small fw-bold">Colore Tema</label>
                <select class="form-select" [(ngModel)]="newChartForm.colorScheme">
                  <option value="green">Verde (Smeraldo)</option>
                  <option value="blue">Blu Finanziario</option>
                  <option value="purple">Viola Digitale</option>
                  <option value="amber">Ambra / Arancio</option>
                  <option value="teal">Ciano / Turchese</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer border-top-0 pt-0">
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-success rounded-pill px-4" (click)="saveCustomChart()">
              Genera e Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InvestimentiComponent implements OnInit {
  investimentiService = inject(InvestimentiService);
  customChartService = inject(CustomChartService);
  private platformId = inject(PLATFORM_ID);
  isBrowser = false;

  patrimoni: PatrimonioGiornaliero[] = [];
  patrimoniReverse: PatrimonioGiornaliero[] = [];
  movimenti: PortafoglioMovimento[] = [];
  filteredMovimenti: PortafoglioMovimento[] = [];

  // Metrics
  latestPatrimonio = 0;
  latestPortafoglio = 0;
  latestLiquidita = 0;
  latestDataValuta: string | null = null;

  // Upload State
  isUploading = false;
  uploadMsg = '';
  uploadError = false;

  // Chart
  chartWindow: '1m' | '3m' | '6m' | '1y' | 'all' = 'all';
  patrimonioChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  allocationChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: { tension: 0.35 },
      point: {
        radius: 0,
        hitRadius: 10,
        hoverRadius: 6,
        hoverBorderWidth: 2
      }
    },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12 } },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: € ${Number(context.raw).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        ticks: { callback: (val) => `€ ${Number(val).toLocaleString('it-IT')}` }
      },
      x: { grid: { display: false } }
    }
  };

  doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: € ${Number(context.raw).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    }
  };

  // Movimenti Filters & Sort
  movSearch = '';
  movCategory = 'all';
  movSortField: 'data' | 'desc' | 'titolo' | 'valore' = 'data';
  movSortAsc = false;

  // Custom charts
  customCharts: CustomChartConfig[] = [];
  customChartModalInstance: any;
  newChartForm: any = {
    title: '',
    chartType: 'line',
    metric: 'patrimonio',
    colorScheme: 'green'
  };

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.loadCustomCharts();
      this.fetchData();
    }
  }

  fetchData() {
    this.investimentiService.getPatrimonioStorico().subscribe({
      next: (data) => {
        this.patrimoni = data || [];
        this.patrimoniReverse = [...this.patrimoni].reverse();
        this.calculateMetrics();
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
    const file: File = event.target.files[0];
    if (file) {
      this.isUploading = true;
      this.uploadMsg = '';
      this.investimentiService.uploadExcel(file).subscribe({
        next: (res: any) => {
          this.isUploading = false;
          this.uploadError = false;
          this.uploadMsg = res.message || 'Sincronizzazione completata con successo!';
          this.fetchData();
          event.target.value = '';
        },
        error: (err: any) => {
          this.isUploading = false;
          this.uploadError = true;
          this.uploadMsg = err.error?.message || err.message || 'Errore durante la sincronizzazione Excel.';
          event.target.value = '';
        }
      });
    }
  }

  deleteAllData() {
    if (confirm('Sei sicuro di voler eliminare tutti i dati storici degli investimenti? Questa operazione cancellerà sia le rilevazioni di patrimonio sia i movimenti.')) {
      this.investimentiService.deleteAll().subscribe({
        next: () => {
          this.uploadMsg = 'Tutti i dati investimenti sono stati eliminati.';
          this.uploadError = false;
          this.fetchData();
        },
        error: (err) => {
          this.uploadMsg = 'Errore durante la cancellazione dei dati: ' + (err.error?.message || err.message);
          this.uploadError = true;
        }
      });
    }
  }

  calculateMetrics() {
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

    // Build Allocation Chart
    this.allocationChartData = {
      labels: ['Portafoglio Titoli', 'Liquidità'],
      datasets: [
        {
          data: [this.latestPortafoglio, this.latestLiquidita],
          backgroundColor: ['#0d6efd', '#0dcaf0'],
          borderWidth: 1
        }
      ]
    };
  }

  setChartWindow(window: '1m' | '3m' | '6m' | '1y' | 'all') {
    this.chartWindow = window;
    this.buildChart();
  }

  buildChart() {
    if (!this.patrimoni || this.patrimoni.length === 0) {
      this.patrimonioChartData = { labels: [], datasets: [] };
      return;
    }

    let dataset = [...this.patrimoni];
    if (this.chartWindow === '1m' && dataset.length > 30) {
      dataset = dataset.slice(dataset.length - 30);
    } else if (this.chartWindow === '3m' && dataset.length > 90) {
      dataset = dataset.slice(dataset.length - 90);
    } else if (this.chartWindow === '6m' && dataset.length > 180) {
      dataset = dataset.slice(dataset.length - 180);
    } else if (this.chartWindow === '1y' && dataset.length > 365) {
      dataset = dataset.slice(dataset.length - 365);
    }

    const labels = dataset.map(p => this.formatDate(p.dataValuta));
    const datasets = [
      {
        data: dataset.map(p => p.patrimonio),
        label: 'Patrimonio Totale (€)',
        borderColor: '#198754',
        backgroundColor: 'rgba(25, 135, 84, 0.1)',
        borderWidth: 2.2,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#198754',
        pointBorderColor: '#ffffff'
      },
      {
        data: dataset.map(p => p.portafoglio),
        label: 'Portafoglio Titoli (€)',
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.05)',
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#0d6efd',
        pointBorderColor: '#ffffff'
      },
      {
        data: dataset.map(p => p.liquidita),
        label: 'Liquidità (€)',
        borderColor: '#0dcaf0',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#0dcaf0',
        pointBorderColor: '#ffffff'
      }
    ];

    this.patrimonioChartData = {
      labels: [...labels],
      datasets: [...datasets]
    };

    if (this.chart) {
      this.chart.update();
    }
  }

  // --- CUSTOM CHARTS BUILDER ---
  loadCustomCharts() {
    this.customCharts = this.customChartService.getCharts('investimenti');
  }

  openCustomChartModal() {
    this.newChartForm = {
      title: '',
      chartType: 'line',
      metric: 'patrimonio',
      colorScheme: 'green'
    };
    if (!this.customChartModalInstance && typeof bootstrap !== 'undefined') {
      const el = document.getElementById('customInvestChartModal');
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
      sourceModule: 'investimenti',
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
    const labels = this.patrimoni.map(p => this.formatDate(p.dataValuta));
    let data: number[] = [];
    let bg = 'rgba(25, 135, 84, 0.7)';
    let border = '#198754';

    if (cfg.colorScheme === 'blue') { bg = 'rgba(13, 110, 253, 0.7)'; border = '#0d6efd'; }
    else if (cfg.colorScheme === 'purple') { bg = 'rgba(111, 66, 193, 0.7)'; border = '#6f42c1'; }
    else if (cfg.colorScheme === 'amber') { bg = 'rgba(255, 193, 7, 0.7)'; border = '#ffc107'; }
    else if (cfg.colorScheme === 'teal') { bg = 'rgba(13, 202, 240, 0.7)'; border = '#0dcaf0'; }

    if (cfg.metric === 'portafoglio') {
      data = this.patrimoni.map(p => p.portafoglio || 0);
    } else if (cfg.metric === 'liquidita') {
      data = this.patrimoni.map(p => p.liquidita || 0);
    } else {
      data = this.patrimoni.map(p => p.patrimonio || 0);
    }

    return {
      labels,
      datasets: [
        {
          data,
          label: cfg.title,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 2,
          pointRadius: 0,
          fill: cfg.chartType === 'line'
        }
      ]
    };
  }

  // --- MOVIMENTI FILTERS & SORTING ---
  applyMovFilters() {
    let list = [...this.movimenti];

    if (this.movCategory !== 'all') {
      list = list.filter(m => this.detectCategory(m.descrizione) === this.movCategory);
    }

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
      this.movSortAsc = false;
    }
    this.applyMovFilters();
  }

  getMovSortIcon(field: 'data' | 'desc' | 'titolo' | 'valore'): string {
    if (this.movSortField !== field) return 'bi-arrow-down-up text-muted opacity-50';
    return this.movSortAsc ? 'bi-arrow-up text-success' : 'bi-arrow-down text-success';
  }

  resetMovFilters() {
    this.movSearch = '';
    this.movCategory = 'all';
    this.applyMovFilters();
  }

  get totalFilteredMovimentiValore(): number {
    return this.filteredMovimenti.reduce((acc, m) => acc + (m.valore || 0), 0);
  }

  get categoryTotals() {
    let conferimenti = 0;
    let acquisti = 0;
    let vendite = 0;
    let dividendi = 0;
    let bollo = 0;
    let altro = 0;

    for (const m of this.movimenti) {
      const v = m.valore || 0;
      const cat = this.detectCategory(m.descrizione);
      switch (cat) {
        case 'conferimento': conferimenti += v; break;
        case 'acquisto': acquisti += v; break;
        case 'vendita': vendite += v; break;
        case 'dividendo': dividendi += v; break;
        case 'bollo': bollo += v; break;
        default: altro += v; break;
      }
    }

    return { conferimenti, acquisti, vendite, dividendi, bollo, altro };
  }

  detectCategory(desc: string): 'conferimento' | 'acquisto' | 'vendita' | 'dividendo' | 'bollo' | 'altro' {
    const d = (desc || '').toLowerCase();
    if (d.includes('bollo') || d.includes('imposta') || d.includes('ritenut') || d.includes('spese') || d.includes('canone') || d.includes('commission')) {
      return 'bollo';
    }
    if (d.includes('bonifico') || d.includes('conferiment') || d.includes('versament')) {
      return 'conferimento';
    }
    if (d.includes('acquisto') || d.includes('compra') || d.includes('sottoscrizion')) {
      return 'acquisto';
    }
    if (d.includes('vendita') || d.includes('rimborso')) {
      return 'vendita';
    }
    if (d.includes('dividend') || d.includes('cedol') || d.includes('stacco')) {
      return 'dividendo';
    }
    return 'altro';
  }

  getCategoryLabel(desc: string): string {
    const cat = this.detectCategory(desc);
    switch (cat) {
      case 'bollo': return 'Bollo & Spese';
      case 'conferimento': return 'Bonifico';
      case 'acquisto': return 'Acquisto';
      case 'vendita': return 'Vendita';
      case 'dividendo': return 'Dividendo';
      default: return 'Movimento';
    }
  }

  getCategoryBadgeClass(desc: string): string {
    const cat = this.detectCategory(desc);
    switch (cat) {
      case 'bollo': return 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25';
      case 'conferimento': return 'bg-success bg-opacity-10 text-success border border-success border-opacity-25';
      case 'acquisto': return 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25';
      case 'vendita': return 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25';
      case 'dividendo': return 'bg-info bg-opacity-10 text-info border border-info border-opacity-25';
      default: return 'bg-secondary bg-opacity-10 text-secondary border';
    }
  }

  formatDate(dateVal: any): string {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(dateVal);
    }
  }
}
