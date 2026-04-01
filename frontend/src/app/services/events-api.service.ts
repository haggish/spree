import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventWithVenue } from '../models';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class EventsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/events`;

  getAll(): Observable<EventWithVenue[]> {
    return this.http.get<EventWithVenue[]>(this.baseUrl);
  }

  getInTimeRange(startTime: string, endTime: string): Observable<EventWithVenue[]> {
    const params = new HttpParams()
      .set('startTime', startTime)
      .set('endTime', endTime);
    return this.http.get<EventWithVenue[]>(this.baseUrl, { params });
  }

  getById(id: string): Observable<EventWithVenue> {
    return this.http.get<EventWithVenue>(`${this.baseUrl}/${id}`);
  }
}
