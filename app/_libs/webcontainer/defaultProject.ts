import type { FileSystemTree } from "@webcontainer/api";

const DEFAULT_PAGE_CONTENT = `export default function Page() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '2rem',
        background: 'linear-gradient(145deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#f8f8f2',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '2.5rem 3rem',
          borderRadius: '1rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 60px rgba(0,0,0,0.4)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #f8f8f2 0%, #bd93f9 50%, #ff79c6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Claw Cartel
        </h1>
        <p
          style={{
            margin: '1rem 0 0',
            fontSize: '1rem',
            color: 'rgba(248,248,242,0.7)',
            fontWeight: 500,
          }}
        >
          Edit the code → preview updates live.
        </p>
        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: 'rgba(248,248,242,0.5)',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#50fa7b', animation: 'pulse 1.5s ease-in-out infinite' }} />
          Ready
        </div>
      </div>
    </main>
  );
}
`;

export const defaultPageContent = DEFAULT_PAGE_CONTENT;

export const defaultProject: FileSystemTree = {
  "package.json": {
    file: {
      contents: JSON.stringify(
        {
          name: "claw-cartel",
          private: true,
          version: "0.0.0",
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
          },
          dependencies: {
            next: "^14.0.0",
            react: "^18.2.0",
            "react-dom": "^18.2.0",
          },
        },
        null,
        2
      ),
    },
  },
  "next.config.mjs": {
    file: {
      contents: `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`,
    },
  },
  app: {
    directory: {
      "layout.js": {
        file: {
          contents: `import './globals.css';

export const metadata = {
  title: 'Claw Cartel',
  description: 'Claw Cartel — Next.js app running in WebContainer',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
        },
      },
      "page.jsx": {
        file: {
          contents: DEFAULT_PAGE_CONTENT,
        },
      },
      "globals.css": {
        file: {
          contents: `* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}
`,
        },
      },
    },
  },
};
