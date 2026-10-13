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
                  <td class="text-center pe-4">
                    <button *ngIf="p.fileName" class="btn btn-sm btn-outline-primary rounded-circle me-2" style="width:32px; height:32px; padding:0" (click)="openPdf(p.id!)" title="View PDF">
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

  ngOnInit() {
    this.fetchData();
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
