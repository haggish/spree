import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedSpreeEntity } from './saved-spree.entity';
import { SpreePlan } from '../common/interfaces';

@Injectable()
export class SavedSpreesService {
  constructor(
    @InjectRepository(SavedSpreeEntity)
    private readonly repo: Repository<SavedSpreeEntity>,
  ) {}

  async findByUser(userId: string): Promise<SavedSpreeEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, userId: string): Promise<SavedSpreeEntity> {
    const spree = await this.repo.findOneBy({ id });
    if (!spree) {
      throw new NotFoundException(`Saved spree ${id} not found`);
    }
    if (spree.userId !== userId) {
      throw new ForbiddenException('You do not own this spree');
    }
    return spree;
  }

  async create(userId: string, name: string, plan: SpreePlan): Promise<SavedSpreeEntity> {
    // If a spree with the same name exists for this user, update it
    const existing = await this.repo.findOneBy({ userId, name });
    if (existing) {
      existing.plan = plan;
      return this.repo.save(existing);
    }
    const spree = this.repo.create({ userId, name, plan });
    return this.repo.save(spree);
  }

  async update(id: string, userId: string, name?: string, plan?: SpreePlan): Promise<SavedSpreeEntity> {
    const existing = await this.findById(id, userId);
    if (name !== undefined) existing.name = name;
    if (plan !== undefined) existing.plan = plan;
    return this.repo.save(existing);
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.findById(id, userId);
    await this.repo.remove(existing);
  }
}
