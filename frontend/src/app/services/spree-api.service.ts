import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ComputeSpreeRequest, SpreePlan } from '../models';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class SpreeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/spree`;

  computeSpree(request: ComputeSpreeRequest): Observable<SpreePlan> {
    return this.http.post<SpreePlan>(`${this.baseUrl}/compute`, request);
  }
}
