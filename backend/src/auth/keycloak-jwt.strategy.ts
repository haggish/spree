import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

/**
 * JWT payload from Keycloak access token.
 */
export interface KeycloakTokenPayload {
  sub: string;
  preferred_username: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  realm_roles?: string[];
  realm_access?: { roles: string[] };
  azp: string;       // authorized party (client_id)
  iss: string;       // issuer URL
  exp: number;
  iat: number;
}

/**
 * Normalized user object extracted from the Keycloak JWT.
 */
export interface AuthUser {
  id: string;           // Keycloak user ID (sub)
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

const KEYCLOAK_BASE_URL = process.env['KEYCLOAK_URL'] || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env['KEYCLOAK_REALM'] || 'spree';
// The issuer in tokens may differ from the internal KEYCLOAK_URL (e.g. localhost vs Docker hostname)
const KEYCLOAK_ISSUER = process.env['KEYCLOAK_ISSUER'] || `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}`;

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(Strategy, 'keycloak') {
  constructor() {
    const jwksUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: KEYCLOAK_ISSUER,
      algorithms: ['RS256'],
      // Dynamically fetch Keycloak's public keys via JWKS
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: jwksUrl,
      }),
    });
  }

  /**
   * Called after JWT signature + expiry are verified.
   * Normalize the Keycloak token into an AuthUser.
   */
  validate(payload: KeycloakTokenPayload): AuthUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    // Roles can come from realm_roles (custom mapper) or realm_access.roles (default)
    const roles: string[] = payload.realm_roles
      || payload.realm_access?.roles
      || [];

    return {
      id: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      firstName: payload.given_name,
      lastName: payload.family_name,
      roles,
    };
  }
}
