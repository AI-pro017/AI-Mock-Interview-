import './globals.css';
import { Toaster } from "@/components/ui/sonner";
import Provider from './Provider'
import ChatAssistant from '@/components/ui/chat-assistant'

export const metadata = {
  title: 'AI Mock Interview',
  description: 'Practice for your next interview with AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        <Provider>
          <ChatAssistant />
          {children}
          <Toaster />
        </Provider>
      </body>
    </html>
  );
} 