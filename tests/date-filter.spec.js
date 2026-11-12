import { test, expect } from '@playwright/test'

// Date filter on Analytics Intelligence V2 (/analytics-intelligence-v2):
// the Period presets (This Week ... Last 90 Days) and the Overall button.
// For each choice it checks three things:
//   1. the dates the page asks the API for ({ from, to } in each request body),
//   2. the date pill in the app bar ("15 Aug – 12 Nov 2026"),
//   3. the period name in the "Total Customers (…)" card.
//
// No real login and no real backend: the test plants a fake token and answers
// every API call itself, so it needs no password, never touches real data and
// is safe to re-run as often as you like. The browser's clock is frozen, so
// the expected dates below never change.

// "Today" for the browser, in India time like the app.
const TODAY = '2026-11-12T10:00:00+05:30' // a Thursday
test.use({ timezoneId: 'Asia/Kolkata' })

// The four API calls the page makes, each with { from, to } in the body.
const DATA_APIS = [
  'getAnalyticsProfitabilityV2',
  'getAnalyticsSwitchingV2',
  'getAnalyticsGravityV2',
  'getAnalyticsUninstalledV2',
]

// What each choice should produce, worked out by hand for TODAY.
const LAST_90_DAYS = { option: 'Last 90 Days', from: '2026-08-15', to: '2026-11-12', pill: '15 Aug – 12 Nov 2026' }
const PRESETS = [
  { option: 'This Week', from: '2026-11-09', to: '2026-11-12', pill: '9 Nov – 12 Nov 2026' }, // Monday to today
  { option: 'Last Week', from: '2026-11-02', to: '2026-11-08', pill: '2 Nov – 8 Nov 2026' },
  { option: 'This Month', from: '2026-11-01', to: '2026-11-12', pill: '1 Nov – 12 Nov 2026' },
  { option: 'Last Month', from: '2026-10-01', to: '2026-10-31', pill: '1 Oct – 31 Oct 2026' },
]
const OVERALL = { option: 'Overall', from: '2026-06-11', to: '2026-11-12', pill: '11 Jun – 12 Nov 2026' }

test('Date filter: each period loads the right dates', async ({ page }) => {
  // ---------- Setup ----------

  // Freeze the browser's clock, so "today" is always TODAY.
  await page.clock.setFixedTime(new Date(TODAY))

  // Fake login: the app only checks that a token exists in localStorage.
  // addInitScript runs inside the browser before the app's own code.
  await page.addInitScript(() => localStorage.setItem('token', 'fake-e2e-token'))

  // Answer every API call ourselves, and note the dates each data API was
  // last asked for. Without this the backend would reject the fake token and
  // the app would bounce back to the login page.
  const lastDates = {}
  await page.route('**/admin/**', async (route) => {
    const request = route.request()
    const api = new URL(request.url()).pathname.split('/').pop()

    if (DATA_APIS.includes(api)) lastDates[api] = request.postDataJSON()
    if (api === 'sse') return route.abort() // the live-bookings stream isn't needed here

    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' }, // the API is on another origin
      json: { data: null }, // no numbers: the cards just show "—"
    })
  })

  // The controls in the app bar.
  const periodMenu = page.getByRole('button', { name: 'Period' })
  const overallButton = page.getByRole('button', { name: 'Overall', exact: true })
  const datePill = page.getByRole('button', { name: 'Custom date range' })

  const choosePeriod = async (option) => {
    await periodMenu.click()
    await page.getByRole('option', { name: option }).click()
  }

  // Checks everything one choice should change.
  const expectPeriod = async ({ option, from, to, pill }) => {
    // 1. All four APIs were last asked for exactly these dates.
    //    expect.poll re-runs the function until it matches (or times out),
    //    because the requests go out a moment after the click.
    await expect
      .poll(() => lastDates)
      .toEqual({
        getAnalyticsProfitabilityV2: { from, to },
        getAnalyticsSwitchingV2: { from, to },
        getAnalyticsGravityV2: { from, to },
        getAnalyticsUninstalledV2: { from, to },
      })
    // 2. The date pill shows the range.
    await expect(datePill).toHaveText(pill)
    // 3. The card title names the period.
    await expect(page.getByText(`Total Customers (${option})`)).toBeVisible()
  }

  // ---------- The test ----------

  await page.goto('/analytics-intelligence-v2')

  await test.step('Opens on Last 90 Days', async () => {
    await expectPeriod(LAST_90_DAYS)
    await expect(overallButton).toHaveAttribute('aria-pressed', 'false')
  })

  for (const preset of PRESETS) {
    await test.step(`Period: ${preset.option}`, async () => {
      await choosePeriod(preset.option)
      await expectPeriod(preset)
    })
  }

  await test.step('Overall button', async () => {
    await overallButton.click()
    await expectPeriod(OVERALL)
    await expect(overallButton).toHaveAttribute('aria-pressed', 'true')
  })

  await test.step('Picking a period again turns Overall off', async () => {
    await periodMenu.click()
    // While Overall is on, the Period menu lists it, ticked.
    await expect(page.getByRole('option', { name: 'Overall' })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('option', { name: 'Last 90 Days' }).click()

    await expectPeriod(LAST_90_DAYS)
    await expect(overallButton).toHaveAttribute('aria-pressed', 'false')
  })
})
