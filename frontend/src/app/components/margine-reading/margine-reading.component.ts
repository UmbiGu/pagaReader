import { Component, OnInit, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { MargineService } from '../../services/margine/margine.service';
import { MargineMese, MargineMovimento } from '../../models/margine/margine.model';
import { CustomChartService, CustomChartConfig } from '../../services/custom-chart.service';

declare var bootstrap: any;

@Component({
  selector: 'app-margine-reading',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule],
  template: `
    <div class="container-fluid px-0 py-4 animate-fade-in">
      
      <!-- TOP HEADER / HERO -->
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <div class="p-2 rounded-3 text-white shadow-sm d-flex align-items-center justify-content-center" 
                 style="background-color: #6f42c1; width: 42px; height: 42px;">
              <i class="bi bi-wallet2 fs-4"></i>
            </div>
            <div>
              <h3 class="fw-bold mb-0" style="color: #6f42c1;">MargineReading</h3>
              <p class="text-muted small mb-0">Gestione autonoma del bilancio familiare, spese e marginalità mensile</p>
            </div>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2 flex-wrap">
          <!-- Excel import as secondary optional fallback -->
          <label class="btn btn-outline-secondary rounded-pill shadow-sm px-3 mb-0" style="cursor: pointer;" title="Importa opzionalmente un vecchio foglio Excel">
            <i class="bi bi-file-earmark-excel me-1 text-success"></i> 
            <span class="d-none d-sm-inline">Importa Excel</span>
            <input type="file" (change)="onExcelSelected($event)" accept=".xlsx, .xls" style="display: none;">
          </label>

          <button class="btn btn-outline-secondary rounded-pill shadow-sm px-3" (click)="openAddMonthModal()">
            <i class="bi bi-calendar-plus me-1 text-primary"></i> + Nuovo Mese
          </button>

          <button class="btn btn-primary rounded-pill shadow-sm px-4 fw-medium" 
                  style="background-color: #6f42c1; border-color: #6f42c1;" 
                  (click)="openAddModal()">
            <i class="bi bi-plus-lg me-1"></i> Nuova Spesa
          </button>
        </div>
      </div>

      <!-- ALERTS / NOTIFICATIONS -->
      <div *ngIf="alertMsg" class="alert alert-dismissible fade show shadow-sm rounded-4 mb-4" 
           [class.alert-success]="!alertError" [class.alert-danger]="alertError" role="alert">
        <i class="bi" [class.bi-check-circle-fill]="!alertError" [class.bi-exclamation-triangle-fill]="alertError"></i>
        <span class="ms-2">{{ alertMsg }}</span>
        <button type="button" class="btn-close" (click)="alertMsg = ''" aria-label="Close"></button>
      </div>

      <!-- NAVIGATION TABS -->
      <ul class="nav nav-pills mb-4 gap-2 border-bottom pb-3">
        <li class="nav-item">
          <button class="nav-link rounded-pill px-4 fw-medium" 
                  [class.active]="activeTab === 'spese'"
                  [style.backgroundColor]="activeTab === 'spese' ? '#6f42c1' : ''"
                  (click)="activeTab = 'spese'">
            <i class="bi bi-receipt me-1"></i> Spese del Mese
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link rounded-pill px-4 fw-medium" 
                  [class.active]="activeTab === 'analytics'"
                  [style.backgroundColor]="activeTab === 'analytics' ? '#6f42c1' : ''"
                  (click)="activeTab = 'analytics'">
            <i class="bi bi-graph-up-arrow me-1"></i> Analytics & Grafici
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link rounded-pill px-4 fw-medium" 
                  [class.active]="activeTab === 'mesi'"
                  [style.backgroundColor]="activeTab === 'mesi' ? '#6f42c1' : ''"
                  (click)="activeTab = 'mesi'">
            <i class="bi bi-calendar3 me-1"></i> Riepilogo Annuale Mesi
          </button>
        </li>
      </ul>

      <!-- MONTH SELECTOR CAROUSEL (SORTED NEWEST FIRST) -->
      <div *ngIf="activeTab === 'spese'" class="card shadow-sm border-0 mb-4 animate-fade-in">
        <div class="card-body p-3">
          <div class="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
            <span class="small fw-bold text-uppercase tracking-wider text-muted">
              <i class="bi bi-calendar-check me-1"></i> Seleziona Mese Attivo (Dal più recente)
            </span>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-outline-secondary rounded-pill px-2 py-1" 
                      *ngIf="selectedMonth" 
                      (click)="openEditMonthModal()" 
                      title="Modifica parametri o stipendio del mese">
                <i class="bi bi-pencil-square me-1"></i> Modifica Mese
              </button>
              <button class="btn btn-sm btn-outline-danger rounded-pill px-2 py-1" 
                      *ngIf="selectedMonth" 
                      (click)="deleteMonth(selectedMonth)" 
                      title="Elimina questo mese">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>

          <!-- Carousel with newest first -->
          <div class="d-flex gap-2 overflow-x-auto pb-2" style="scrollbar-width: thin;">
            <button *ngFor="let m of mesiSorted" 
                    class="btn rounded-pill px-3 py-2 text-nowrap fw-medium border transition-all"
                    [class.btn-primary]="isMonthSelected(m)"
                    [style.backgroundColor]="isMonthSelected(m) ? '#6f42c1' : ''"
                    [style.borderColor]="isMonthSelected(m) ? '#6f42c1' : 'rgba(125,125,125,0.2)'"
                    [class.btn-outline-secondary]="!isMonthSelected(m)"
                    (click)="selectMonth(m)">
              <span>{{ m.sheetName }}</span>
              <span class="badge rounded-pill ms-2" 
                    [class.bg-white]="isMonthSelected(m)" 
                    [class.text-dark]="isMonthSelected(m)"
                    [class.bg-secondary]="!isMonthSelected(m)"
                    [class.bg-opacity-25]="!isMonthSelected(m)">
                € {{ (m.totaleSpese || 0) | number:'1.0-0' }}
              </span>
            </button>

            <button class="btn btn-outline-primary rounded-pill px-3 py-2 text-nowrap" (click)="openAddMonthModal()">
              <i class="bi bi-plus-lg me-1"></i> Aggiungi Mese
            </button>
          </div>
        </div>
      </div>

      <!-- KPI METRIC CARDS -->
      <div class="row g-3 mb-4 animate-fade-in">
        <!-- 1. Entrate / Stipendio -->
        <div class="col-xl-3 col-sm-6">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body p-4 d-flex align-items-center justify-content-between">
              <div>
                <span class="text-uppercase text-muted fw-bold small">Stipendio / Entrate</span>
                <h3 class="fw-bold mb-0 text-success mt-1">€ {{ currentEntrate | number:'1.2-2' }}</h3>
                <small class="text-muted d-block mt-1">
                  {{ selectedMonth ? selectedMonth.sheetName : 'Totale storico' }}
                </small>
              </div>
              <div class="p-3 rounded-circle bg-success bg-opacity-10 text-success">
                <i class="bi bi-cash-coin fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Spese Totali -->
        <div class="col-xl-3 col-sm-6">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body p-4 d-flex align-items-center justify-content-between">
              <div>
                <span class="text-uppercase text-muted fw-bold small">Spese Totali</span>
                <h3 class="fw-bold mb-0 text-danger mt-1">€ {{ currentTotaleSpese | number:'1.2-2' }}</h3>
                <small class="text-muted d-block mt-1">
                  {{ filteredMovimenti.length }} spese registrate
                </small>
              </div>
              <div class="p-3 rounded-circle bg-danger bg-opacity-10 text-danger">
                <i class="bi bi-cart-x fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Margine / Risparmi -->
        <div class="col-xl-3 col-sm-6">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body p-4 d-flex align-items-center justify-content-between">
              <div>
                <span class="text-uppercase text-muted fw-bold small">Margine / Risparmi</span>
                <h3 class="fw-bold mb-0 mt-1" [class.text-success]="currentRisparmiati >= 0" [class.text-danger]="currentRisparmiati < 0">
                  € {{ currentRisparmiati | number:'1.2-2' }}
                </h3>
                <small class="text-muted d-block mt-1">
                  Saving Rate: <strong [class.text-success]="savingRate >= 0">{{ savingRate | number:'1.1-1' }}%</strong>
                </small>
              </div>
              <div class="p-3 rounded-circle" [style.backgroundColor]="'rgba(111, 66, 193, 0.12)'" style="color: #6f42c1;">
                <i class="bi bi-piggy-bank fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. In Sospeso / Da Pagare -->
        <div class="col-xl-3 col-sm-6">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body p-4 d-flex align-items-center justify-content-between">
              <div>
                <span class="text-uppercase text-muted fw-bold small">In Sospeso / Da Saldare</span>
                <h3 class="fw-bold mb-0 text-warning mt-1">€ {{ currentDaPagare | number:'1.2-2' }}</h3>
                <small class="text-muted d-block mt-1">
                  {{ unconfirmedCount }} voci in attesa di saldo
                </small>
              </div>
              <div class="p-3 rounded-circle bg-warning bg-opacity-10 text-warning">
                <i class="bi bi-hourglass-split fs-3"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 1: SPESE DEL MESE -->
      <div *ngIf="activeTab === 'spese'">
        <div class="card shadow-sm border-0 mb-4 animate-fade-in">
          
          <!-- QUICK INLINE ADD BAR (VELOCIZZA L'INSERIMENTO DELLE SPESE) -->
          <div class="p-3 bg-body-tertiary border-bottom">
            <div class="small fw-bold text-uppercase tracking-wider text-muted mb-2">
              <i class="bi bi-lightning-charge-fill text-warning me-1"></i> Inserimento Rapido Spesa
            </div>
            <div class="row g-2 align-items-center">
              <div class="col-md-2 col-6">
                <input type="date" class="form-control form-control-sm" [(ngModel)]="quickData" placeholder="Data">
              </div>
              <div class="col-md-2 col-6">
                <input type="text" class="form-control form-control-sm" [(ngModel)]="quickConto" list="contiListQuick" placeholder="Conto (isybank)">
                <datalist id="contiListQuick">
                  <option value="isybank">
                  <option value="Revolut">
                  <option value="BBVA">
                  <option value="Contanti">
                </datalist>
              </div>
              <div class="col-md-2 col-6">
                <select class="form-select form-select-sm" [(ngModel)]="quickCategoria">
                  <option *ngFor="let cat of availableCategories" [value]="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="col-md-3 col-6">
                <input type="text" class="form-control form-control-sm" [(ngModel)]="quickDescrizione" placeholder="Descrizione spesa *" (keyup.enter)="quickAdd()">
              </div>
              <div class="col-md-2 col-8">
                <div class="input-group input-group-sm">
                  <span class="input-group-text">€</span>
                  <input type="number" step="0.01" class="form-control text-end" [(ngModel)]="quickUscite" placeholder="0.00 *" (keyup.enter)="quickAdd()">
                </div>
              </div>
              <div class="col-md-1 col-4">
                <button class="btn btn-primary btn-sm rounded-pill w-100 fw-bold shadow-sm" 
                        style="background-color: #6f42c1; border-color: #6f42c1;" 
                        (click)="quickAdd()" 
                        title="Salva immediatamente la spesa">
                  <i class="bi bi-plus-lg"></i> Salva
                </button>
              </div>
            </div>
          </div>

          <!-- SEARCH & FILTERS TOOLBAR -->
          <div class="card-header bg-transparent border-0 pt-3 pb-3">
            <div class="row g-2 align-items-center">
              
              <!-- Ricerca testuale -->
              <div class="col-md-4">
                <div class="input-group">
                  <span class="input-group-text bg-body border-end-0"><i class="bi bi-search"></i></span>
                  <input type="text" class="form-control border-start-0" 
                         placeholder="Cerca descrizione, note, conto..." 
                         [(ngModel)]="searchText">
                </div>
              </div>

              <!-- Filtro Conto -->
              <div class="col-md-2 col-6">
                <select class="form-select" [(ngModel)]="selectedConto">
                  <option value="">Tutti i Conti</option>
                  <option *ngFor="let c of contiList" [value]="c">{{ c }}</option>
                </select>
              </div>

              <!-- Filtro Categoria -->
              <div class="col-md-2 col-6">
                <select class="form-select" [(ngModel)]="selectedCategoria">
                  <option value="">Tutte le Categorie</option>
                  <option *ngFor="let cat of categorieList" [value]="cat">{{ cat }}</option>
                </select>
              </div>

              <!-- Filtro Stato Pagato -->
              <div class="col-md-2 col-6">
                <select class="form-select" [(ngModel)]="selectedStatus">
                  <option value="all">Tutti gli Stati</option>
                  <option value="paid">Solo Pagati</option>
                  <option value="pending">Solo In Sospeso</option>
                </select>
              </div>

              <!-- Reset & Action Buttons -->
              <div class="col-md-2 col-6 d-flex gap-2 justify-content-end">
                <button class="btn btn-outline-secondary rounded-pill w-100" 
                        *ngIf="searchText || selectedConto || selectedCategoria || selectedStatus !== 'all'"
                        (click)="resetFilters()">
                  <i class="bi bi-x-circle me-1"></i> Reset
                </button>
                <button class="btn btn-outline-primary rounded-pill w-100" (click)="openManageCategoriesModal()">
                  <i class="bi bi-tag me-1"></i> Categorie
                </button>
              </div>
            </div>
          </div>

          <!-- TABLE (FIXED HEIGHT WITH TOTALE FINALE) -->
          <div class="card-body p-0">
            <div class="table-responsive" style="height: 480px; max-height: 480px; overflow-y: auto;">
              <table class="table table-modern table-hover align-middle mb-0">
                <thead class="table-light sticky-top">
                  <tr>
                    <th (click)="sort('data')" style="cursor: pointer;" class="text-nowrap ps-4">
                      Data <i class="bi ms-1" [ngClass]="getSortIcon('data')"></i>
                    </th>
                    <th (click)="sort('conto')" style="cursor: pointer;">
                      Conto <i class="bi ms-1" [ngClass]="getSortIcon('conto')"></i>
                    </th>
                    <th (click)="sort('categoria')" style="cursor: pointer;">
                      Categoria <i class="bi ms-1" [ngClass]="getSortIcon('categoria')"></i>
                    </th>
                    <th (click)="sort('descrizione')" style="cursor: pointer;">
                      Descrizione <i class="bi ms-1" [ngClass]="getSortIcon('descrizione')"></i>
                    </th>
                    <th class="text-end" (click)="sort('uscite')" style="cursor: pointer;">
                      Importo <i class="bi ms-1" [ngClass]="getSortIcon('uscite')"></i>
                    </th>
                    <th class="text-center">Stato</th>
                    <th class="text-center pe-4">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of filteredMovimenti">
                    <td class="text-nowrap ps-4 fw-medium text-secondary">
                      {{ m.data | date:'dd/MM/yyyy' }}
                    </td>
                    <td>
                      <span class="badge rounded-pill px-3 py-1" [ngClass]="getContoBadgeClass(m.conto)">
                        {{ m.conto }}
                      </span>
                    </td>
                    <td>
                      <span class="badge rounded-pill px-2 py-1 bg-secondary bg-opacity-10 text-secondary border">
                        <i class="bi bi-tag me-1"></i>{{ m.categoria || 'Varie' }}
                      </span>
                    </td>
                    <td>
                      <span class="fw-semibold text-body">{{ m.descrizione }}</span>
                      <small *ngIf="m.note" class="d-block text-muted" style="font-size: 0.78rem;">
                        <i class="bi bi-chat-left-text me-1"></i>{{ m.note }}
                      </small>
                    </td>
                    <td class="text-end fw-bold text-danger text-nowrap">
                      € {{ m.uscite | number:'1.2-2' }}
                    </td>
                    <td class="text-center">
                      <button class="btn btn-sm rounded-pill py-1 px-3 fw-bold border shadow-none"
                              [style.backgroundColor]="m.pagato ? 'rgba(25, 135, 84, 0.15)' : 'rgba(255, 193, 7, 0.15)'"
                              [style.color]="m.pagato ? '#20c997' : '#ffc107'"
                              [style.borderColor]="m.pagato ? 'rgba(32, 201, 151, 0.3)' : 'rgba(255, 193, 7, 0.3)'"
                              (click)="togglePagato(m)"
                              title="Clicca per invertire stato">
                        <i class="bi me-1" [class.bi-check-circle-fill]="m.pagato" [class.bi-clock-fill]="!m.pagato"></i>
                        {{ m.pagato ? 'Saldato' : 'In Sospeso' }}
                      </button>
                    </td>
                    <td class="text-center pe-4 text-nowrap">
                      <button class="btn btn-sm btn-link text-primary p-1 me-1" (click)="openEditModal(m)" title="Modifica">
                        <i class="bi bi-pencil-square fs-6"></i>
                      </button>
                      <button class="btn btn-sm btn-link text-danger p-1" (click)="deleteRow(m.id!)" title="Elimina">
                        <i class="bi bi-trash fs-6"></i>
                      </button>
                    </td>
                  </tr>

                  <!-- EMPTY STATE -->
                  <tr *ngIf="filteredMovimenti.length === 0">
                    <td colspan="7" class="text-center py-5 text-muted">
                      <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary opacity-50"></i>
                      Nessun movimento trovato per i criteri selezionati.
                      <div class="mt-2">
                        <button class="btn btn-sm btn-primary rounded-pill px-3" 
                                style="background-color: #6f42c1; border-color: #6f42c1;" 
                                (click)="openAddModal()">
                          <i class="bi bi-plus-lg me-1"></i> Aggiungi la prima spesa
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>

                <!-- FOOTER TOTALS -->
                <tfoot class="table-light fw-bold sticky-bottom" *ngIf="filteredMovimenti.length > 0">
                  <tr>
                    <td colspan="4" class="ps-4">
                      Totale spese filtrate ({{ filteredMovimenti.length }} voci):
                    </td>
                    <td class="text-end text-danger text-nowrap">
                      € {{ totalFilteredUscite | number:'1.2-2' }}
                    </td>
                    <td class="text-center small text-muted">
                      Saldati: € {{ totalFilteredPagato | number:'1.0-0' }} | Sospesi: € {{ totalFilteredInSospeso | number:'1.0-0' }}
                    </td>
                    <td class="pe-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: ANALYTICS & GRAFICI -->
      <div *ngIf="activeTab === 'analytics'" class="animate-fade-in">
        
        <!-- HEADER ACTIONS ANALYTICS -->
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h5 class="fw-bold mb-0" style="color: #6f42c1;">
              <i class="bi bi-graph-up me-2"></i> Dashboard Analitica & Grafici
            </h5>
            <small class="text-muted">Visualizza trend, ripartizioni e crea i tuoi grafici su misura</small>
          </div>
          <button class="btn btn-primary rounded-pill shadow-sm px-4 fw-medium" 
                  style="background-color: #6f42c1; border-color: #6f42c1;"
                  (click)="openCustomChartModal()">
            <i class="bi bi-plus-circle me-1"></i> + Crea Nuovo Grafico
          </button>
        </div>

        <!-- 1. GRAFICO BASE: SPESE VS RISPARMI -->
        <div class="card shadow-sm border-0 mb-4">
          <div class="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h6 class="fw-bold mb-0 text-body">
              <i class="bi bi-bar-chart-line-fill text-primary me-2"></i> Andamento Mese per Mese: Spese vs Risparmi
            </h6>
            <span class="badge bg-body-secondary text-body border px-3 py-1 rounded-pill">
              {{ mesi.length }} mesi registrati
            </span>
          </div>
          <div class="card-body">
            <div style="display: block; height: 340px; position: relative; width: 100%;" *ngIf="isBrowser && mesi.length > 0">
              <canvas baseChart [data]="barChartData" [options]="barChartOptions" [type]="'bar'"></canvas>
            </div>
            <div *ngIf="isBrowser && mesi.length === 0" class="text-center py-5 text-muted">
              Nessun dato di bilancio disponibile per generare il grafico.
            </div>
          </div>
        </div>

        <!-- 2. DUE GRAFICI AFFIANCATI: CATEGORIE & FLUSSO -->
        <div class="row g-4 mb-4">
          
          <!-- Ripartizione per Categoria (Doughnut) -->
          <div class="col-lg-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                <h6 class="fw-bold mb-0 text-body">
                  <i class="bi bi-pie-chart-fill text-success me-2"></i> Ripartizione Spese per Categoria
                </h6>
                <small class="text-muted">{{ selectedMonth ? selectedMonth.sheetName : 'Tutto lo storico' }}</small>
              </div>
              <div class="card-body">
                <div style="display: block; height: 300px; position: relative; width: 100%;" *ngIf="isBrowser && categorieChartData.labels?.length">
                  <canvas baseChart [data]="categorieChartData" [options]="pieChartOptions" [type]="'doughnut'"></canvas>
                </div>
                <div *ngIf="isBrowser && (!categorieChartData.labels || !categorieChartData.labels.length)" class="text-center py-5 text-muted">
                  Nessuna categoria trovata con importi positivi.
                </div>
              </div>
            </div>
          </div>

          <!-- Trend Flusso Entrate vs Spese (Line) -->
          <div class="col-lg-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                <h6 class="fw-bold mb-0 text-body">
                  <i class="bi bi-graph-up text-info me-2"></i> Trend Entrate vs Spese
                </h6>
                <small class="text-muted">Evoluzione storica</small>
              </div>
              <div class="card-body">
                <div style="display: block; height: 300px; position: relative; width: 100%;" *ngIf="isBrowser && mesi.length > 0">
                  <canvas baseChart [data]="trendChartData" [options]="lineChartOptions" [type]="'line'"></canvas>
                </div>
                <div *ngIf="isBrowser && mesi.length === 0" class="text-center py-5 text-muted">
                  Dati insufficienti per il trend.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. GRAFICI PERSONALIZZATI CREATI DALL'UTENTE (PERSISTENTI) -->
        <div class="card shadow-sm border-0 mb-4" *ngIf="customCharts.length > 0">
          <div class="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
            <h6 class="fw-bold mb-0" style="color: #6f42c1;">
              <i class="bi bi-stars me-2"></i> I tuoi Grafici Personalizzati (Salvati)
            </h6>
            <span class="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-3 py-1">
              {{ customCharts.length }} grafici salvati
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
                      <canvas *ngIf="cfg.chartType === 'bar'" baseChart [data]="getCustomChartData(cfg)" [options]="barChartOptions" [type]="'bar'"></canvas>
                      <canvas *ngIf="cfg.chartType === 'line'" baseChart [data]="getCustomChartData(cfg)" [options]="lineChartOptions" [type]="'line'"></canvas>
                      <canvas *ngIf="cfg.chartType === 'doughnut'" baseChart [data]="getCustomChartData(cfg)" [options]="pieChartOptions" [type]="'doughnut'"></canvas>
                      <canvas *ngIf="cfg.chartType === 'pie'" baseChart [data]="getCustomChartData(cfg)" [options]="pieChartOptions" [type]="'pie'"></canvas>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: RIEPILOGO ANNUALE MESI (SORTED NEWEST FIRST) -->
      <div *ngIf="activeTab === 'mesi'" class="animate-fade-in">
        <div class="card shadow-sm border-0 mb-4">
          <div class="card-header bg-transparent border-0 pt-4 pb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h5 class="fw-bold mb-0 text-body">
                <i class="bi bi-calendar3 text-primary me-2"></i> Riepilogo Completo Mese per Mese
              </h5>
              <small class="text-muted">Consulta e gestisci lo storico dei mesi registrati (dal più recente)</small>
            </div>
            <button class="btn btn-primary rounded-pill px-3" 
                    style="background-color: #6f42c1; border-color: #6f42c1;"
                    (click)="openAddMonthModal()">
              <i class="bi bi-plus-lg me-1"></i> Aggiungi Nuovo Mese
            </button>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive" style="height: 480px; max-height: 480px; overflow-y: auto;">
              <table class="table table-modern table-hover align-middle mb-0">
                <thead class="table-light sticky-top">
                  <tr>
                    <th class="ps-4">Periodo</th>
                    <th class="text-end">Stipendio / Entrate</th>
                    <th class="text-end">Spese Totali</th>
                    <th class="text-end">Risparmi / Margine</th>
                    <th class="text-end">Spese Casa</th>
                    <th>Note</th>
                    <th class="text-center pe-4">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of mesiSorted" (click)="selectMonth(m); activeTab = 'spese'" style="cursor: pointer;">
                    <td class="ps-4 fw-bold text-body">
                      <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-calendar-event text-primary"></i>
                        <span>{{ m.sheetName }}</span>
                        <span *ngIf="isMonthSelected(m)" class="badge bg-primary rounded-pill small">Attivo</span>
                      </div>
                    </td>
                    <td class="text-end fw-bold text-success">
                      € {{ (m.entrate || 0) | number:'1.2-2' }}
                    </td>
                    <td class="text-end fw-bold text-danger">
                      € {{ (m.totaleSpese || 0) | number:'1.2-2' }}
                    </td>
                    <td class="text-end fw-bold" [class.text-success]="(m.risparmiati || 0) >= 0" [class.text-danger]="(m.risparmiati || 0) < 0">
                      € {{ (m.risparmiati || 0) | number:'1.2-2' }}
                    </td>
                    <td class="text-end fw-medium text-secondary">
                      € {{ (m.speseCasa || 0) | number:'1.2-2' }}
                    </td>
                    <td class="text-muted small">
                      {{ m.note || '-' }}
                    </td>
                    <td class="text-center pe-4" (click)="$event.stopPropagation()">
                      <button class="btn btn-sm btn-link text-primary p-1 me-1" (click)="openEditMonthModal(m)" title="Modifica">
                        <i class="bi bi-pencil-square"></i>
                      </button>
                      <button class="btn btn-sm btn-link text-danger p-1" (click)="deleteMonth(m)" title="Elimina">
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="mesi.length === 0">
                    <td colspan="7" class="text-center py-5 text-muted">
                      Nessun mese registrato. Clicca su "+ Aggiungi Nuovo Mese" per iniziare.
                    </td>
                  </tr>
                </tbody>
                <tfoot class="table-light fw-bold sticky-bottom" *ngIf="mesi.length > 0">
                  <tr>
                    <td class="ps-4">Totale Storico ({{ mesi.length }} Mesi):</td>
                    <td class="text-end text-success">€ {{ totalAllEntrate | number:'1.2-2' }}</td>
                    <td class="text-end text-danger">€ {{ totalAllSpese | number:'1.2-2' }}</td>
                    <td class="text-end" [class.text-success]="totalAllRisparmi >= 0" [class.text-danger]="totalAllRisparmi < 0">
                      € {{ totalAllRisparmi | number:'1.2-2' }}
                    </td>
                    <td class="text-end text-secondary">€ {{ totalAllSpeseCasa | number:'1.2-2' }}</td>
                    <td colspan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- MODAL 1: AGGIUNGI / MODIFICA SPESA -->
    <div class="modal fade" id="movimentoModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 shadow-lg">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" style="color: #6f42c1;">
              <i class="bi" [class.bi-plus-circle]="!isEditing" [class.bi-pencil-square]="isEditing"></i>
              {{ isEditing ? 'Modifica Spesa' : 'Nuova Spesa' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-3">
            <div class="row g-3">
              <div class="col-6">
                <label class="form-label small fw-bold">Data *</label>
                <input type="date" class="form-control" [(ngModel)]="currentEditMov.data">
              </div>
              <div class="col-6">
                <label class="form-label small fw-bold">Conto *</label>
                <input type="text" class="form-control" list="contiSuggestions" [(ngModel)]="currentEditMov.conto" placeholder="Es. isybank">
                <datalist id="contiSuggestions">
                  <option value="isybank">
                  <option value="Revolut">
                  <option value="BBVA">
                  <option value="Contanti">
                </datalist>
              </div>

              <div class="col-12">
                <label class="form-label small fw-bold">Categoria</label>
                <div class="input-group">
                  <select class="form-select" [(ngModel)]="currentEditMov.categoria" (change)="onModalCategoryChange()">
                    <option *ngFor="let cat of availableCategories" [value]="cat">{{ cat }}</option>
                    <option value="__NEW__">+ Aggiungi nuova categoria...</option>
                  </select>
                </div>
                <div *ngIf="showNewCategoryInput" class="mt-2">
                  <input type="text" class="form-control form-control-sm" 
                         placeholder="Scrivi nome nuova categoria..." 
                         [(ngModel)]="newCustomCategoryName">
                </div>
              </div>

              <div class="col-8">
                <label class="form-label small fw-bold">Descrizione *</label>
                <input type="text" class="form-control" placeholder="Es. Supermercato, Benzina, ecc." [(ngModel)]="currentEditMov.descrizione">
              </div>
              <div class="col-4">
                <label class="form-label small fw-bold">Importo (€) *</label>
                <input type="number" step="0.01" class="form-control text-end" [(ngModel)]="currentEditMov.uscite">
              </div>

              <div class="col-12">
                <label class="form-label small fw-bold">Note aggiuntive</label>
                <input type="text" class="form-control" placeholder="Opzionale" [(ngModel)]="currentEditMov.note">
              </div>

              <div class="col-12">
                <div class="form-check form-switch mt-2">
                  <input class="form-check-input" type="checkbox" id="pagatoCheck" [(ngModel)]="currentEditMov.pagato">
                  <label class="form-check-label small fw-bold" for="pagatoCheck">Già Pagato / Saldato</label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer border-top-0 pt-0">
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-primary rounded-pill px-4" 
                    style="background-color: #6f42c1; border-color: #6f42c1;" 
                    (click)="saveMovimento()">
              Salva Spesa
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 2: AGGIUNGI / MODIFICA MESE -->
    <div class="modal fade" id="meseModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 shadow-lg">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" style="color: #6f42c1;">
              <i class="bi bi-calendar-check me-2"></i>
              {{ isEditingMonth ? 'Modifica Mese' : 'Nuovo Mese a Bilancio' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-3">
            <div class="row g-3">
              <div class="col-6">
                <label class="form-label small fw-bold">Mese *</label>
                <select class="form-select" [(ngModel)]="currentEditMese.mese" [disabled]="isEditingMonth">
                  <option *ngFor="let m of monthNames; let idx = index" [value]="idx + 1">{{ m }}</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label small fw-bold">Anno *</label>
                <input type="number" class="form-control" [(ngModel)]="currentEditMese.anno" [disabled]="isEditingMonth">
              </div>

              <div class="col-12">
                <label class="form-label small fw-bold">Nome / Etichetta Visualizzata</label>
                <input type="text" class="form-control" placeholder="Es. Ottobre 2026" [(ngModel)]="currentEditMese.sheetName">
              </div>

              <div class="col-6">
                <label class="form-label small fw-bold">Stipendio / Entrate Previste (€)</label>
                <input type="number" step="0.01" class="form-control text-end" [(ngModel)]="currentEditMese.entrate">
              </div>
              <div class="col-6">
                <label class="form-label small fw-bold">Spese Casa / Fisse (€)</label>
                <input type="number" step="0.01" class="form-control text-end" [(ngModel)]="currentEditMese.speseCasa">
              </div>

              <div class="col-12">
                <label class="form-label small fw-bold">Note o Obiettivi del Mese</label>
                <textarea class="form-control" rows="2" placeholder="Note per questo mese..." [(ngModel)]="currentEditMese.note"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer border-top-0 pt-0">
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-primary rounded-pill px-4" 
                    style="background-color: #6f42c1; border-color: #6f42c1;" 
                    (click)="saveMese()">
              Salva Mese
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 3: GESTIONE CATEGORIE -->
    <div class="modal fade" id="categoryModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 shadow-lg">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" style="color: #6f42c1;">
              <i class="bi bi-tags me-2"></i> Gestione Categorie Spesa
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-3">
            <div class="input-group mb-3">
              <input type="text" class="form-control" placeholder="Nome nuova categoria..." [(ngModel)]="newCustomCategoryName">
              <button class="btn btn-primary" style="background-color: #6f42c1; border-color: #6f42c1;" (click)="addCustomCategory()">
                + Aggiungi
              </button>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <span *ngFor="let cat of availableCategories" class="badge bg-body-secondary text-body border py-2 px-3 rounded-pill d-flex align-items-center gap-2">
                <i class="bi bi-tag-fill text-primary"></i> {{ cat }}
              </span>
            </div>
          </div>
          <div class="modal-footer border-top-0 pt-0">
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Chiudi</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 4: CREA GRAFICO PERSONALIZZATO -->
    <div class="modal fade" id="customChartModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 border-0 shadow-lg">
          <div class="modal-header border-bottom-0 pb-0">
            <h5 class="modal-title fw-bold" style="color: #6f42c1;">
              <i class="bi bi-magic me-2"></i> Crea Nuovo Grafico Personalizzato
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-3">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label small fw-bold">Titolo Grafico *</label>
                <input type="text" class="form-control" placeholder="Es. Andamento Spese Domiciliazioni" [(ngModel)]="newChartForm.title">
              </div>

              <div class="col-6">
                <label class="form-label small fw-bold">Tipo Grafico *</label>
                <select class="form-select" [(ngModel)]="newChartForm.chartType">
                  <option value="bar">A Barre (Bar)</option>
                  <option value="line">Lineare (Line)</option>
                  <option value="doughnut">A Ciambella (Doughnut)</option>
                  <option value="pie">A Torta (Pie)</option>
                </select>
              </div>

              <div class="col-6">
                <label class="form-label small fw-bold">Metrica Dati *</label>
                <select class="form-select" [(ngModel)]="newChartForm.metric">
                  <option value="totaleSpese">Spese Totali</option>
                  <option value="risparmiati">Risparmi / Margine</option>
                  <option value="entrate">Entrate / Stipendio</option>
                  <option value="category">Spese per Categoria Specifica</option>
                </select>
              </div>

              <div class="col-12" *ngIf="newChartForm.metric === 'category'">
                <label class="form-label small fw-bold">Seleziona Categoria</label>
                <select class="form-select" [(ngModel)]="newChartForm.categoryFilter">
                  <option *ngFor="let cat of availableCategories" [value]="cat">{{ cat }}</option>
                </select>
              </div>

              <div class="col-12">
                <label class="form-label small fw-bold">Colore Tema</label>
                <select class="form-select" [(ngModel)]="newChartForm.colorScheme">
                  <option value="purple">Viola (PagaReader Accent)</option>
                  <option value="blue">Blu Finanziario</option>
                  <option value="green">Verde Crescita</option>
                  <option value="amber">Ambra / Arancio</option>
                  <option value="rose">Rosa / Rosso Spesa</option>
                  <option value="teal">Smeraldo / Ciano</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer border-top-0 pt-0">
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-primary rounded-pill px-4" 
                    style="background-color: #6f42c1; border-color: #6f42c1;" 
                    (click)="saveCustomChart()">
              Genera e Salva Grafico
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .transition-all {
      transition: all 0.2s ease;
    }
  `]
})
export class MargineReadingComponent implements OnInit {
  private margineService = inject(MargineService);
  private customChartService = inject(CustomChartService);
  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  activeTab: 'spese' | 'analytics' | 'mesi' = 'spese';

