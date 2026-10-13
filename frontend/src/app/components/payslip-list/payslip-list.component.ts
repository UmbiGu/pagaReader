import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PayslipService } from '../../services/payslip.service';
import { Payslip } from '../../models/payslip.model';

// Declare bootstrap as any to access the modal via JS
declare var bootstrap: any;

@Component({
  selector: 'app-payslip-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 animate-fade-in">
      <h2 class="mb-0 fw-bold">Payslips Management</h2>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-danger rounded-pill shadow-sm px-4" (click)="deleteAllPayslips()" [disabled]="payslips.length === 0 || isUploading">
          <i class="bi bi-trash-fill me-2"></i> Delete All
        </button>
        <div>
          <input type="file" id="fileUpload" multiple accept=".pdf" class="d-none" (change)="onFileSelected($event)">
          <label for="fileUpload" class="btn btn-primary rounded-pill shadow-sm px-4 m-0">
            <i class="bi bi-cloud-arrow-up me-2"></i>
            <span *ngIf="!isUploading">Upload PDFs</span>
            <span *ngIf="isUploading">
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...
            </span>
          </label>
        </div>
      </div>
    </div>

    <div *ngIf="uploadError" class="alert alert-danger shadow-sm mb-4 animate-fade-in">
      {{ uploadError }}
    </div>

    <div class="card shadow-sm animate-fade-in delay-1 border-0">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light text-secondary">
              <tr>
                <th class="ps-4">Period</th>
                <th>Base Salary</th>
                <th>INPS Taxable</th>
                <th>IRPEF Taxable</th>
                <th>Holidays</th>
                <th>Ex-Fest.</th>
                <th>ROL</th>
                <th class="text-success fw-bold">Net Salary</th>
                <th class="text-center pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of payslips; track p.id) {
                <tr class="animate-fade-in">
                  <td class="fw-bold ps-4">
                    <span class="badge bg-secondary bg-opacity-10 text-secondary me-2">{{ p.year }}</span>
                    {{ payslipService.getMonthName(p.month) }}
                  </td>
                  <td>€ {{ p.baseSalary | number:'1.2-2' }}</td>
                  <td>€ {{ p.inpsTaxable | number:'1.2-2' }}</td>
                  <td>€ {{ p.irpefTaxable | number:'1.2-2' }}</td>
                  <td>{{ p.remainingHolidays | number:'1.2-2' }}</td>
                  <td>{{ p.remainingExFest | number:'1.2-2' }}</td>
                  <td>{{ p.remainingRol | number:'1.2-2' }}</td>
                  <td class="text-success fw-bold">€ {{ p.netSalary | number:'1.2-2' }}</td>
                  <td class="text-center pe-4" style="min-width: 140px;">
                    <button class="btn btn-sm btn-outline-info rounded-circle me-1" style="width:32px; height:32px; padding:0" (click)="openDetails(p)" title="View Details Recap">
                      <i class="bi bi-info-circle"></i>
                    </button>
                    <button *ngIf="p.fileName" class="btn btn-sm btn-outline-primary rounded-circle me-1" style="width:32px; height:32px; padding:0" (click)="openPdf(p.id!)" title="View PDF">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle" style="width:32px; height:32px; padding:0" (click)="deletePayslip(p.id!)" title="Delete">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="text-center py-5 text-muted">
                    <i class="bi bi-folder2-open fs-1 d-block mb-3 text-secondary opacity-50"></i>
                    No payslips uploaded yet. Use the upload button above to add PDF files.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Details Recap Modal -->
    <div class="modal fade" id="detailsModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div class="modal-content bg-body">
          <div class="modal-header border-bottom-0 bg-primary bg-opacity-10 text-primary">
            <h5 class="modal-title fw-bold" *ngIf="selectedPayslip">
              <i class="bi bi-calculator me-2"></i> Breakdown: {{ payslipService.getMonthName(selectedPayslip.month) }} {{ selectedPayslip.year }}
            </h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close" (click)="closeDetails()"></button>
          </div>
          <div class="modal-body p-4" *ngIf="selectedPayslip">
            
            <div class="row g-4">
              <div class="col-md-6">
                <h6 class="fw-bold border-bottom pb-2 text-primary">Financials</h6>
                <ul class="list-group list-group-flush small">
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    Total Gross (Competenze)
                    <span class="fw-bold">€ {{ selectedPayslip.totaleCompetenze | number:'1.2-2' }}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    Total Deductions (Trattenute)
                    <span class="fw-bold text-danger">€ {{ selectedPayslip.totaleTrattenute | number:'1.2-2' }}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0 border-primary border-2">
                    <strong>Net Salary</strong>
                    <strong class="text-success fs-5">€ {{ selectedPayslip.netSalary | number:'1.2-2' }}</strong>
                  </li>
                </ul>
              </div>
              
              <div class="col-md-6">
                <h6 class="fw-bold border-bottom pb-2 text-primary">Taxes (IRPEF)</h6>
                <ul class="list-group list-group-flush small">
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    IRPEF Taxable Base
                    <span class="fw-medium">€ {{ selectedPayslip.irpefTaxable | number:'1.2-2' }}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    Gross IRPEF
                    <span class="fw-medium">€ {{ selectedPayslip.irpefLorda | number:'1.2-2' }}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    Deductions (Lavoro Dipendente)
                    <span class="fw-medium text-success">€ {{ selectedPayslip.detrazioni | number:'1.2-2' }}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0" *ngIf="selectedPayslip.ulterioriDetrazioni">
                    Further Deductions (L.207/24)
                    <span class="fw-medium text-success">€ {{ selectedPayslip.ulterioriDetrazioni | number:'1.2-2' }}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0 border-primary border-2">
                    <strong>Net IRPEF Paid</strong>
                    <strong class="text-danger">€ {{ selectedPayslip.netIrpef | number:'1.2-2' }}</strong>
                  </li>
                </ul>
              </div>

              <div class="col-md-6">
                <h6 class="fw-bold border-bottom pb-2 text-primary">Counters (Balances)</h6>
                <ul class="list-group list-group-flush small">
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    Holidays
                    <span class="badge bg-primary rounded-pill">{{ selectedPayslip.remainingHolidays | number:'1.2-2' }} h</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    ROL (Permessi)
                    <span class="badge bg-info rounded-pill">{{ selectedPayslip.remainingRol | number:'1.2-2' }} h</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    Ex-Festività
                    <span class="badge bg-primary bg-opacity-75 rounded-pill">{{ selectedPayslip.remainingExFest | number:'1.2-2' }} h</span>
                  </li>
                </ul>
              </div>

              <div class="col-md-6">
                <h6 class="fw-bold border-bottom pb-2 text-primary">FONTE Pension</h6>
                <ul class="list-group list-group-flush small">
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    Employee Contribution
                    <span class="fw-medium">€ {{ selectedPayslip.fonteDipendente | number:'1.2-2' }}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                    Employer Contribution
                    <span class="fw-medium text-info">€ {{ selectedPayslip.fonteAzienda | number:'1.2-2' }}</span>
                  </li>
                </ul>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>

    <!-- PDF Modal Viewer -->
    <div class="modal fade" id="pdfModal" tabindex="-1" aria-labelledby="pdfModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content bg-body">
          <div class="modal-header border-bottom-0">
            <h5 class="modal-title fw-bold" id="pdfModalLabel"><i class="bi bi-file-earmark-pdf text-danger me-2"></i> Document Viewer</h5>
            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close" (click)="closePdf()"></button>
          </div>
          <div class="modal-body p-0">
            <iframe *ngIf="currentPdfUrl" [src]="currentPdfUrl" width="100%" height="700px" style="border: none;"></iframe>
            <div *ngIf="!currentPdfUrl" class="p-5 text-center text-muted">Loading document...</div>
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

  ngOnInit() {
    this.fetchData();
  }

  openDetails(payslip: Payslip) {
    this.selectedPayslip = payslip;
    if (!this.detailsModalInstance) {
      this.detailsModalInstance = new bootstrap.Modal(document.getElementById('detailsModal'));
    }
    this.detailsModalInstance.show();
  }

  closeDetails() {
    if (this.detailsModalInstance) {
      this.detailsModalInstance.hide();
    }
    this.selectedPayslip = null;
  }

  openPdf(id: number) {
    const url = this.payslipService.getPdfUrl(id);
    this.currentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    if (!this.pdfModalInstance) {
      this.pdfModalInstance = new bootstrap.Modal(document.getElementById('pdfModal'));
    }
    this.pdfModalInstance.show();
  }

  closePdf() {
    this.currentPdfUrl = null;
    if (this.pdfModalInstance) {
      this.pdfModalInstance.hide();
    }
  }

  fetchData() {
    this.payslipService.getPayslips().subscribe(data => {
      this.payslips = data;
    });
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files.length === 0) return;

    this.isUploading = true;
    this.uploadError = '';
    let completed = 0;

    for (let i = 0; i < files.length; i++) {
      this.payslipService.uploadPayslip(files[i]).subscribe({
        next: () => {
          completed++;
          if (completed === files.length) {
            this.isUploading = false;
            this.fetchData();
          }
        },
        error: (err) => {
          console.error(err);
          this.uploadError = `Error uploading ${files[i].name}`;
          completed++;
          if (completed === files.length) {
            this.isUploading = false;
            this.fetchData();
          }
        }
      });
    }
  }

  deletePayslip(id: number) {
    if (confirm('Are you sure you want to delete this payslip?')) {
      this.payslipService.deletePayslip(id).subscribe(() => this.fetchData());
    }
  }

  deleteAllPayslips() {
    if (confirm('WARNING: Are you sure you want to delete ALL payslips? This action cannot be undone.')) {
      this.payslipService.deleteAllPayslips().subscribe(() => this.fetchData());
    }
  }
}
