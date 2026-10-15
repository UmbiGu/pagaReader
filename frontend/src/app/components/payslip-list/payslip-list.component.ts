import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PayslipService } from '../../services/payslip.service';
import { Payslip } from '../../models/payslip.model';

declare var bootstrap: any;

@Component({
  selector: 'app-payslip-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in flex-wrap gap-2">
      <div>
        <h2 class="mb-0 fw-bold text-primary"><i class="bi bi-file-earmark-person me-2"></i> Archivio Buste Paga</h2>
        <p class="text-muted mb-0">Gestione e consultazione di tutti i cedolini stipendiali.</p>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-danger rounded-pill shadow-sm px-3" (click)="deleteAllPayslips()" [disabled]="payslips.length === 0 || isUploading">
          <i class="bi bi-trash-fill me-1"></i> Elimina Tutto
        </button>
        <div>
          <input type="file" id="fileUpload" multiple accept=".pdf" class="d-none" (change)="onFileSelected($event)">
          <label for="fileUpload" class="btn btn-primary rounded-pill shadow-sm px-4 m-0 fw-medium" style="cursor: pointer;">
            <i class="bi bi-cloud-arrow-up me-2"></i>
            <span *ngIf="!isUploading">Carica PDF</span>
            <span *ngIf="isUploading">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Caricamento...
            </span>
          </label>
        </div>
      </div>
    </div>

    <div *ngIf="uploadError" class="alert alert-danger shadow-sm mb-4 animate-fade-in rounded-4">
      <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ uploadError }}
    </div>

    <!-- FILTER TOOLBAR -->
    <div class="card shadow-sm animate-fade-in border-0 mb-4">
      <div class="card-body p-3">
        <div class="row g-2 align-items-center">
          <div class="col-md-5">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-body border-end-0"><i class="bi bi-search text-muted"></i></span>
              <input type="text" class="form-control border-start-0" placeholder="Cerca mese, anno, azienda..." [(ngModel)]="searchQuery">
            </div>
          </div>
          <div class="col-md-3 col-6">
            <select class="form-select form-select-sm" [(ngModel)]="selectedYear">
              <option value="all">Tutti gli Anni ({{ payslips.length }})</option>
              <option *ngFor="let y of availableYears" [value]="y">Anno {{ y }}</option>
            </select>
          </div>
          <div class="col-md-4 col-6 text-end">
            <span class="small text-muted">
              Mostrati: <strong>{{ filteredPayslips.length }}</strong> su {{ payslips.length }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- TABLE -->
    <div class="card shadow-sm animate-fade-in delay-1 border-0 mb-5">
      <div class="card-body p-0">
        <div class="table-responsive" style="height: 480px; max-height: 480px; overflow-y: auto;">
          <table class="table table-modern table-hover mb-0 align-middle">
            <thead class="table-light sticky-top">
              <tr>
                <th class="ps-4">Periodo</th>
                <th>Paga Base</th>
                <th>Imp. INPS</th>
                <th>Imp. IRPEF</th>
                <th>Ferie Residue</th>
                <th>Ex-Fest.</th>
                <th>ROL</th>
                <th class="text-end text-success fw-bold">Netto Mese</th>
                <th class="text-center pe-4">Azioni</th>
              </tr>
            </thead>
            <tbody>
              @for (p of filteredPayslips; track p.id) {
                <tr class="animate-fade-in">
                  <td class="fw-bold ps-4 text-body">
                    <span class="badge bg-secondary bg-opacity-10 text-secondary border me-2">{{ p.year }}</span>
                    {{ payslipService.getMonthName(p.month, p.aggiuntiva) }}
                    <span *ngIf="p.aggiuntiva && p.month === 12" class="badge bg-warning bg-opacity-10 text-warning border border-warning-subtle ms-1">
                      13ª Mensilità
                    </span>
                    <span *ngIf="p.aggiuntiva && p.month === 6" class="badge bg-info bg-opacity-10 text-info border border-info-subtle ms-1">
                      14ª Mensilità
                    </span>
                  </td>
                  <td>€ {{ p.baseSalary | number:'1.2-2' }}</td>
                  <td>€ {{ p.inpsTaxable | number:'1.2-2' }}</td>
                  <td>€ {{ p.irpefTaxable | number:'1.2-2' }}</td>
                  <td>{{ p.remainingHolidays | number:'1.2-2' }} h</td>
                  <td>{{ p.remainingExFest | number:'1.2-2' }} h</td>
                  <td>{{ p.remainingRol | number:'1.2-2' }} h</td>
                  <td class="text-end text-success fw-bold text-nowrap">€ {{ p.netSalary | number:'1.2-2' }}</td>
                  <td class="text-center pe-4" style="min-width: 140px;">
                    <button class="btn btn-sm btn-outline-info rounded-circle me-1" style="width:32px; height:32px; padding:0" (click)="openDetails(p)" title="Dettagli e Voci">
                      <i class="bi bi-info-circle"></i>
                    </button>
                    <button *ngIf="p.fileName" class="btn btn-sm btn-outline-primary rounded-circle me-1" style="width:32px; height:32px; padding:0" (click)="openPdf(p.id!)" title="Visualizza PDF">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle" style="width:32px; height:32px; padding:0" (click)="deletePayslip(p.id!)" title="Elimina">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="text-center py-5 text-muted">
                    <i class="bi bi-folder2-open fs-1 d-block mb-3 text-secondary opacity-50"></i>
                    Nessun cedolino trovato. Carica file PDF per popolare l'archivio.
                  </td>
                </tr>
              }
            </tbody>
            <tfoot class="table-light fw-bold sticky-bottom" *ngIf="filteredPayslips.length > 0">
              <tr>
                <td class="ps-4">Totale ({{ filteredPayslips.length }} cedolini):</td>
                <td>-</td>
                <td>€ {{ totalFilteredInps | number:'1.2-2' }}</td>
                <td>€ {{ totalFilteredIrpef | number:'1.2-2' }}</td>
                <td colspan="3"></td>
                <td class="text-end text-success fw-bold text-nowrap">€ {{ totalFilteredNetSalary | number:'1.2-2' }}</td>
                <td class="pe-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- PDF Viewer Modal -->
    <div class="modal fade" id="pdfModal" tabindex="-1" aria-labelledby="pdfModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered" style="height: 90vh;">
        <div class="modal-content h-100 rounded-4">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title fw-bold" id="pdfModalLabel">Visualizzatore PDF Busta Paga</h5>
            <button type="button" class="btn-close" (click)="closePdf()" aria-label="Close"></button>
          </div>
          <div class="modal-body p-3 h-100">
            <iframe *ngIf="currentPdfUrl" [src]="currentPdfUrl" width="100%" height="100%" class="rounded-3 border-0"></iframe>
          </div>
        </div>
      </div>
    </div>

    <!-- Payslip Breakdown Modal -->
    <div class="modal fade" id="detailsModal" tabindex="-1" aria-labelledby="detailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content rounded-4 border-0">
          <div class="modal-header border-bottom py-3">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-file-earmark-text text-primary fs-4"></i>
              <h5 class="modal-title fw-bold mb-0" id="detailsModalLabel">
                Dettaglio Cedolino: {{ selectedPayslip ? payslipService.getMonthName(selectedPayslip.month, selectedPayslip.aggiuntiva) : '' }} {{ selectedPayslip?.year }}
              </h5>
            </div>
            <button type="button" class="btn-close" (click)="closeDetails()" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4" *ngIf="selectedPayslip">
            <div class="row g-3 mb-4">
              <div class="col-sm-6">
                <div class="p-3 rounded-3 bg-body-secondary">
                  <small class="text-muted d-block">Competenze Totali</small>
                  <strong class="fs-5 text-primary">€ {{ selectedPayslip.totaleCompetenze | number:'1.2-2' }}</strong>
                </div>
              </div>
              <div class="col-sm-6">
                <div class="p-3 rounded-3 bg-body-secondary">
                  <small class="text-muted d-block">Trattenute Totali</small>
                  <strong class="fs-5 text-danger">€ {{ selectedPayslip.totaleTrattenute | number:'1.2-2' }}</strong>
                </div>
              </div>
            </div>

            <h6 class="fw-bold mb-3 text-secondary text-uppercase small tracking-wider">Voci Variabili del Mese</h6>
            <div class="table-responsive" style="max-height: 350px;">
              <table class="table table-modern table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Descrizione Voce</th>
                    <th>Tipo</th>
                    <th class="text-end">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let v of selectedPayslip.voci">
                    <td class="text-body fw-medium">{{ v.descrizione }}</td>
                    <td>
                      <span class="badge rounded-pill small" [ngClass]="v.tipo === 'COMPETENZA' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-danger bg-opacity-10 text-danger'">
                        {{ v.tipo }}
                      </span>
                    </td>
                    <td class="text-end fw-bold" [ngClass]="v.tipo === 'COMPETENZA' ? 'text-primary' : 'text-danger'">
                      € {{ v.importo | number:'1.2-2' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PayslipListComponent implements OnInit {
  payslipService = inject(PayslipService);
  private sanitizer = inject(DomSanitizer);

  payslips: Payslip[] = [];
  isUploading = false;
  uploadError = '';
  currentPdfUrl: SafeResourceUrl | null = null;
  pdfModalInstance: any;
  detailsModalInstance: any;
  selectedPayslip: Payslip | null = null;

  searchQuery = '';
  selectedYear = 'all';

  ngOnInit() {
    this.fetchData();
  }

  get availableYears(): number[] {
    return [...new Set(this.payslips.map(p => p.year))].sort((a, b) => b - a);
  }

  get filteredPayslips(): Payslip[] {
    let list = this.payslips;
    if (this.selectedYear !== 'all') {
      const y = parseInt(this.selectedYear, 10);
      list = list.filter(p => p.year === y);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.year.toString().includes(q) ||
        this.payslipService.getMonthName(p.month, p.aggiuntiva).toLowerCase().includes(q) ||
        (p.azienda && p.azienda.toLowerCase().includes(q))
      );
    }
    return list;
  }

  get totalFilteredNetSalary(): number {
    return this.filteredPayslips.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  }

  get totalFilteredInps(): number {
    return this.filteredPayslips.reduce((sum, p) => sum + (p.inpsTaxable || 0), 0);
  }

  get totalFilteredIrpef(): number {
    return this.filteredPayslips.reduce((sum, p) => sum + (p.irpefTaxable || 0), 0);
  }

  openDetails(payslip: Payslip) {
    this.selectedPayslip = payslip;
    if (!this.detailsModalInstance && typeof bootstrap !== 'undefined') {
      this.detailsModalInstance = new bootstrap.Modal(document.getElementById('detailsModal'));
    }
    this.detailsModalInstance?.show();
  }

  closeDetails() {
    this.detailsModalInstance?.hide();
    this.selectedPayslip = null;
  }

  openPdf(id: number) {
    const url = this.payslipService.getPdfUrl(id);
    this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    if (!this.pdfModalInstance && typeof bootstrap !== 'undefined') {
      this.pdfModalInstance = new bootstrap.Modal(document.getElementById('pdfModal'));
    }
    this.pdfModalInstance?.show();
  }

  closePdf() {
    this.currentPdfUrl = null;
    this.pdfModalInstance?.hide();
  }

  fetchData() {
    this.payslipService.getPayslips().subscribe(data => {
      this.payslips = data || [];
    });
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files.length === 0) return;

    this.isUploading = true;
    this.uploadError = '';
    let completed = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      this.payslipService.uploadPayslip(files[i]).subscribe({
        next: () => {
          completed++;
          if (completed === files.length) {
            this.isUploading = false;
            if (errors.length > 0) {
              this.uploadError = errors.join(' | ');
            }
            this.fetchData();
            if (event.target) event.target.value = '';
          }
        },
        error: (err) => {
          console.error(err);
          const msg = err.error?.message || err.error || `Errore nel caricamento di ${files[i].name}`;
          errors.push(msg);
          completed++;
          if (completed === files.length) {
            this.isUploading = false;
            this.uploadError = errors.join(' | ');
            this.fetchData();
            if (event.target) event.target.value = '';
          }
        }
      });
    }
  }

  deletePayslip(id: number) {
    if (confirm('Sei sicuro di voler eliminare questa busta paga?')) {
      this.payslipService.deletePayslip(id).subscribe(() => this.fetchData());
    }
  }

  deleteAllPayslips() {
    if (confirm('ATTENZIONE: Sei sicuro di voler eliminare TUTTE le buste paga caricate?')) {
      this.payslipService.deleteAllPayslips().subscribe(() => this.fetchData());
    }
  }
}
