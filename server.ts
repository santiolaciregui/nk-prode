import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getPartidos } from "./src/services/promiedos.service";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 4000;

  // Add the scraper endpoint
  app.get("/api/results", async (req, res) => {
    try {
      const partidos = await getPartidos();
      console.log(`Scraped ${partidos.length} matches`);
      res.json(partidos);
    } catch (error: any) {
        console.error("Scraper Error:", error.message);
        res.status(500).json({ error: 'Internal Server Error' });
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
