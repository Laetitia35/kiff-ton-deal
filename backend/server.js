require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Cache simple en mémoire
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(keyword, category, page) {
  return `${keyword.toLowerCase()}::${category || "All"}::${page}`;
}

// Rate limiting simple (1 requête toutes les 1.1 secondes)
let lastApiCallTimestamp = 0;
const API_CALL_DELAY_MS = 1100; // 1.1 sec

async function waitIfNeeded() {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTimestamp;

  if (timeSinceLastCall < API_CALL_DELAY_MS) {
    const waitTime = API_CALL_DELAY_MS - timeSinceLastCall;
    console.log(`⏳ Attente de ${waitTime}ms pour respecter la limite API`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastApiCallTimestamp = Date.now();
}

// Endpoint santé
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Endpoint de recherche Amazon
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

  const cacheKey = getCacheKey(keyword, category, page);
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp < CACHE_DURATION)) {
    console.log("✅ Résultat renvoyé depuis le cache");
    return res.json(cached.data);
  }

  try {
    await waitIfNeeded();

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

    // Filtrage des produits avec promo >= 5%
    const dealsWithPromo = items.filter(item => {
      const listing = item.Offers?.Listings?.[0];
      if (!listing || !listing.Price) return false;

      const price = listing.Price.Amount;
      const savings = listing.Savings?.Amount || 0;

      if (price + savings === 0) return false;

      const discountPercent = (savings / (price + savings)) * 100;
      return discountPercent >= 5;
    });

    const responseData = {
      items: dealsWithPromo,
      currentPage: page,
      totalPages: MAX_PAGES
    };

    // Mise en cache
    cache.set(cacheKey, {
      timestamp: now,
      data: responseData
    });

    res.json(responseData);

  } catch (err) {
    console.error("❌ Erreur API Amazon:", err);

    let statusCode = 500;
    let userMessage = "Erreur lors de l'appel à l'API Amazon";

    if (err.Code === "TooManyRequests") {
      statusCode = 429;
      userMessage = "Trop de requêtes envoyées. Merci de réessayer plus tard.";
    } else if (err.Code === "InvalidParameterValue") {
      statusCode = 400;
      userMessage = "Paramètre invalide envoyé à l'API Amazon.";
    } else if (err.Code === "MissingParameter") {
      statusCode = 400;
      userMessage = "Paramètre manquant dans la requête.";
    } else if (err.Code === "InvalidAccessKeyId" || err.Code === "SignatureDoesNotMatch") {
      statusCode = 401;
      userMessage = "Identifiants Amazon invalides. Contactez l’administrateur.";
    }

    res.status(statusCode).json({
      error: userMessage,
      details: err.Message || err.message || "Erreur inconnue"
    });
  }
});

// Lancement du serveur
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur en écoute sur http://localhost:${PORT}`);
});

