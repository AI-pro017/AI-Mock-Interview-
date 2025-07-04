import './globals.css';

export const metadata = {
  title: 'AI Mock Interview',
  description: 'Practice for your next interview with AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
} 