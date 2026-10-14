import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { MargineService } from '../../services/margine/margine.service';
import { MargineMese, MargineMovimento } from '../../models/margine/margine.model';

declare var bootstrap: any;

@Component({
  selector: 'app-margine-reading',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in flex-wrap gap-2">
      <div>
        <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
          <h2 class="fw-bold mb-0" style="color: #6f42c1;">
            <i class="bi bi-wallet2 me-2"></i> MargineReading
          </h2>
          <span class="badge bg-purple bg-opacity-10 text-purple border border-purple-subtle fs-6 py-2 px-3 rounded-pill d-inline-flex align-items-center" style="color: #6f42c1; background-color: rgba(111, 66, 193, 0.1);">
            <i class="bi bi-shield-check me-2"></i> Gestione Bilancio & Risparmio Personale
          </span>
        </div>
        <p class="text-muted mb-0">Digitalizzazione completa di entrate, uscite, domiciliazioni, spese condivise e marginalità mensile.</p>
      </div>

      <div class="d-flex gap-2 flex-wrap">
        <input type="file" id="budgetExcelUpload" accept=".xlsx, .xls" class="d-none" (change)="onExcelSelected($event)">
        <label for="budgetExcelUpload" class="btn btn-outline-primary rounded-pill shadow-sm px-3 m-0 d-flex align-items-center" style="cursor: pointer; border-color: #6f42c1; color: #6f42c1;">
          <i class="bi bi-file-earmark-excel me-2"></i>
          <span *ngIf="!isUploading">Importa Bilancio Excel</span>
          <span *ngIf="isUploading">
            <span class="spinner-border spinner-border-sm me-1"></span> Importazione...
          </span>
        </label>
        <button class="btn btn-outline-secondary rounded-pill shadow-sm px-3" (click)="exportBackup()" [disabled]="movimenti.length === 0" title="Scarica backup JSON">
          <i class="bi bi-download me-1"></i> Backup
        </button>
        <button class="btn btn-primary rounded-pill shadow-sm px-4" style="background-color: #6f42c1; border-color: #6f42c1;" (click)="openAddModal()">
          <i class="bi bi-plus-lg me-1"></i> Nuova Spesa
        </button>
      </div>
    </div>

    <!-- Alert Message -->
    <div *ngIf="alertMsg" class="alert shadow-sm mb-4 animate-fade-in d-flex align-items-center justify-content-between"
         [ngClass]="alertError ? 'alert-danger' : 'alert-success'">
      <div class="d-flex align-items-center">
        <i class="bi me-2 fs-5" [ngClass]="alertError ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'"></i>
        <span>{{ alertMsg }}</span>
      </div>
      <button type="button" class="btn-close ms-3" (click)="alertMsg = ''" aria-label="Close"></button>
    </div>

    <!-- MONTH SELECTOR TABS -->
    <div class="card shadow-sm border-0 mb-4 p-2">
      <div class="d-flex align-items-center gap-2 overflow-auto py-1 px-2" style="white-space: nowrap;">
        <span class="text-muted small fw-bold text-uppercase me-2"><i class="bi bi-calendar3"></i> Periodo:</span>
        <button class="btn btn-sm rounded-pill px-3"
                [ngClass]="selectedMonth === null ? 'btn-primary' : 'btn-outline-secondary'"
                style="border-color: #6f42c1; background-color: selectedMonth === null ? '#6f42c1' : 'transparent';"
                (click)="selectMonth(null)">
          Tutti i Mesi (Annuale)
        </button>
        @for (m of mesi; track m.id) {
          <button class="btn btn-sm rounded-pill px-3"
                  [ngClass]="isMonthSelected(m) ? 'btn-primary' : 'btn-outline-secondary'"
                  (click)="selectMonth(m)">
            {{ m.sheetName }}
            <span class="badge rounded-pill ms-1"
                  [ngClass]="m.risparmiati >= 0 ? 'bg-success' : 'bg-danger'">
              € {{ m.risparmiati | number:'1.0-0' }}
            </span>
          </button>
        }
      </div>
    </div>

    <!-- KPI SUMMARY CARDS -->
    <div class="row mb-4 g-3">
      <div class="col-6 col-lg-3 animate-fade-in">
        <div class="card h-100 shadow-sm border-start border-4 border-danger p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Totale Spese</h6>
                <h3 class="fw-bold mb-0 text-danger">€ {{ currentTotaleSpese | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-danger bg-opacity-10 p-2 rounded-circle text-danger">
                <i class="bi bi-cash-stack fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">
              {{ filteredMovimenti.length }} uscite registrate
            </small>
          </div>
        </div>
      </div>

      <div class="col-6 col-lg-3 animate-fade-in delay-1">
        <div class="card h-100 shadow-sm border-start border-4 border-primary p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Entrate / Stipendio</h6>
                <h3 class="fw-bold mb-0 text-primary">€ {{ currentEntrate | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-primary bg-opacity-10 p-2 rounded-circle text-primary">
                <i class="bi bi-wallet-fill fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">Budget mensile disponibile</small>
          </div>
        </div>
      </div>

      <div class="col-6 col-lg-3 animate-fade-in delay-2">
        <div class="card h-100 shadow-sm border-start border-4 p-2"
             [ngClass]="currentRisparmiati >= 0 ? 'border-success' : 'border-danger'">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Margine / Risparmi</h6>
                <h3 class="fw-bold mb-0" [ngClass]="currentRisparmiati >= 0 ? 'text-success' : 'text-danger'">
                  € {{ currentRisparmiati | number:'1.2-2' }}
                </h3>
              </div>
              <div class="p-2 rounded-circle"
                   [ngClass]="currentRisparmiati >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'">
                <i class="bi fs-4" [ngClass]="currentRisparmiati >= 0 ? 'bi-piggy-bank' : 'bi-exclamation-triangle'"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">
              Tasso di Risparmio: <strong>{{ savingRate | number:'1.1-1' }}%</strong>
            </small>
          </div>
        </div>
      </div>

      <div class="col-6 col-lg-3 animate-fade-in delay-3">
        <div class="card h-100 shadow-sm border-start border-4 border-warning p-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2 text-uppercase fw-bold letter-spacing-1">Da Pagare / In Sospeso</h6>
                <h3 class="fw-bold mb-0 text-warning">€ {{ currentDaPagare | number:'1.2-2' }}</h3>
              </div>
              <div class="bg-warning bg-opacity-10 p-2 rounded-circle text-warning">
                <i class="bi bi-clock-history fs-4"></i>
              </div>
            </div>
            <small class="text-muted mt-2 d-block" style="font-size: 0.75rem;">
              {{ unconfirmedCount }} voci non ancora saldate
            </small>
          </div>
        </div>
      </div>
    </div>

    <!-- CHART: ANDAMENTO MENSILE SPESE VS RISPARMI -->
    <div class="card shadow-sm border-0 mb-4 animate-fade-in">
      <div class="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h5 class="fw-bold mb-0" style="color: #6f42c1;">
          <i class="bi bi-bar-chart-line-fill me-2"></i> Andamento Mese per Mese: Spese vs Risparmi
        </h5>
        <div class="text-muted small">
          Tutti i 13 mesi estratti dal bilancio
        </div>
      </div>
      <div class="card-body">
        <div style="height: 320px;" *ngIf="isBrowser">
          <canvas baseChart [data]="barChartData" [options]="barChartOptions" [type]="'bar'"></canvas>
        </div>
      </div>
    </div>

    <!-- DATA TABLE: SPESE & MOVIMENTI -->
    <div class="card shadow-sm border-0 animate-fade-in">
      <div class="card-header bg-transparent border-0 pt-3 pb-3">
        <div class="row g-2 align-items-center">
          <div class="col-md-4">
            <div class="input-group">
              <span class="input-group-text bg-body border-end-0"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control border-start-0" placeholder="Cerca descrizione, note..." [(ngModel)]="searchText">
            </div>
          </div>
          <div class="col-md-3">
            <select class="form-select" [(ngModel)]="selectedConto">
              <option value="">Tutti i Conti ({{ contiList.length }})</option>
              @for (c of contiList; track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
          </div>
          <div class="col-md-3">
            <select class="form-select" [(ngModel)]="selectedCategoria">
              <option value="">Tutte le Categorie ({{ categorieList.length }})</option>
              @for (cat of categorieList; track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>
          <div class="col-md-2 text-end">
            <span class="badge bg-secondary bg-opacity-10 text-secondary border p-2">
              {{ filteredMovimenti.length }} righe
            </span>
          </div>
        </div>
      </div>

      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light text-secondary">
              <tr>
                <th class="ps-4" (click)="sort('data')" style="cursor: pointer;">
                  Data <i class="bi" [ngClass]="getSortIcon('data')"></i>
                </th>
                <th>Conto</th>
                <th (click)="sort('descrizione')" style="cursor: pointer;">
                  Descrizione <i class="bi" [ngClass]="getSortIcon('descrizione')"></i>
                </th>
                <th (click)="sort('uscite')" style="cursor: pointer;">
                  Uscite (€) <i class="bi" [ngClass]="getSortIcon('uscite')"></i>
                </th>
                <th>Categoria</th>
                <th>Note</th>
                <th class="text-center">Pagato</th>
                <th class="text-end pe-4">Azioni</th>
              </tr>
            </thead>
            <tbody>
              @for (m of filteredMovimenti; track m.id) {
                <tr [class.table-light]="!m.pagato">
                  <td class="ps-4 fw-medium">{{ m.data }}</td>
                  <td>
                    <span class="badge" [ngClass]="getContoBadgeClass(m.conto)">
                      {{ m.conto }}
                    </span>
                  </td>
                  <td class="fw-bold">{{ m.descrizione }}</td>
                  <td class="fw-bold text-danger">€ {{ m.uscite | number:'1.2-2' }}</td>
                  <td>
                    <span class="badge bg-secondary bg-opacity-10 text-secondary border">
                      {{ m.categoria || 'Varie' }}
                    </span>
                  </td>
                  <td class="text-muted small">{{ m.note || '-' }}</td>
                  <td class="text-center">
                    <button class="btn btn-sm rounded-pill px-3 py-1"
                            [ngClass]="m.pagato ? 'btn-success' : 'btn-outline-warning'"
                            (click)="togglePagato(m)">
                      <i class="bi" [ngClass]="m.pagato ? 'bi-check-circle-fill me-1' : 'bi-hourglass-split me-1'"></i>
                      {{ m.pagato ? 'Pagato' : 'In Sospeso' }}
                    </button>
                  </td>
                  <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary rounded-circle me-1" style="width:32px; height:32px; padding:0" (click)="openEditModal(m)" title="Modifica">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle" style="width:32px; height:32px; padding:0" (click)="deleteRow(m.id!)" title="Elimina">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="text-center py-5 text-muted">
                    <i class="bi bi-folder2-open fs-1 d-block mb-3 text-secondary opacity-50"></i>
                    Nessuna spesa trovata per i filtri selezionati.
                  </td>
                </tr>
              }
            </tbody>
            <tfoot class="table-light fw-bold" *ngIf="filteredMovimenti.length > 0">
              <tr>
                <td colspan="3" class="ps-4">Totale Uscite Filtrate:</td>
                <td class="text-danger fs-6">€ {{ totalFilteredUscite | number:'1.2-2' }}</td>
                <td colspan="2" class="text-muted small">
                  Saldate: € {{ totalFilteredPagato | number:'1.2-2' }} | In Sospeso: € {{ totalFilteredInSospeso | number:'1.2-2' }}
                </td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- ADD / EDIT MODAL -->
    <div class="modal fade" id="movimentoModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-body">
          <div class="modal-header border-bottom-0" style="background-color: rgba(111, 66, 193, 0.1); color: #6f42c1;">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-pencil-square me-2"></i> {{ isEditing ? 'Modifica Spesa' : 'Nuova Spesa' }}
            </h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4">
            <div class="mb-3">
              <label class="form-label small fw-bold">Data Spesa</label>
              <input type="date" class="form-control" [(ngModel)]="currentEditMov.data">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Conto / Carta</label>
              <input type="text" class="form-control" placeholder="Es. isybank, Revolut, BBVA..." [(ngModel)]="currentEditMov.conto">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Descrizione</label>
              <input type="text" class="form-control" placeholder="Es. Rata macchina, Spesa, Volo..." [(ngModel)]="currentEditMov.descrizione">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Importo Uscita (€)</label>
              <input type="number" step="0.01" class="form-control" placeholder="0.00" [(ngModel)]="currentEditMov.uscite">
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Categoria</label>
              <select class="form-select" [(ngModel)]="currentEditMov.categoria">
                <option value="Domiciliazioni">Domiciliazioni</option>
                <option value="Casa & Utenze">Casa & Utenze</option>
                <option value="Auto & Trasporti">Auto & Trasporti</option>
                <option value="Salute & Benessere">Salute & Benessere</option>
                <option value="Viaggi & Vacanze">Viaggi & Vacanze</option>
                <option value="Shopping & Svago">Shopping & Svago</option>
                <option value="Klarna / PayPal">Klarna / PayPal</option>
                <option value="Spese Varie">Spese Varie</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Note</label>
              <input type="text" class="form-control" placeholder="Note aggiuntive..." [(ngModel)]="currentEditMov.note">
            </div>
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="pagatoCheck" [(ngModel)]="currentEditMov.pagato">
              <label class="form-check-label" for="pagatoCheck">Già Pagato / Saldato</label>
            </div>
          </div>
          <div class="modal-footer border-top-0">
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-primary rounded-pill px-4" style="background-color: #6f42c1; border-color: #6f42c1;" (click)="saveMovimento()">
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MargineReadingComponent implements OnInit {
  private margineService = inject(MargineService);
  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  mesi: MargineMese[] = [];
  movimenti: MargineMovimento[] = [];
  selectedMonth: MargineMese | null = null;

  searchText = '';
  selectedConto = '';
  selectedCategoria = '';
  sortColumn = 'data';
  sortAsc = false;

  isUploading = false;
  alertMsg = '';
  alertError = false;

  isEditing = false;
  currentEditMov: Partial<MargineMovimento> = {};
  modalInstance: any;

  // Chart configuration
  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Spese Totali (€)',
        backgroundColor: 'rgba(220, 53, 69, 0.7)',
        borderColor: '#dc3545',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        data: [],
        label: 'Risparmi / Margine (€)',
        backgroundColor: 'rgba(40, 167, 69, 0.7)',
        borderColor: '#28a745',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

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
        ticks: {
          callback: (val) => `€ ${Number(val).toLocaleString('it-IT')}`
        }
      }
    }
  };

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.margineService.getMesi().subscribe({
      next: (mList) => {
        this.mesi = mList;
        this.updateChart();
        if (this.mesi.length > 0 && !this.selectedMonth) {
          // Select latest month by default
          this.selectedMonth = this.mesi[this.mesi.length - 1];
        }
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

  onExcelSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploading = true;
    this.alertMsg = '';

    this.margineService.uploadExcel(file).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.alertError = false;
        this.alertMsg = `Bilancio importato con successo: ${res.mesiCount} mesi e ${res.movimentiCount} movimenti digitalizzati!`;
        this.fetchData();
        if (event.target) event.target.value = '';
      },
      error: (err) => {
        this.isUploading = false;
        this.alertError = true;
        this.alertMsg = err.error?.message || 'Errore durante l\'importazione del file Excel.';
        if (event.target) event.target.value = '';
      }
    });
  }

  openAddModal() {
    this.isEditing = false;
    this.currentEditMov = {
      data: new Date().toISOString().substring(0, 10),
      conto: 'isybank',
      descrizione: '',
      uscite: 0.0,
      categoria: 'Spese Varie',
      note: '',
      pagato: true,
      anno: this.selectedMonth ? this.selectedMonth.anno : new Date().getFullYear(),
      mese: this.selectedMonth ? this.selectedMonth.mese : new Date().getMonth() + 1
    };
    this.showModal();
  }

  openEditModal(mov: MargineMovimento) {
    this.isEditing = true;
    this.currentEditMov = { ...mov };
    this.showModal();
  }

  private showModal() {
    if (!this.modalInstance && typeof bootstrap !== 'undefined') {
      const el = document.getElementById('movimentoModal');
      if (el) this.modalInstance = new bootstrap.Modal(el);
    }
    this.modalInstance?.show();
  }

  saveMovimento() {
    if (!this.currentEditMov.descrizione || this.currentEditMov.uscite == null) {
      alert('Inserisci descrizione e importo.');
      return;
    }

    if (this.isEditing && this.currentEditMov.id) {
      this.margineService.updateMovimento(this.currentEditMov.id, this.currentEditMov as MargineMovimento).subscribe({
        next: () => {
          this.modalInstance?.hide();
          this.fetchData();
        },
        error: (err) => console.error(err)
      });
    } else {
      this.margineService.createMovimento(this.currentEditMov as MargineMovimento).subscribe({
        next: () => {
          this.modalInstance?.hide();
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

  exportBackup() {
    const backupData = {
      exportDate: new Date().toISOString(),
      mesi: this.mesi,
      movimenti: this.movimenti
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bilancio_Backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Filtered and Sorted Movements
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
    if (this.selectedMonth) return this.selectedMonth.totaleSpese;
    return this.mesi.reduce((acc, m) => acc + (m.totaleSpese || 0), 0);
  }

  get currentEntrate(): number {
    if (this.selectedMonth) return this.selectedMonth.entrate;
    return this.mesi.reduce((acc, m) => acc + (m.entrate || 0), 0);
  }

  get currentRisparmiati(): number {
    if (this.selectedMonth) return this.selectedMonth.risparmiati;
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
    if (c.includes('isybank')) return 'bg-info bg-opacity-10 text-info border border-info-subtle';
    if (c.includes('revolut')) return 'bg-primary bg-opacity-10 text-primary border border-primary-subtle';
    if (c.includes('bbva')) return 'bg-dark bg-opacity-10 text-dark border border-dark-subtle';
    if (c.includes('contanti')) return 'bg-success bg-opacity-10 text-success border border-success-subtle';
    return 'bg-secondary bg-opacity-10 text-secondary border';
  }

  private updateChart() {
    this.barChartData.labels = this.mesi.map(m => m.sheetName);
    this.barChartData.datasets[0].data = this.mesi.map(m => m.totaleSpese);
    this.barChartData.datasets[1].data = this.mesi.map(m => m.risparmiati);
  }
}
