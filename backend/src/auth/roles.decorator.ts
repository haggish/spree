import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Require one or more realm roles to access the route.
 * Used in combination with RolesGuard.
 *
 * @example @Roles('organizer', 'admin')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
