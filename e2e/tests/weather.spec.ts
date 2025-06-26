import { expect, test } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:9010/';

test('Search weather', async ({ page }) => {
	await page.goto(baseURL);

	await page.fill('input[type="text"]', 'Kyiv');

	await page.click('button');

	await page.waitForSelector('.weather-results-card');

	const weatherCard = page.locator('.weather-results-card');

	await page.waitForTimeout(10);

	await expect(weatherCard).toHaveText(/Weather in Kyiv/);
});
