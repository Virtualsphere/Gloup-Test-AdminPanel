import { test, expect } from '@playwright/test'

// Salon Heatmap V2 (/salon-heatmap-v2) on a laptop screen. Collapsing the
// sidebar gives the page more room, and the layout should use it:
//   - the map gets wider (716px -> 892px at 1366px wide),
//   - the "Top Performing Areas" panel beside it keeps its width (360px),
//   - the five KPI cards resize from two rows (3 + 2) into one row of five.
// Expanding the sidebar again puts everything back.
//
// This is the uat layout. Before it (master), the panel dropped under the map
// and the KPI cards stayed in 3 + 2, so this test fails on that code.
//
// The map, panel and KPI row have no role or label, so the page marks them
// with data-testid="…" for the test to find them (page.getByTestId).

test.use({ viewport: { width: 1366, height: 768 } }) // a common laptop screen

test('Collapsing the sidebar makes the map bigger and resizes the KPI cards', async ({ page }) => {
  // ---------- Setup: fake login + fake backend (no data needed for layout) ----------
  await page.addInitScript(() => localStorage.setItem('token', 'fake-e2e-token'))
  await page.route('**/admin/**', async (route) => {
    if (route.request().url().includes('/sse')) return route.abort()
    await route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: { data: null } })
  })

  const map = page.getByTestId('heatmap-map')
  const rankingPanel = page.getByTestId('heatmap-ranking')
  const kpiCards = page.getByTestId('heatmap-kpis').locator(':scope > *') // the cards inside the row

  // Width of an element on screen, in pixels.
  const widthOf = async (locator) => (await locator.boundingBox()).width
  // How many rows the KPI cards sit in: cards on the same row share a top edge.
  const kpiRowCount = async () => {
    const tops = await kpiCards.evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)))
    return new Set(tops).size
  }
  // The KPI cards' widths, rounded.
  const kpiWidths = async () =>
    kpiCards.evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().width)))

  await page.goto('/salon-heatmap-v2')
  await expect(kpiCards).toHaveCount(5)

  // ---------- Sidebar open ----------
  let mapWidthBefore
  let panelWidthBefore
  await test.step('Sidebar open: KPI cards in two rows', async () => {
    await expect.poll(kpiRowCount).toBe(2)
    mapWidthBefore = await widthOf(map)
    panelWidthBefore = await widthOf(rankingPanel)
  })

  // ---------- Collapse it ----------
  await test.step('Collapse the sidebar: map wider, KPI cards on one row', async () => {
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()

    // expect.poll keeps measuring until it matches, because the sidebar animates.
    // 1. The KPI cards resize into one row of five equal cards.
    await expect.poll(kpiRowCount).toBe(1)
    const widths = await kpiWidths()
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1)

    // 2. The map is bigger: at least 150px wider (it gets all the extra room).
    await expect.poll(() => widthOf(map)).toBeGreaterThan(mapWidthBefore + 150)

    // 3. The ranking panel keeps its width — the map took the room, not the panel.
    expect(Math.round(await widthOf(rankingPanel))).toBe(Math.round(panelWidthBefore))
  })

  // ---------- Expand it again ----------
  await test.step('Expand the sidebar again: back to how it was', async () => {
    await page.getByRole('button', { name: 'Expand sidebar' }).click()

    await expect.poll(kpiRowCount).toBe(2)
    await expect.poll(async () => Math.round(await widthOf(map))).toBe(Math.round(mapWidthBefore))
  })
})
