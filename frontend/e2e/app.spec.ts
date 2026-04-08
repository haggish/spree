import { test, expect, Page } from '@playwright/test';
import { mockEventGroups, mockEventGroup, mockEvents, mockSpreePlan } from './fixtures';

/**
 * Set up API route mocking so tests don't require the real backend.
 * Also stubs Keycloak discovery to prevent OIDC init errors.
 */
async function mockApi(page: Page) {
  // Stub Keycloak OIDC discovery
  await page.route('**/realms/spree/.well-known/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        issuer: 'http://localhost:8080/realms/spree',
        authorization_endpoint: 'http://localhost:8080/realms/spree/protocol/openid-connect/auth',
        token_endpoint: 'http://localhost:8080/realms/spree/protocol/openid-connect/token',
        jwks_uri: 'http://localhost:8080/realms/spree/protocol/openid-connect/certs',
        end_session_endpoint: 'http://localhost:8080/realms/spree/protocol/openid-connect/logout',
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
      }),
    }),
  );

  await page.route('**/realms/spree/protocol/openid-connect/certs', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ keys: [] }),
    }),
  );

  // Mock event groups list
  await page.route('**/api/event-groups', (route) => {
    if (route.request().url().includes('/at/')) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEventGroups),
    });
  });

  // Mock event group by ID with date filter
  await page.route('**/api/event-groups/*/at/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEventGroup),
    }),
  );

  // Mock event group by ID (without date)
  await page.route('**/api/event-groups/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEventGroup),
    }),
  );

  // Mock spree computation
  await page.route('**/api/spree/compute', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(mockSpreePlan),
    }),
  );
}

/** Dismiss the splash screen */
async function dismissSplash(page: Page) {
  await page.locator('.splash-btn').click();
  await expect(page.locator('.splash')).not.toBeVisible();
}

/** Wait for event groups to load in the dropdown */
async function waitForGroups(page: Page) {
  await expect(page.locator('.group-select-wrapper select')).toBeVisible();
}

test.describe('App shell and navigation', () => {
  test('should show splash screen on load', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');

    await expect(page.locator('.splash')).toBeVisible();
    await expect(page.locator('.splash-title')).toHaveText('Spree');
    await expect(page.locator('.splash-btn')).toHaveText("Let's Go");
  });

  test('should dismiss splash and show app', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await dismissSplash(page);

    await expect(page.locator('.logo-text')).toHaveText('Spree');
  });

  test('should show map legend', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await dismissSplash(page);

    await expect(page.locator('.map-legend')).toBeVisible();
    await expect(page.locator('.legend-item')).toHaveCount(4);
  });
});

test.describe('Event group selection', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await dismissSplash(page);
  });

  test('should load event groups into the dropdown', async ({ page }) => {
    await waitForGroups(page);

    const options = page.locator('.group-select-wrapper select option:not([disabled])');
    await expect(options).toHaveCount(2);
  });

  test('should auto-select the first group', async ({ page }) => {
    await waitForGroups(page);
    const select = page.locator('.group-select-wrapper select');

    // Angular [ngValue] adds an index prefix like "0: berlin-music-day"
    const value = await select.inputValue();
    expect(value).toContain('berlin-music-day');
  });

  test('should show date picker', async ({ page }) => {
    await waitForGroups(page);
    await expect(page.locator('.date-picker-wrapper input[type="date"]')).toBeVisible();
  });

  test('should switch event group via label text', async ({ page }) => {
    await waitForGroups(page);
    const select = page.locator('.group-select-wrapper select');

    // Find the option by its text content and select by its index
    const option = select.locator('option', { hasText: 'Berlin Arts' });
    const optionValue = await option.getAttribute('value');
    await select.selectOption(optionValue!);
    const value = await select.inputValue();
    expect(value).toContain('berlin-arts-culture');
  });
});

test.describe('Spree panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await dismissSplash(page);
    await waitForGroups(page);
  });

  test('should show the bottom panel header', async ({ page }) => {
    // Panel header is always visible (even when collapsed)
    await expect(page.locator('.panel-header')).toBeVisible();
    await expect(page.locator('.panel-title')).toHaveText('Your Spree');
  });

  test('should show empty state when expanded with no selections', async ({ page }) => {
    // Expand the panel by clicking the header
    await page.locator('.panel-header').click();
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-text')).toContainText('Tap event markers');
  });

  test('should show selection count in subtitle', async ({ page }) => {
    await expect(page.locator('.panel-subtitle')).toContainText('0 events selected');
  });
});

test.describe('Settings drawer', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await dismissSplash(page);
  });

  test('should open settings drawer on FAB click', async ({ page }) => {
    await page.locator('.settings-fab').click();
    await expect(page.locator('app-settings-drawer .drawer')).toBeVisible();
  });

  test('should close settings drawer on overlay click', async ({ page }) => {
    await page.locator('.settings-fab').click();
    await expect(page.locator('app-settings-drawer .drawer')).toBeVisible();

    await page.locator('app-settings-drawer .overlay').click();
    await expect(page.locator('app-settings-drawer .drawer')).not.toBeVisible();
  });

  test('should show home location and time inputs', async ({ page }) => {
    await page.locator('.settings-fab').click();
    const drawer = page.locator('app-settings-drawer .drawer');

    // Should have coordinate inputs and time inputs
    await expect(drawer.locator('input')).toHaveCount(4);
  });

  test('should show strategy selector buttons', async ({ page }) => {
    await page.locator('.settings-fab').click();
    const drawer = page.locator('app-settings-drawer .drawer');

    // Strategy uses buttons, not a <select>
    await expect(drawer.locator('.strategy-btn')).toHaveCount(2);
    // One should be active
    await expect(drawer.locator('.strategy-btn.active')).toHaveCount(1);
  });
});

test.describe('Map area', () => {
  test('should render the map component', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await dismissSplash(page);

    await expect(page.locator('app-map')).toBeVisible();
    await expect(page.locator('.map-container')).toBeVisible();
  });
});
