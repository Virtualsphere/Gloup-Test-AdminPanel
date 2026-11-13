import { test, expect } from '@playwright/test'

// Date filters on the two Partner V2 pages:
//   - Partner Details V2        (/partner-details-v2/:id)
//   - Partner Subscriptions V2  (/partner-subscriptions-v2)
// Each test picks every period option plus the Overall button, and checks the
// dates the page asks the API for and what the page shows.
//
// Like date-filter.spec.js: fake login, fake backend, frozen clock. No real
// data is touched and nothing is sent, so it's safe to re-run.

// "Today" for the browser, in India time like the app.
const TODAY = '2026-11-12T10:00:00+05:30' // a Thursday
test.use({
  timezoneId: 'Asia/Kolkata',
  // Partner Subscriptions hides its date controls below 1280px wide.
  viewport: { width: 1440, height: 900 },
})

// Once Overall is on, the dropdowns read "Overall" too, so "the button named
// Overall" would match several elements. Its tooltip is unique.
const OVERALL_TOOLTIP = 'All data from 11 Jun 2026 to today'

// Fake login + fake backend + frozen clock, shared by both tests.
// Returns `lastBody`: the body of the latest request to each API, by name,
// e.g. lastBody.getPartnerOverviewV2 -> { store_id, from, to }.
async function openFakeApp(page) {
  await page.clock.setFixedTime(new Date(TODAY))
  await page.addInitScript(() => localStorage.setItem('token', 'fake-e2e-token'))

  const lastBody = {}
  await page.route('**/admin/**', async (route) => {
    const request = route.request()
    const api = new URL(request.url()).pathname.split('/').pop()
    if (api === 'sse') return route.abort() // the live-bookings stream isn't needed here

    lastBody[api] = request.postDataJSON()
    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' }, // the API is on another origin
      json: { data: null }, // no data: the page shows its empty / loading state
    })
  })
  return lastBody
}

// ---------------------------------------------------------------------------
// Partner Details V2
// ---------------------------------------------------------------------------

const STORE_ID = 101 // any salon id: the backend is fake

// Worked out by hand for TODAY.
const DETAILS_DEFAULT = { option: 'Last 30 Days', from: '2026-10-14', to: '2026-11-12', pill: '14 Oct – 12 Nov 2026' }
const DETAILS_PRESETS = [
  { option: 'Last 7 Days', from: '2026-11-06', to: '2026-11-12', pill: '6 Nov – 12 Nov 2026' },
  { option: 'Last 90 Days', from: '2026-08-15', to: '2026-11-12', pill: '15 Aug – 12 Nov 2026' },
  { option: 'This Month', from: '2026-11-01', to: '2026-11-12', pill: '1 Nov – 12 Nov 2026' },
  { option: 'Last Month', from: '2026-10-01', to: '2026-10-31', pill: '1 Oct – 31 Oct 2026' },
]
const DETAILS_OVERALL = { option: 'Overall', from: '2026-06-11', to: '2026-11-12', pill: '11 Jun – 12 Nov 2026' }

