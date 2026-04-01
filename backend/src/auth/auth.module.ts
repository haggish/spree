import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { KeycloakJwtStrategy } from './keycloak-jwt.strategy';
import { KeycloakAuthGuard } from './keycloak-auth.guard';
import { RolesGuard } from './roles.guard';
import { UserController } from './user.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'keycloak' })],
  controllers: [UserController],
  providers: [
    KeycloakJwtStrategy,

    // Register as global guards — all routes require auth by default
    // Use @Public() to opt out
    {
      provide: APP_GUARD,
      useClass: KeycloakAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [PassportModule],
})
export class AuthModule {}
