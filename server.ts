import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', true);

  // API Route for IP info
  app.get('/api/ip-info', async (req, res) => {
    try {
      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if (Array.isArray(ip)) ip = ip[0];
      if (typeof ip === 'string') ip = ip.split(',')[0].trim();
      
      if (!ip || ip === '::1' || ip === '127.0.0.1') {
        ip = '8.8.8.8'; // Fallback for local testing
      }

      // Using geojs.io for server-side lookup (very reliable and no strict rate limits)
      const response = await fetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`);
      if (response.ok) {
        const data = await response.json();
        res.json({
          ip: data.ip || ip,
          country: data.country || "Unknown",
          region: data.region || "Unknown",
          city: data.city || "Unknown",
          isp: data.organization || "Unknown"
        });
      } else {
        // Fallback to ipapi.co
        const fbRes = await fetch(`https://ipapi.co/${ip}/json/`);
        if (fbRes.ok) {
          const data = await fbRes.json();
          res.json({
            ip: data.ip || ip,
            country: data.country_name || "Unknown",
            region: data.region || "Unknown",
            city: data.city || "Unknown",
            isp: data.org || "Unknown"
          });
        } else {
          res.json({ ip, country: "Unknown", region: "Unknown", city: "Unknown", isp: "Unknown" });
        }
      }
    } catch (e) {
      console.error("IP lookup error:", e);
      res.json({ ip: "Unknown", country: "Unknown", region: "Unknown", city: "Unknown", isp: "Unknown" });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 4
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