  mesi: MargineMese[] = [];
  movimenti: MargineMovimento[] = [];
  selectedMonth: MargineMese | null = null;

  searchText = '';
  selectedConto = '';
  selectedCategoria = '';
  selectedStatus: 'all' | 'paid' | 'pending' = 'all';
  sortColumn = 'data';
  sortAsc = false;

  isUploading = false;
  alertMsg = '';
  alertError = false;

  // Quick inline add state
  quickData = new Date().toISOString().substring(0, 10);
  quickConto = 'isybank';
  quickCategoria = 'Spese Varie';
  quickDescrizione = '';
  quickUscite: number | null = null;

  // Movements modal state
  isEditing = false;
  currentEditMov: Partial<MargineMovimento> = {};
  showNewCategoryInput = false;
  newCustomCategoryName = '';
  movimentoModalInstance: any;

  // Month modal state
  isEditingMonth = false;
  currentEditMese: Partial<MargineMese> = {};
  meseModalInstance: any;
  categoryModalInstance: any;

  // Custom charts modal state
  customChartModalInstance: any;
  customCharts: CustomChartConfig[] = [];
  newChartForm: any = {
    title: '',
    chartType: 'bar',
    metric: 'totaleSpese',
    categoryFilter: 'Casa & Utenze',
    colorScheme: 'purple'
  };

  monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  standardCategories = [
    'Domiciliazioni', 'Casa & Utenze', 'Auto & Trasporti', 'Salute & Benessere',
    'Viaggi & Vacanze', 'Klarna / PayPal', 'Shopping & Svago', 'Spese Varie'
  ];
  userCustomCategories: string[] = [];

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Charts data
  barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  categorieChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
  trendChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: € ${Number(context.raw).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (val) => `€ ${Number(val).toLocaleString('it-IT')}` }
      }
    }
  };

  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: € ${Number(context.raw).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    }
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: € ${Number(context.raw).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (val) => `€ ${Number(val).toLocaleString('it-IT')}` }
      }
    }
  };

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.loadSavedCategories();
      this.loadCustomCharts();
      this.fetchData();
    }
  }

  get mesiSorted(): MargineMese[] {
    return [...this.mesi].sort((a, b) => {
      const keyA = (a.anno || 0) * 100 + (a.mese || 0);
      const keyB = (b.anno || 0) * 100 + (b.mese || 0);
      return keyB - keyA; // Newest first!
    });
  }

  fetchData() {
    this.margineService.getMesi().subscribe({
      next: (mList) => {
        this.mesi = mList;
        if (this.mesiSorted.length > 0 && !this.selectedMonth) {
          this.selectedMonth = this.mesiSorted[0]; // Newest month selected by default!
        }
        this.updateCharts();
        this.fetchMovimenti();
      },
      error: (err) => console.error(err)
    });
  }

  fetchMovimenti() {
    const anno = this.selectedMonth ? this.selectedMonth.anno : undefined;
    const mese = this.selectedMonth ? this.selectedMonth.mese : undefined;
    this.margineService.getMovimenti(anno, mese).subscribe({
      next: (list) => {
        this.movimenti = list;
        this.updateCharts();
      },
      error: (err) => console.error(err)
    });
  }

  selectMonth(m: MargineMese | null) {
    this.selectedMonth = m;
    this.fetchMovimenti();
  }

  isMonthSelected(m: MargineMese): boolean {
    return this.selectedMonth?.anno === m.anno && this.selectedMonth?.mese === m.mese;
  }

  resetFilters() {
    this.searchText = '';
    this.selectedConto = '';
    this.selectedCategoria = '';
    this.selectedStatus = 'all';
  }

  // --- QUICK INLINE ADD ---
  quickAdd() {
    if (!this.quickDescrizione.trim() || this.quickUscite == null || this.quickUscite <= 0) {
      alert('Inserisci descrizione e importo valido.');
      return;
    }

    const d = new Date(this.quickData);
    const anno = !isNaN(d.getFullYear()) ? d.getFullYear() : (this.selectedMonth ? this.selectedMonth.anno : new Date().getFullYear());
    const mese = !isNaN(d.getMonth()) ? d.getMonth() + 1 : (this.selectedMonth ? this.selectedMonth.mese : new Date().getMonth() + 1);

    const mov: Partial<MargineMovimento> = {
      data: this.quickData,
      conto: this.quickConto || 'isybank',
      categoria: this.quickCategoria || 'Spese Varie',
      descrizione: this.quickDescrizione.trim(),
      uscite: Math.abs(this.quickUscite),
      anno,
      mese,
      pagato: true
    };

    this.margineService.createMovimento(mov).subscribe({
      next: () => {
        this.quickDescrizione = '';
        this.quickUscite = null;
        this.fetchData();
      },
      error: (err) => console.error(err)
    });
  }

  // --- MONTH CRUD ---
  openAddMonthModal() {
    this.isEditingMonth = false;
    const now = new Date();
    this.currentEditMese = {
      anno: now.getFullYear(),
      mese: now.getMonth() + 1,
      sheetName: `${this.monthNames[now.getMonth()]} ${now.getFullYear()}`,
      entrate: 0.0,
      speseCasa: 0.0,
      note: ''
    };
    this.showMeseModal();
  }

  openEditMonthModal(target?: MargineMese) {
    const m = target || this.selectedMonth;
    if (!m) return;
    this.isEditingMonth = true;
    this.currentEditMese = { ...m };
    this.showMeseModal();
  }

  private showMeseModal() {
    if (!this.meseModalInstance && typeof bootstrap !== 'undefined') {
      const el = document.getElementById('meseModal');
      if (el) this.meseModalInstance = new bootstrap.Modal(el);
    }
    this.meseModalInstance?.show();
  }

  saveMese() {
    if (!this.currentEditMese.anno || !this.currentEditMese.mese) {
      alert('Anno e Mese sono obbligatori.');
      return;
    }

    if (this.isEditingMonth && this.currentEditMese.id) {
      this.margineService.updateMese(this.currentEditMese.id, this.currentEditMese).subscribe({
        next: (updated) => {
          this.meseModalInstance?.hide();
          this.alertMsg = `Mese ${updated.sheetName} aggiornato con successo!`;
          this.alertError = false;
          this.selectedMonth = updated;
          this.fetchData();
        },
        error: (err) => {
          this.alertMsg = err.error || 'Errore durante la modifica del mese';
          this.alertError = true;
        }
      });
    } else {
      this.margineService.createMese(this.currentEditMese).subscribe({
        next: (created) => {
          this.meseModalInstance?.hide();
          this.alertMsg = `Nuovo mese ${created.sheetName} creato con successo!`;
          this.alertError = false;
          this.selectedMonth = created;
          this.fetchData();
        },
        error: (err) => {
          this.alertMsg = err.error || 'Errore durante la creazione del mese';
          this.alertError = true;
        }
      });
    }
  }

  deleteMonth(m: MargineMese) {
    if (confirm(`Sei sicuro di voler eliminare il mese "${m.sheetName}" e tutte le spese associate?`)) {
      this.margineService.deleteMese(m.id!).subscribe({
        next: () => {
          this.alertMsg = `Mese "${m.sheetName}" rimosso con successo.`;
          this.alertError = false;
          if (this.selectedMonth?.id === m.id) {
            this.selectedMonth = null;
          }
          this.fetchData();
        },
        error: (err) => console.error(err)
      });
    }
  }

  // --- MOVIMENTO CRUD ---
  openAddModal() {
    this.isEditing = false;
    this.showNewCategoryInput = false;
    this.newCustomCategoryName = '';
    const now = new Date();
    this.currentEditMov = {
      data: now.toISOString().substring(0, 10),
      conto: 'isybank',
      descrizione: '',
      uscite: 0.0,
      categoria: 'Spese Varie',
      note: '',
      pagato: true,
      anno: this.selectedMonth ? this.selectedMonth.anno : now.getFullYear(),
      mese: this.selectedMonth ? this.selectedMonth.mese : now.getMonth() + 1
    };
    this.showMovimentoModal();
  }

  openEditModal(mov: MargineMovimento) {
    this.isEditing = true;
    this.showNewCategoryInput = false;
    this.newCustomCategoryName = '';
    this.currentEditMov = { ...mov };
    this.showMovimentoModal();
  }

  private showMovimentoModal() {
    if (!this.movimentoModalInstance && typeof bootstrap !== 'undefined') {
      const el = document.getElementById('movimentoModal');
      if (el) this.movimentoModalInstance = new bootstrap.Modal(el);
    }
    this.movimentoModalInstance?.show();
  }

  onModalCategoryChange() {
    if (this.currentEditMov.categoria === '__NEW__') {
      this.showNewCategoryInput = true;
      this.currentEditMov.categoria = '';
    } else {
      this.showNewCategoryInput = false;
    }
  }

  saveMovimento() {
    if (this.showNewCategoryInput && this.newCustomCategoryName.trim()) {
      const cat = this.newCustomCategoryName.trim();
      this.currentEditMov.categoria = cat;
      this.registerCustomCategory(cat);
    }

    if (!this.currentEditMov.descrizione || this.currentEditMov.uscite == null) {
      alert('Inserisci descrizione e importo.');
      return;
    }

    if (this.isEditing && this.currentEditMov.id) {
      this.margineService.updateMovimento(this.currentEditMov.id, this.currentEditMov).subscribe({
        next: () => {
          this.movimentoModalInstance?.hide();
          this.fetchData();
        },
        error: (err) => console.error(err)
      });
    } else {
      this.margineService.createMovimento(this.currentEditMov).subscribe({
        next: () => {
          this.movimentoModalInstance?.hide();
          this.fetchData();
        },
        error: (err) => console.error(err)
      });
    }
  }

  togglePagato(m: MargineMovimento) {
    m.pagato = !m.pagato;
    this.margineService.updateMovimento(m.id!, m).subscribe({
      next: () => this.fetchData(),
      error: (err) => {
        m.pagato = !m.pagato;
        console.error(err);
      }
    });
  }

  deleteRow(id: number) {
    if (confirm('Sei sicuro di voler eliminare questa spesa?')) {
      this.margineService.deleteMovimento(id).subscribe({
        next: () => this.fetchData(),
        error: (err) => console.error(err)
      });
    }
  }

  // --- CATEGORIES MANAGEMENT ---
  openManageCategoriesModal() {
    if (!this.categoryModalInstance && typeof bootstrap !== 'undefined') {
      const el = document.getElementById('categoryModal');
      if (el) this.categoryModalInstance = new bootstrap.Modal(el);
    }
    this.categoryModalInstance?.show();
  }

  addCustomCategory() {
    if (!this.newCustomCategoryName.trim()) return;
    this.registerCustomCategory(this.newCustomCategoryName.trim());
    this.newCustomCategoryName = '';
  }

  private registerCustomCategory(cat: string) {
    if (!this.userCustomCategories.includes(cat) && !this.standardCategories.includes(cat)) {
      this.userCustomCategories.push(cat);
      if (this.isBrowser) {
        localStorage.setItem('pagareader_custom_categories', JSON.stringify(this.userCustomCategories));
      }
    }
  }

  private loadSavedCategories() {
    try {
      const raw = localStorage.getItem('pagareader_custom_categories');
      if (raw) this.userCustomCategories = JSON.parse(raw);
    } catch (e) {}
  }

  get availableCategories(): string[] {
    const set = new Set<string>([...this.standardCategories, ...this.userCustomCategories]);
    this.movimenti.forEach(m => { if (m.categoria) set.add(m.categoria); });
    return Array.from(set).sort();
  }

  // --- CUSTOM CHARTS BUILDER ---
  loadCustomCharts() {
    this.customCharts = this.customChartService.getCharts('margine');
  }

  openCustomChartModal() {
    this.newChartForm = {
      title: '',
      chartType: 'bar',
      metric: 'totaleSpese',
      categoryFilter: this.availableCategories[0] || 'Casa & Utenze',
      colorScheme: 'purple'
    };
    if (!this.customChartModalInstance && typeof bootstrap !== 'undefined') {
      const el = document.getElementById('customChartModal');
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
      sourceModule: 'margine',
      chartType: this.newChartForm.chartType,
      metric: this.newChartForm.metric,
      categoryFilter: this.newChartForm.metric === 'category' ? this.newChartForm.categoryFilter : undefined,
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
    const labels = this.mesi.map(m => m.sheetName);
    let data: number[] = [];
    let bg = 'rgba(111, 66, 193, 0.7)';
    let border = '#6f42c1';

    if (cfg.colorScheme === 'blue') { bg = 'rgba(13, 110, 253, 0.7)'; border = '#0d6efd'; }
    else if (cfg.colorScheme === 'green') { bg = 'rgba(25, 135, 84, 0.7)'; border = '#198754'; }
    else if (cfg.colorScheme === 'amber') { bg = 'rgba(255, 193, 7, 0.7)'; border = '#ffc107'; }
    else if (cfg.colorScheme === 'rose') { bg = 'rgba(220, 53, 69, 0.7)'; border = '#dc3545'; }
    else if (cfg.colorScheme === 'teal') { bg = 'rgba(32, 201, 151, 0.7)'; border = '#20c997'; }

    if (cfg.metric === 'totaleSpese') {
      data = this.mesi.map(m => m.totaleSpese || 0);
    } else if (cfg.metric === 'risparmiati') {
      data = this.mesi.map(m => m.risparmiati || 0);
    } else if (cfg.metric === 'entrate') {
      data = this.mesi.map(m => m.entrate || 0);
    } else if (cfg.metric === 'category' && cfg.categoryFilter) {
      const cat = cfg.categoryFilter.toLowerCase();
      data = this.mesi.map(m => {
        return this.movimenti
          .filter(mov => mov.anno === m.anno && mov.mese === m.mese && (mov.categoria || '').toLowerCase() === cat)
          .reduce((sum, mov) => sum + (mov.uscite || 0), 0);
      });
    }

    return {
      labels,
      datasets: [
        {
          data,
          label: cfg.title,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1.5,
          borderRadius: 4,
          fill: cfg.chartType === 'line'
        }
      ]
    };
  }

  // --- EXCEL FALLBACK IMPORT ---
  onExcelSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploading = true;
    this.alertMsg = '';

    this.margineService.uploadExcel(file).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.alertError = false;
        this.alertMsg = `Bilancio importato: ${res.mesiCount} mesi e ${res.movimentiCount} movimenti digitalizzati!`;
        this.fetchData();
        if (event.target) event.target.value = '';
      },
      error: (err) => {
        this.isUploading = false;
        this.alertError = true;
        this.alertMsg = err.error?.message || 'Errore importazione file.';
        if (event.target) event.target.value = '';
      }
    });
  }

  // --- FILTERED DATA COMPUTATION ---
  get filteredMovimenti(): MargineMovimento[] {
    let list = this.movimenti;

    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      list = list.filter(m =>
        m.descrizione.toLowerCase().includes(q) ||
        (m.note && m.note.toLowerCase().includes(q)) ||
        m.conto.toLowerCase().includes(q)
      );
    }

    if (this.selectedConto) {
      list = list.filter(m => m.conto.toLowerCase() === this.selectedConto.toLowerCase());
    }

    if (this.selectedCategoria) {
      list = list.filter(m => (m.categoria || '').toLowerCase() === this.selectedCategoria.toLowerCase());
    }

    if (this.selectedStatus === 'paid') {
      list = list.filter(m => m.pagato);
    } else if (this.selectedStatus === 'pending') {
      list = list.filter(m => !m.pagato);
    }

    return list.slice().sort((a, b) => {
      let va: any = a[this.sortColumn as keyof MargineMovimento];
      let vb: any = b[this.sortColumn as keyof MargineMovimento];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (va < vb) return this.sortAsc ? -1 : 1;
      if (va > vb) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = column;
      this.sortAsc = true;
    }
  }

  getSortIcon(col: string): string {
    if (this.sortColumn !== col) return 'bi-arrow-down-up text-muted opacity-50';
    return this.sortAsc ? 'bi-sort-up text-primary' : 'bi-sort-down text-primary';
  }

  get currentTotaleSpese(): number {
    if (this.selectedMonth) return this.selectedMonth.totaleSpese || 0;
    return this.mesi.reduce((acc, m) => acc + (m.totaleSpese || 0), 0);
  }

  get currentEntrate(): number {
    if (this.selectedMonth) return this.selectedMonth.entrate || 0;
    return this.mesi.reduce((acc, m) => acc + (m.entrate || 0), 0);
  }

  get currentRisparmiati(): number {
    if (this.selectedMonth) return this.selectedMonth.risparmiati || 0;
    return this.mesi.reduce((acc, m) => acc + (m.risparmiati || 0), 0);
  }

  get savingRate(): number {
    if (this.currentEntrate > 0) {
      return (this.currentRisparmiati / this.currentEntrate) * 100.0;
    }
    return 0;
  }

  get currentDaPagare(): number {
    return this.filteredMovimenti.filter(m => !m.pagato).reduce((acc, m) => acc + (m.uscite || 0), 0);
  }

  get unconfirmedCount(): number {
    return this.filteredMovimenti.filter(m => !m.pagato).length;
  }

  get totalFilteredUscite(): number {
    return this.filteredMovimenti.reduce((acc, m) => acc + (m.uscite || 0), 0);
  }

  get totalFilteredPagato(): number {
    return this.filteredMovimenti.filter(m => m.pagato).reduce((acc, m) => acc + (m.uscite || 0), 0);
  }

  get totalFilteredInSospeso(): number {
    return this.filteredMovimenti.filter(m => !m.pagato).reduce((acc, m) => acc + (m.uscite || 0), 0);
  }

  get totalAllEntrate(): number {
    return this.mesi.reduce((sum, m) => sum + (m.entrate || 0), 0);
  }

  get totalAllSpese(): number {
    return this.mesi.reduce((sum, m) => sum + (m.totaleSpese || 0), 0);
  }

  get totalAllRisparmi(): number {
    return this.mesi.reduce((sum, m) => sum + (m.risparmiati || 0), 0);
  }

  get totalAllSpeseCasa(): number {
    return this.mesi.reduce((sum, m) => sum + (m.speseCasa || 0), 0);
  }

  get contiList(): string[] {
    const set = new Set<string>();
    this.movimenti.forEach(m => { if (m.conto) set.add(m.conto); });
    return Array.from(set).sort();
  }

  get categorieList(): string[] {
    const set = new Set<string>();
    this.movimenti.forEach(m => { if (m.categoria) set.add(m.categoria); });
    return Array.from(set).sort();
  }

  getContoBadgeClass(conto: string): string {
    const c = (conto || '').toLowerCase();
    if (c.includes('isybank')) return 'bg-info bg-opacity-10 text-info border border-info border-opacity-25';
    if (c.includes('revolut')) return 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25';
    if (c.includes('bbva')) return 'bg-dark bg-opacity-10 text-body border';
    if (c.includes('contanti')) return 'bg-success bg-opacity-10 text-success border border-success border-opacity-25';
    return 'bg-secondary bg-opacity-10 text-secondary border';
  }

  private updateCharts() {
    // 1. Spese vs Risparmi Bar Chart
    this.barChartData = {
      labels: this.mesi.map(m => m.sheetName),
      datasets: [
        {
          data: this.mesi.map(m => m.totaleSpese ?? 0),
          label: 'Spese Totali (€)',
          backgroundColor: 'rgba(220, 53, 69, 0.75)',
          borderColor: '#dc3545',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          data: this.mesi.map(m => m.risparmiati ?? 0),
          label: 'Risparmi / Margine (€)',
          backgroundColor: 'rgba(40, 167, 69, 0.75)',
          borderColor: '#28a745',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    };

    // 2. Categorie Doughnut Chart
    const catMap = new Map<string, number>();
    this.filteredMovimenti.forEach(m => {
      const cat = m.categoria || 'Spese Varie';
      catMap.set(cat, (catMap.get(cat) || 0) + (m.uscite || 0));
    });

    const catLabels = Array.from(catMap.keys());
    const catValues = Array.from(catMap.values());
    const palette = [
      '#6f42c1', '#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0',
      '#fd7e14', '#20c997', '#6610f2', '#d63384', '#6c757d'
    ];

    this.categorieChartData = {
      labels: catLabels,
      datasets: [
        {
          data: catValues,
          backgroundColor: palette.slice(0, catLabels.length),
          borderWidth: 1
        }
      ]
    };

    // 3. Trend Flusso Entrate vs Spese
    this.trendChartData = {
      labels: this.mesi.map(m => m.sheetName),
      datasets: [
        {
          data: this.mesi.map(m => m.entrate ?? 0),
          label: 'Entrate (€)',
          borderColor: '#198754',
          backgroundColor: 'rgba(25, 135, 84, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          data: this.mesi.map(m => m.totaleSpese ?? 0),
          label: 'Spese (€)',
          borderColor: '#dc3545',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderDash: [4, 4]
        }
      ]
    };

    if (this.chart) {
      this.chart.update();
    }
  }
}
