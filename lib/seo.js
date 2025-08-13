// Centralized site SEO config
export const siteConfig = {
  name: 'AI Mock Interview',
  title: 'AI Mock Interview | Land Your Dream Job',
  description:
    'Practice your interview skills with an AI-powered mock interviewer. Get instant feedback and improve your performance.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://ai-mock-interview.example.com',
  ogImage: '/og-image.jpg',
  twitter: '@aimockinterview',
  locale: 'en_US'
};

export const defaultOpenGraph = {
  type: 'website',
  title: siteConfig.title,
  description: siteConfig.description,
  url: siteConfig.url,
  siteName: siteConfig.name,
  images: [
    {
      url: siteConfig.ogImage,
      width: 1200,
      height: 630,
      alt: siteConfig.title
    }
  ],
  locale: siteConfig.locale
};

export const defaultTwitter = {
  card: 'summary_large_image',
  site: siteConfig.twitter,
  creator: siteConfig.twitter,
  title: siteConfig.title,
  description: siteConfig.description,
  images: [siteConfig.ogImage]
};



