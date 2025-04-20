// app/layout.tsx
import './globals.css';                // your Tailwind / global styles
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real-Estate Assistant',
  description:
    'Multi-agent chatbot (image + text) powered by Google Gemini APIs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-slate-100 text-slate-900 antialiased flex flex-col min-h-screen">
        {/* ---- SITE HEADER ---- */}
        <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <h1 className="text-xl font-semibold text-slate-800">
              Real-Estate Assistant
            </h1>
          </div>
        </header>

        {/* ---- PAGE CONTENT ---- */}
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

        {/* ---- SITE FOOTER ---- */}
        <footer className="bg-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Real-Estate Assistant – Demo Only.
          </div>
        </footer>
      </body>
    </html>
  );
}
