import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'StudMetrics'
const BASE_URL = 'https://studmetrics.com' // TODO: update if your domain is different
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`

/**
 * Drop-in SEO component. Use on every page:
 *
 *   <SEO
 *     title="LEGO Star Wars 75192 Price History"
 *     description="Track prices for the Millennium Falcon..."
 *     path="/product/75192-millennium-falcon"
 *   />
 *
 * For product pages, pass jsonLd with Product structured data.
 * For auth/private pages, pass noindex={true}.
 */
export default function SEO({
  title,
  description,
  path = '',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  jsonLd = null,
  noindex = false,
}) {
  const fullTitle = title
    ? `${title} — ${SITE_NAME}`
    : `${SITE_NAME} — LEGO Price Tracker & Market Intelligence`
  const url = `${BASE_URL}${path}`

  return (
    <Helmet>
      {/* Core */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  )
}