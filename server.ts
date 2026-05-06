import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.set('trust proxy', true);

  // API Route for IP info
  app.get('/api/ip-info', async (req, res) => {
    try {
      let ip = req.ip || req.socket.remoteAddress || "Unknown";
      if (ip.startsWith('::ffff:')) {
        ip = ip.split(':').pop() || ip;
      }
      
      let isPrivate = false;
      if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
        isPrivate = true;
      } else if (ip.startsWith('172.')) {
        const second = parseInt(ip.split('.')[1], 10);
        if (second >= 16 && second <= 31) {
          isPrivate = true;
        }
      }

      if (isPrivate) {
         res.json({ ip: ip || "Local", country: "Local", region: "Local", city: "Local", isp: "Local" });
         return;
      }

      // Using geojs.io for server-side lookup (very reliable and no strict rate limits)
      const controller1 = new AbortController();
      const timeout1 = setTimeout(() => controller1.abort(), 5000);
      try {
        const response = await fetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`, { signal: controller1.signal });
        clearTimeout(timeout1);
        if (response.ok) {
          const data = await response.json();
          res.json({
            ip: data.ip || ip,
            country: data.country || "Unknown",
            region: data.region || "Unknown",
            city: data.city || "Unknown",
            isp: data.organization || "Unknown"
          });
          return;
        }
      } catch (e) {
        clearTimeout(timeout1);
        console.error("GeoJS timeout/error:", e);
      }

      // Fallback to ipapi.co
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 5000);
      try {
        const fbRes = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller2.signal });
        clearTimeout(timeout2);
        if (fbRes.ok) {
          const data = await fbRes.json();
          res.json({
            ip: data.ip || ip,
            country: data.country_name || "Unknown",
            region: data.region || "Unknown",
            city: data.city || "Unknown",
            isp: data.org || "Unknown"
          });
          return;
        }
      } catch (e) {
        clearTimeout(timeout2);
        console.error("ipapi timeout/error:", e);
      }
      
      res.json({ ip, country: "Unknown", region: "Unknown", city: "Unknown", isp: "Unknown" });
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
      // If the path has an extension, it's likely a missing asset
      if (req.path.includes('.')) {
        res.status(404).send('Not Found');
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
