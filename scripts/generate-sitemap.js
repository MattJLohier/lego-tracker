/**
 * generate-sitemap.js
 *
 * Runs after `vite build` to create /dist/sitemap.xml
 * Fetches all product slugs from Supabase so Google knows about every product page.
 *
 * Usage:  node scripts/generate-sitemap.js
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const SITE_URL = 'https://studmetrics.com'

// ── Supabase client (reuses the same env vars your app uses) ──
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars')
  console.error('   Make sure they are set in your Netlify environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Static routes (public, SEO-worthy pages) ──
const staticRoutes = [
  { path: '/',              changefreq: 'daily',  priority: 1.0 },
  { path: '/explore',       changefreq: 'daily',  priority: 0.9 },
  { path: '/market-report', changefreq: 'weekly', priority: 0.8 },
  { path: '/compare',       changefreq: 'weekly', priority: 0.6 },
  { path: '/reports',       changefreq: 'weekly', priority: 0.6 },
]

async function fetchAllProductSlugs() {
  console.log('📦 Fetching product slugs from Supabase...')

  let allSlugs = []
  let from = 0
  const pageSize = 1000

  // Paginate through all products (Supabase caps select at 1000 rows)
  while (true) {
    const { data, error } = await supabase
      .from('v_latest_products')
      .select('slug')
      .not('slug', 'is', null)
      .order('slug', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('❌ Supabase query failed:', error.message)
      break
    }

    if (!data || data.length === 0) break

    allSlugs = allSlugs.concat(data.map(row => row.slug))
    from += pageSize

    // If we got fewer than pageSize, we've reached the end
    if (data.length < pageSize) break
  }

  console.log(`   Found ${allSlugs.length} products`)
  return allSlugs
}

function buildSitemapXml(staticRoutes, productSlugs) {
  const today = new Date().toISOString().split('T')[0]

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`

  // Static routes
  for (const route of staticRoutes) {
    xml += `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`
  }

  // Product pages
  for (const slug of productSlugs) {
    xml += `  <url>
    <loc>${SITE_URL}/product/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`
  }

  xml += `</urlset>
`
  return xml
}

async function main() {
  console.log('🗺️  Generating sitemap...\n')

  const slugs = await fetchAllProductSlugs()
  const xml = buildSitemapXml(staticRoutes, slugs)

  const outputPath = resolve('dist/sitemap.xml')
  writeFileSync(outputPath, xml, 'utf-8')

  const totalUrls = staticRoutes.length + slugs.length
  console.log(`\n✅ Sitemap written to ${outputPath}`)
  console.log(`   ${totalUrls} URLs (${staticRoutes.length} static + ${slugs.length} products)`)
}

main().catch(err => {
  console.error('❌ Sitemap generation failed:', err)
  process.exit(1)
})