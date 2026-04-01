import { SpreePlan } from '../common/interfaces';

export interface SavedSpree {
  id: string;
  userId: string;
  name: string;
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
  plan: SpreePlan;
}

export interface SaveSpreeDto {
  name: string;
  plan: SpreePlan;
}
