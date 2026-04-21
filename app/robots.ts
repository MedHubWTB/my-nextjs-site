import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/agency-dashboard', '/onboarding'],
    },
    sitemap: 'https://quietmedical.co.uk/sitemap.xml',
  }
}