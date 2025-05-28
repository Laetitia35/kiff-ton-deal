require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const amazonPaapi = require('amazon-paapi');

const app = express();

const allowedOrigins = [
  'https://kiff-ton-deal.onrender.com', // frontend en production
  'http://localhost:8000',  // frontend local
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // autorise Postman/curl
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy ne permet pas cette origine : ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

// Logger simple des requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Vérification des credentials Amazon
const credentials = {
  accessKey: process.env.AMAZON_ACCESS_KEY,
  secretKey: process.env.AMAZON_SECRET_KEY,
  partnerTag: process.env.AMAZON_PARTNER_TAG,
  host: "webservices.amazon.fr",
  region: "eu-west-1"
};

if (!credentials.accessKey || !credentials.secretKey || !credentials.partnerTag) {
  console.error("❌ Erreur : les identifiants Amazon ne sont pas définis dans .env");
  process.exit(1);
}

const categories = {
  tech: "Electronics",
  mode: "Fashion",
  maison: "HomeGarden",
  beauté: "Beauty",
  sport: "SportingGoods"
};

const MAX_PAGES = 10;

// Endpoint santé
app.get("/ping", (req, res) => {
  res.send("pong");
});

// API Amazon
app.get("/api/amazon", async (req, res) => {
  const keyword = req.query.keyword?.trim() || "bons plans";
  const category = req.query.category;
  const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), MAX_PAGES);

  if (!keyword || typeof keyword !== "string") {
    return res.status(400).json({ error: "Mot-clé invalide" });
  }

  if (category && !categories[category]) {
    return res.status(400).json({ error: "Catégorie non valide" });
  }

  const searchIndex = categories[category] || "All";

  try {
    const result = await amazonPaapi.SearchItems({
      Keywords: keyword,
      SearchIndex: searchIndex,
      ItemCount: 10,
      ItemPage: page,
      Resources: [
        "Images.Primary.Medium",
        "ItemInfo.Title",
        "Offers.Listings.Price",
        "Offers.Listings.Savings"
      ],
      ...credentials
    });

    const items = result.SearchResult?.Items || [];

    const dealsWithPromo = items.filter(item => {
      const listing = item.Offers?.Listings?.[0];
      if (!listing || !listing.Price) return false;

      const price = listing.Price.Amount;
      const savings = listing.Savings?.Amount || 0;

      if (price + savings === 0) return false;

      const discountPercent = (savings / (price + savings)) * 100;
      return discountPercent >= 5;
    });

    res.json({ 
      items: dealsWithPromo,
      currentPage: page,
      totalPages: MAX_PAGES
    });

  } catch (err) {
    console.error("❌ Erreur API Amazon:", err);
    res.status(500).json({
      error: "Erreur lors de l'appel à l'API Amazon",
      details: err.message
    });
  }
});

// Lancement du serveur
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur en écoute sur http://localhost:${PORT}`);
});
