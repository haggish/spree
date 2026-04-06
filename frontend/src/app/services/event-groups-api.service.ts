import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventGroupSummary, EventGroup } from '../models';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class EventGroupsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/event-groups`;

  getAll(): Observable<EventGroupSummary[]> {
    return this.http.get<EventGroupSummary[]>(this.baseUrl);
  }

  getById(id: string): Observable<EventGroup> {
    return this.http.get<EventGroup>(`${this.baseUrl}/${id}`);
  }
}
