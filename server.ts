import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  app.post("/api/upload-github", async (req, res) => {
    try {
      const { filename, content } = req.body;
      const pat = process.env.GITHUB_PAT;
      const owner = process.env.GITHUB_REPO_OWNER || "raffaele-ando";
      const repo = process.env.GITHUB_REPO_NAME || "Logo-vari";
      
      if (!pat) {
         return res.status(500).json({ error: "Configura il GITHUB_PAT nelle variabili d'ambiente per abilitare i caricamenti." });
      }

      if (!filename || !content) {
         return res.status(400).json({ error: "Missing filename or content" });
      }

      const octokitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, {
        headers: {
          "Authorization": `Bearer ${pat}`,
          "Accept": "application/vnd.github.v3+json",
        }
      });
      
      let sha;
      if (octokitRes.ok) {
         const data = await octokitRes.json();
         sha = data.sha;
      }
      
      const base64Data = content.split(",")[1] || content;

      const uploadRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${pat}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Update ${filename}`,
          content: base64Data,
          sha: sha
        })
      });

      if (!uploadRes.ok) {
         const errorData = await uploadRes.text();
         console.error("Github API Error:", errorData);
         return res.status(500).json({ error: "Errore durante il caricamento su GitHub." });
      }

      const fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filename}?v=${Date.now()}`;
      
      res.json({ url: fileUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Errore del server durante il caricamento." });
    }
  });

  app.get("/api/export-video", async (req, res) => {
    try {
      const outPath = path.join(process.cwd(), "agora-video.mp4");
      
      console.log("Inizio render video Remotion...");
      // Render using the CLI directly so Chrome Headless can be utilized automatically
      const child = exec(`npx remotion render src/remotion/index.tsx Video ${outPath}`);
      
      child.stdout?.on('data', data => console.log(data));
      child.stderr?.on('data', data => console.error(data));

      child.on("close", (code) => {
        if (code === 0 && fs.existsSync(outPath)) {
          console.log("Video generato con successo!");
          res.download(outPath, "agora-video.mp4", (err) => {
            if (err) console.error("Download fail:", err);
            // Cleanup after sending
            try { fs.unlinkSync(outPath); } catch(e){}
          });
        } else {
          res.status(500).json({ error: "Errore durante il render di Remotion. Codice: " + code });
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Errore interno del server durante l'esportazione." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
