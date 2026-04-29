import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', true);

  // API Route for IP info
  app.get('/polimi/api/ip-info', async (req, res) => {
    try {
      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if (Array.isArray(ip)) ip = ip[0];
      if (typeof ip === 'string') ip = ip.split(',')[0].trim();
      
      if (!ip || ip === '::1' || ip === '127.0.0.1') {
        ip = '8.8.8.8'; // Fallback for local testing
      }

      // Using ip-api.com for server-side lookup (allows 45 requests per minute per IP)
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,query`);
      const data = await response.json();
      
      if (data.status === 'success') {
        res.json({
          ip: data.query,
          country: data.country,
          region: data.regionName,
          city: data.city,
          isp: data.isp
        });
      } else {
        res.json({ ip, country: "Unknown", region: "Unknown", city: "Unknown", isp: "Unknown" });
      }
    } catch (e) {
      console.error("IP lookup error:", e);
      res.json({ ip: "Unknown", country: "Unknown", region: "Unknown", city: "Unknown", isp: "Unknown" });
    }
  });

  // Root and old paths redirects
  app.get('/', (req, res) => res.redirect('/polimi'));
  app.get('/dashboard', (req, res) => res.redirect('/polimi/dashboard'));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use('/polimi', express.static(distPath));
    // For Express 4
    app.get('/polimi*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
