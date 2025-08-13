import { siteConfig } from '@/lib/seo'

export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}



