// Simple dynamic Open Graph image (placeholder). You can replace with @vercel/og for richer images.
export async function GET() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="56">AI Mock Interview</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="#93c5fd" font-family="Arial, Helvetica, sans-serif" font-size="28">Practice. Improve. Get hired.</text></svg>`;
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}



