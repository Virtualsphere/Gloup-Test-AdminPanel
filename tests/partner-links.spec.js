import { test, expect } from '@playwright/test'

// V2 pages link to V2 pages. Two groups:
//   1. Opening a partner from a V2 page lands on the NEW partner page,
//      /partner-details-v2/:id — never the old /partnerdetails/:id.
//   2. The links on Partner Details V2's tabs open the V2 pages too.
//
// One test per link, so the report shows exactly which one breaks. Left out
// on purpose:
//   - the V1 pages (Partners, Verify Partner): they keep opening the old page;
//   - "Open Classic Page" in Partner Details V2's More Actions: it exists to
//     open the old page;
//   - Partner Details V2's links with no V2 version to go to: a salon's
//     monthly report / invoice, Create Offer and Manage offers.
//
// Fake login + fake backend, like the date filter tests: every API answers
// with one made-up partner, so no real data is touched.

const PARTNER_ID = 101
const NEW_PARTNER_PAGE = new RegExp(`/partner-details-v2/${PARTNER_ID}$`)

// What the fake backend returns, by API name. Each page reads the partner in
// its own shape; anything not listed here gets `null`.
const FAKE_DATA = {
  // The Partner Details V2 salon picker's list of partners
  getallpartner: [{ id: PARTNER_ID, name: 'Test Salon', status: 'active', images: [] }],
  // Monthly Report V2's salon table
  getMonthlyReportSalonsV2: { rows: [{ store_id: PARTNER_ID, partner_name: 'Test Salon' }], total: 1 },
  // Booking Details V2: a booking made at the partner's salon
  getBookingsDetailsById: { id: 555, store_id: PARTNER_ID, salon_name: 'Test Salon' },
  // Partner Details V2: the salon itself, with booking #555 under "Recent Bookings"
  getPartnerOverviewV2: {
    profile: { store_id: PARTNER_ID, name: 'Test Salon', status: 'active', payout_frequency: 'weekly' },
    periods: {},
    recent_bookings: [
      { id: 555, customer: 'Test Customer', services: 'Haircut', day: '2026-11-10', time: '10:00', amount: 300, status: 'completed' },
    ],
  },
  // Partner Details V2's Bookings tab, "Monthly bookings": booking #556
  getmonthlyinvoicedetails: {
    items: [{ appointment_id: 556, appointment_date: '2026-11-10', booking_time: '11:00', service_name: 'Facial', amount: 500 }],
  },
}

test.beforeEach(async ({ page }) => {
  // Fake login: the app only checks that a token exists in localStorage.
  await page.addInitScript(() => localStorage.setItem('token', 'fake-e2e-token'))

  // Fake backend.
  await page.route('**/admin/**', async (route) => {
    const api = new URL(route.request().url()).pathname.split('/').pop()
    if (api === 'sse') return route.abort() // the live-bookings stream isn't needed here

    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' }, // the API is on another origin
      json: { data: FAKE_DATA[api] ?? null },
    })
  })
})

test.describe('Opening a partner from a V2 page goes to the new Partner Details V2 page', () => {
  test('from Monthly Report V2 (row menu > Open partner profile)', async ({ page }) => {
    await page.goto('/monthly-report-v2')
    const salonRow = page.getByRole('row').filter({ hasText: 'Test Salon' })
    await salonRow.getByRole('button', { name: 'More actions' }).click()
    await page.getByRole('menuitem', { name: 'Open partner profile' }).click()

    await expect(page).toHaveURL(NEW_PARTNER_PAGE)
  })

  test('from Booking Details V2 (Open the salon)', async ({ page }) => {
    await page.goto('/booking-details-v2/555')
    await page.getByRole('button', { name: 'Open the salon' }).click()

    await expect(page).toHaveURL(NEW_PARTNER_PAGE)
  })

  test('from Partner Details V2 (salon picker)', async ({ page }) => {
    await page.goto('/partner-details-v2')
    await page.getByRole('button', { name: /Test Salon/ }).click()

    await expect(page).toHaveURL(NEW_PARTNER_PAGE)
  })
})

test.describe('Links on Partner Details V2 open V2 pages', () => {
  // Every test here starts on the partner's page and opens one of its tabs.
  const openTab = async (page, tab) => {
    await page.goto(`/partner-details-v2/${PARTNER_ID}`)
    await page.getByRole('tab', { name: tab }).click()
  }

  test('Bookings tab: Recent Bookings > View', async ({ page }) => {
    await openTab(page, 'Bookings')
    const bookingRow = page.getByRole('row').filter({ hasText: 'Test Customer' })
    await bookingRow.getByRole('button', { name: 'View' }).click()

    await expect(page).toHaveURL(/\/booking-details-v2\/555$/)
  })

  test('Bookings tab: Monthly bookings > View', async ({ page }) => {
    await openTab(page, 'Bookings')
    const bookingRow = page.getByRole('row').filter({ hasText: '#556' })
    await bookingRow.getByRole('button', { name: 'View' }).click()

    await expect(page).toHaveURL(/\/booking-details-v2\/556$/)
  })

  test('Reviews tab: Moderate in Reviews', async ({ page }) => {
    await openTab(page, 'Reviews')
    await page.getByRole('button', { name: 'Moderate in Reviews' }).click()

    await expect(page).toHaveURL(/\/reviews-ratings-v2$/)
  })

  test('Subscriptions tab: Manage in Partner Subscriptions', async ({ page }) => {
    await openTab(page, 'Subscriptions')
    await page.getByRole('button', { name: 'Manage in Partner Subscriptions' }).click()

    await expect(page).toHaveURL(/\/partner-subscriptions-v2$/)
  })
})
