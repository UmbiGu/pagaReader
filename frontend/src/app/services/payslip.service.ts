import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Payslip } from '../models/payslip.model';

@Injectable({
  providedIn: 'root'
})
export class PayslipService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/cedolini';

  getPayslips(): Observable<Payslip[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(data => data.map(this.mapToFrontendModel))
    );
  }

  uploadPayslip(file: File): Observable<Payslip> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData).pipe(
      map(this.mapToFrontendModel)
    );
  }

  deletePayslip(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  deleteAllPayslips(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/all`);
  }

  getPdfUrl(id: number): string {
    return `${this.apiUrl}/${id}/pdf`;
  }

  /**
   * Maps backend Italian variable names to scalable English UI variables
   */
  private mapToFrontendModel(b: any): Payslip {
    return {
      id: b.id,
      month: b.mese,
      year: b.anno,
      baseSalary: b.pagaBase || 0,
      contingency: b.contingenza || 0,
      superminimo: b.superminimo || 0,
      inpsTaxable: b.imponibileInps || 0,
      irpefTaxable: b.imponibileIrpef || 0,
      netIrpef: b.irpefNetta || 0,
      netSalary: b.nettoMese || 0,
      remainingHolidays: b.ferieSaldo || 0,
      remainingExFest: b.exFestSaldo || 0,
      remainingRol: b.rolSaldo || 0,
      fonteDipendente: b.fonteDipendente || 0,
      fonteAzienda: b.fonteAzienda || 0,
      fileName: b.fileName
    };
  }

  getMonthName(monthNumber: number): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[monthNumber - 1] || "N/A";
  }
}
