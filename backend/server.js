// server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const amazonPaapi = require("amazon-paapi");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Par celui-ci :
const amazon = amazonPaapi.DefaultApi({
    accessKey: process.env.AMAZON_ACCESS_KEY,
    secretKey: process.env.AMAZON_SECRET_KEY,
    partnerTag: process.env.AMAZON_PARTNER_TAG,
    marketplace: "www.amazon.fr",
});

// API endpoint
app.get("/api/amazon", async (req, res) => {
    const keyword = req.query.keyword || "bons plans";
    try {
        const result = await amazon.searchItems({
            Keywords: keyword,
            SearchIndex: "All",
            ItemCount: 10,
            Resources: [
                "Images.Primary.Medium",
                "ItemInfo.Title",
                "Offers.Listings.Price",
                "Offers.Listings.Savings"
            ]
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

        res.json({ Items: dealsWithPromo });
    } catch (err) {
        console.error("Erreur API Amazon:", err);
        res.status(500).json({
            error: "Erreur lors de l'appel à l'API Amazon",
            details: err.message
        });
    }
});

// Fallback route to support SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Serveur en écoute sur http://localhost:${PORT}`);
});







