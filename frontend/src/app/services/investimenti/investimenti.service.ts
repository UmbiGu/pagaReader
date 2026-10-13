import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PatrimonioGiornaliero, PortafoglioMovimento } from '../../models/investimenti/investimenti.model';

@Injectable({
  providedIn: 'root'
})
export class InvestimentiService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = 'https://pagareader-1.onrender.com/api/investimenti';

  uploadExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  getPatrimonio(): Observable<PatrimonioGiornaliero[]> {
    if (!isPlatformBrowser(this.platformId)) return of([]);
    return this.http.get<PatrimonioGiornaliero[]>(`${this.apiUrl}/patrimonio`);
  }

  getMovimenti(): Observable<PortafoglioMovimento[]> {
    if (!isPlatformBrowser(this.platformId)) return of([]);
    return this.http.get<PortafoglioMovimento[]>(`${this.apiUrl}/movimenti`);
  }

  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/all`);
  }
}
