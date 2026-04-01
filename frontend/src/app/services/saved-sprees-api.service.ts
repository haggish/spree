import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SpreePlan } from '../models';
import { environment } from '@env/environment';

export interface SavedSpree {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  plan: SpreePlan;
}

@Injectable({ providedIn: 'root' })
export class SavedSpreesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/saved-sprees`;

  getAll(): Observable<SavedSpree[]> {
    return this.http.get<SavedSpree[]>(this.baseUrl);
  }

  getById(id: string): Observable<SavedSpree> {
    return this.http.get<SavedSpree>(`${this.baseUrl}/${id}`);
  }

  save(name: string, plan: SpreePlan): Observable<SavedSpree> {
    return this.http.post<SavedSpree>(this.baseUrl, { name, plan });
  }

  update(id: string, name?: string, plan?: SpreePlan): Observable<SavedSpree> {
    return this.http.put<SavedSpree>(`${this.baseUrl}/${id}`, { name, plan });
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.baseUrl}/${id}`);
  }
}
