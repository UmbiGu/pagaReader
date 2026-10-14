import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MargineMese, MargineMovimento } from '../../models/margine/margine.model';

@Injectable({
  providedIn: 'root'
})
export class MargineService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/margine`;

  getMesi(): Observable<MargineMese[]> {
    return this.http.get<MargineMese[]>(`${this.apiUrl}/mesi`);
  }

  getMovimenti(anno?: number, mese?: number): Observable<MargineMovimento[]> {
    let url = `${this.apiUrl}/movimenti`;
    if (anno && mese) {
      url += `?anno=${anno}&mese=${mese}`;
    }
    return this.http.get<MargineMovimento[]>(url);
  }

  uploadExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  createMovimento(mov: MargineMovimento): Observable<MargineMovimento> {
    return this.http.post<MargineMovimento>(`${this.apiUrl}/movimenti`, mov);
  }

  updateMovimento(id: number, mov: MargineMovimento): Observable<MargineMovimento> {
    return this.http.put<MargineMovimento>(`${this.apiUrl}/movimenti/${id}`, mov);
  }

  deleteMovimento(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/movimenti/${id}`);
  }

  deleteAll(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/all`);
  }
}
