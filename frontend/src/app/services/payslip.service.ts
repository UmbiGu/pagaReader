import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Payslip } from '../models/payslip.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PayslipService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/cedolini`;

  getPayslips(): Observable<Payslip[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]); // Return empty array during SSR build to prevent 403 Forbidden
    }
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
      azienda: b.azienda,
      employeeName: b.nomeDipendente,
      codiceFiscale: b.codiceFiscale,
      matricola: b.matricola,
      qualifica: b.qualifica,
      livello: b.livello,
      mansione: b.mansione,
      ccnl: b.ccnl,
      cnel: b.cnel,
      dataAssunzione: b.dataAssunzione,
      dataNascita: b.dataNascita,
      scattiAnzianita: b.scattiAnzianita,
      month: b.mese,
      year: b.anno,
      aggiuntiva: !!b.aggiuntiva,
      baseSalary: b.pagaBase || 0,
      contingency: b.contingenza || 0,
      superminimo: b.superminimo || 0,
      terzoElemento: b.terzoElemento || 0,
      straordinarioForfetizzato: b.straordinarioForfetizzato || 0,
      edr: b.edr || 0,
      totaleCompetenze: b.totaleCompetenze || 0,
      totaleTrattenute: b.totaleTrattenute || 0,
      inpsTaxable: b.imponibileInps || 0,
      inailTaxable: b.imponibileInail || 0,
      irpefTaxable: b.imponibileIrpef || 0,
      irpefLorda: b.irpefLorda || 0,
      netIrpef: b.irpefNetta || 0,
      detrazioni: b.detrazioni || 0,
      ulterioriDetrazioni: b.ulterioriDetrazioni || 0,
      netSalary: b.nettoMese || 0,
      imponibileInpsProgressivo: b.imponibileInpsProgressivo || 0,
      imponibileInailProgressivo: b.imponibileInailProgressivo || 0,
      imponibileIrpefProgressivo: b.imponibileIrpefProgressivo || 0,
      irpefPagataProgressiva: b.irpefPagataProgressiva || 0,
      tfrMese: b.tfrMese || 0,
      ferieResidueAP: b.ferieResidueAP || 0,
      ferieMaturate: b.ferieMaturate || 0,
      ferieGodute: b.ferieGodute || 0,
      remainingHolidays: b.ferieSaldo || 0,
      exFestResidueAP: b.exFestResidueAP || 0,
      exFestMaturate: b.exFestMaturate || 0,
      exFestGodute: b.exFestGodute || 0,
      remainingExFest: b.exFestSaldo || 0,
      rolResiduoAP: b.rolResiduoAP || 0,
      rolMaturate: b.rolMaturate || 0,
      rolGodute: b.rolGodute || 0,
      remainingRol: b.rolSaldo || 0,
      fonteDipendente: b.fonteDipendente || 0,
      fonteAzienda: b.fonteAzienda || 0,
      fileName: b.fileName,
      voci: b.voci || []
    };
  }

  getMonthName(monthNumber: number, isAggiuntiva?: boolean): string {
    const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    const base = months[monthNumber - 1] || "N/A";
    if (!isAggiuntiva) return base;
    if (monthNumber === 12) return `${base} (13ª)`;
    if (monthNumber === 6) return `${base} (14ª)`;
    return `${base} (Agg.)`;
  }
}