test('Partner Details V2: each period loads the right dates', async ({ page }) => {
  const lastBody = await openFakeApp(page)

  const periodMenu = page.getByRole('button', { name: 'Period' })
  const overallButton = page.getByTitle(OVERALL_TOOLTIP)
  const datePill = page.getByRole('button', { name: 'Custom date range' })

  const choosePeriod = async (option) => {
    await periodMenu.click()
    await page.getByRole('option', { name: option }).click()
  }

  // Checks everything one choice should change.
  const expectPeriod = async ({ option, from, to, pill }) => {
    // 1. The salon's overview was asked for exactly these dates.
    await expect.poll(() => lastBody.getPartnerOverviewV2).toEqual({ store_id: STORE_ID, from, to })
    // 2. The date pill shows the range.
    await expect(datePill).toHaveText(pill)
    // 3. The Peak Hours card names the period.
    await expect(page.getByText(`Peak Hours (${option})`)).toBeVisible()
  }

  await page.goto(`/partner-details-v2/${STORE_ID}`)

  await test.step('Opens on Last 30 Days', async () => {
    await expectPeriod(DETAILS_DEFAULT)
    await expect(overallButton).toHaveAttribute('aria-pressed', 'false')
  })

  for (const preset of DETAILS_PRESETS) {
    await test.step(`Period: ${preset.option}`, async () => {
      await choosePeriod(preset.option)
      await expectPeriod(preset)
    })
  }

  await test.step('Overall button', async () => {
    await overallButton.click()
    await expectPeriod(DETAILS_OVERALL)
    await expect(overallButton).toHaveAttribute('aria-pressed', 'true')
  })

  await test.step('Picking a period again turns Overall off', async () => {
    await periodMenu.click()
    // While Overall is on, the Period menu lists it, ticked.
    await expect(page.getByRole('option', { name: 'Overall' })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('option', { name: DETAILS_DEFAULT.option }).click()

    await expectPeriod(DETAILS_DEFAULT)
    await expect(overallButton).toHaveAttribute('aria-pressed', 'false')
  })
})

// ---------------------------------------------------------------------------
// Partner Subscriptions V2
// ---------------------------------------------------------------------------

// This page sends each period as two ranges: `cur` (the period itself) and
// `prev` (the same number of days just before it, for the "vs previous
// period" numbers). Worked out by hand for TODAY.
const SUBS_DEFAULT = {
  option: 'Last 30 days',
  cur: ['2026-10-14', '2026-11-12'],
  prev: ['2026-09-14', '2026-10-13'],
}
const SUBS_PRESETS = [
  { option: 'Last 7 days', cur: ['2026-11-06', '2026-11-12'], prev: ['2026-10-30', '2026-11-05'] },
  { option: 'Last 90 days', cur: ['2026-08-15', '2026-11-12'], prev: ['2026-05-17', '2026-08-14'] },
  { option: 'Last 12 months', cur: ['2025-11-13', '2026-11-12'], prev: ['2024-11-13', '2025-11-12'] },
]
// 11 Jun – 12 Nov is 155 days, so the previous period is the 155 days before it.
const SUBS_OVERALL = { option: 'Overall', cur: ['2026-06-11', '2026-11-12'], prev: ['2026-01-07', '2026-06-10'] }

test('Partner Subscriptions V2: each period loads the right dates', async ({ page }) => {
  const lastBody = await openFakeApp(page)

  // The range dropdown has no label, so find it as the only dropdown in the
  // app bar (<header>, which has the role "banner").
  const rangeMenu = page.getByRole('banner').locator('button[aria-haspopup="listbox"]')
  const overallButton = page.getByTitle(OVERALL_TOOLTIP)

  const chooseRange = async (option) => {
    await rangeMenu.click()
    await page.getByRole('option', { name: option }).click()
  }

  // Checks everything one choice should change.
  const expectRange = async ({ option, cur, prev }) => {
    const expected = [
      { key: 'cur', from: cur[0], to: cur[1] },
      { key: 'prev', from: prev[0], to: prev[1] },
    ]
    // 1. The subscriptions summary was asked for this period and the one before.
    await expect.poll(() => lastBody.getManualSubscriptionsSummaryV2?.ranges).toEqual(expected)
    // 2. So were the metrics (their first two ranges; the rest are the chart's
    //    12 months, which don't depend on the period).
    await expect.poll(() => lastBody.getDashboardV2Metrics?.ranges.slice(0, 2)).toEqual(expected)
    // 3. The dropdown shows the choice.
    await expect(rangeMenu).toHaveAccessibleName(option)
  }

  await page.goto('/partner-subscriptions-v2')

  await test.step('Opens on Last 30 days', async () => {
    await expectRange(SUBS_DEFAULT)
    await expect(overallButton).toHaveAttribute('aria-pressed', 'false')
  })

  for (const preset of SUBS_PRESETS) {
    await test.step(`Range: ${preset.option}`, async () => {
      await chooseRange(preset.option)
      await expectRange(preset)
    })
  }

  await test.step('Overall button', async () => {
    await overallButton.click()
    await expectRange(SUBS_OVERALL)
    await expect(overallButton).toHaveAttribute('aria-pressed', 'true')
  })

  await test.step('Picking a range again turns Overall off', async () => {
    await rangeMenu.click()
    // While Overall is on, the dropdown lists it, ticked.
    await expect(page.getByRole('option', { name: 'Overall' })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('option', { name: SUBS_DEFAULT.option }).click()

    await expectRange(SUBS_DEFAULT)
    await expect(overallButton).toHaveAttribute('aria-pressed', 'false')
  })
})
