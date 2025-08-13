import { siteConfig } from '@/lib/seo'

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;

  // Static routes
  const routes = ['', '/dashboard', '/dashboard/interview', '/dashboard/copilot', '/dashboard/interview-history']
    .map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: route === '' ? 1.0 : 0.7,
    }));

  return [...routes];
}



