import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SavedSpree } from './saved-spree.interfaces';
import { SpreePlan } from '../common/interfaces';
import { randomUUID } from 'crypto';

/**
 * In-memory store for saved sprees.
 * In production, replace with a database (Postgres, MongoDB, etc).
 */
@Injectable()
export class SavedSpreesService {
  private readonly store = new Map<string, SavedSpree>();

  /**
   * Get all saved sprees for a user.
   */
  findByUser(userId: string): SavedSpree[] {
    return Array.from(this.store.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get a single saved spree by ID.
   * Verifies the spree belongs to the requesting user.
   */
  findById(id: string, userId: string): SavedSpree {
    const spree = this.store.get(id);
    if (!spree) {
      throw new NotFoundException(`Saved spree ${id} not found`);
    }
    if (spree.userId !== userId) {
      throw new ForbiddenException('You do not own this spree');
    }
    return spree;
  }

  /**
   * Save a new spree plan.
   */
  create(userId: string, name: string, plan: SpreePlan): SavedSpree {
    const now = new Date().toISOString();
    const saved: SavedSpree = {
      id: randomUUID(),
      userId,
      name,
      createdAt: now,
      updatedAt: now,
      plan,
    };
    this.store.set(saved.id, saved);
    return saved;
  }

  /**
   * Update a saved spree's name or plan.
   */
  update(id: string, userId: string, name?: string, plan?: SpreePlan): SavedSpree {
    const existing = this.findById(id, userId);
    if (name !== undefined) existing.name = name;
    if (plan !== undefined) existing.plan = plan;
    existing.updatedAt = new Date().toISOString();
    this.store.set(id, existing);
    return existing;
  }

  /**
   * Delete a saved spree.
   */
  delete(id: string, userId: string): void {
    this.findById(id, userId); // verify ownership
    this.store.delete(id);
  }
}
