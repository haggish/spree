import { Injectable } from '@nestjs/common';
import { Venue } from '../common/interfaces';

@Injectable()
export class VenuesService {
  private readonly venues: Venue[] = [
    {
      id: 'ven-001',
      name: 'Berghain',
      address: 'Am Wriezener Bhf, 10243 Berlin',
      location: { lat: 52.5112, lng: 13.4428 },
      googlePlaceId: 'ChIJLwkJQIFRqEcRKMNFm2MRAgM',
    },
    {
      id: 'ven-002',
      name: 'Astra Kulturhaus',
      address: 'Revaler Str. 99, 10245 Berlin',
      location: { lat: 52.5074, lng: 13.4543 },
      googlePlaceId: 'ChIJRzVfM3xRqEcRvHvMpD_UQgs',
    },
    {
      id: 'ven-003',
      name: 'Tempodrom',
      address: 'Möckernstraße 10, 10963 Berlin',
      location: { lat: 52.4986, lng: 13.3830 },
      googlePlaceId: 'ChIJ7wRIGqJRqEcRqCWDaHZiAQQ',
    },
    {
      id: 'ven-004',
      name: 'Festsaal Kreuzberg',
      address: 'Skalitzer Str. 130, 10999 Berlin',
      location: { lat: 52.4992, lng: 13.4318 },
      googlePlaceId: 'ChIJb0n3J9FRqEcRa8eFAc6TXAM',
    },
    {
      id: 'ven-005',
      name: 'Lido',
      address: 'Cuvrystraße 7, 10997 Berlin',
      location: { lat: 52.4976, lng: 13.4419 },
      googlePlaceId: 'ChIJPTiG1dBRqEcRRHqLFm8WBgQ',
    },
    {
      id: 'ven-006',
      name: 'Volksbühne',
      address: 'Linienstraße 227, 10178 Berlin',
      location: { lat: 52.5267, lng: 13.4117 },
      googlePlaceId: 'ChIJ1z-MZ31RqEcRCERFlL3UAAM',
    },
    {
      id: 'ven-007',
      name: 'Columbiahalle',
      address: 'Columbiadamm 13-21, 10965 Berlin',
      location: { lat: 52.4849, lng: 13.3883 },
      googlePlaceId: 'ChIJtSjz06VRqEcRfK_bDAGDBwQ',
    },
    {
      id: 'ven-008',
      name: 'Admiralspalast',
      address: 'Friedrichstraße 101, 10117 Berlin',
      location: { lat: 52.5230, lng: 13.3880 },
      googlePlaceId: 'ChIJywnQpHRRqEcRHAqHxzSHAAM',
    },
  ];

  findAll(): Venue[] {
    return this.venues;
  }

  findById(id: string): Venue | undefined {
    return this.venues.find((v) => v.id === id);
  }

  findByGooglePlaceId(placeId: string): Venue | undefined {
    return this.venues.find((v) => v.googlePlaceId === placeId);
  }
}
