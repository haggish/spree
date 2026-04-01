import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './keycloak-jwt.strategy';

/**
 * Extract the authenticated user from the request.
 *
 * @example
 * @Get('me')
 * getProfile(@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | string | string[] | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) return undefined;
    if (data) return user[data];
    return user;
  },
);
