// server.js

const cors = require("cors");
const { DefaultApi, Configuration } = require("amazon-paapi");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(cors());

const amazon = new DefaultApi(
    new Configuration({
        accessKey: process.env.AMAZON_ACCESS_KEY,
        secretKey: process.env.AMAZON_SECRET_KEY,
        partnerTag: process.env.AMAZON_PARTNER_TAG,
        marketplace: "www.amazon.fr",
        // host: "webservices.amazon.fr", // optionnel, par défaut
    })
);

const items = result.SearchResult?.Items || [];

const dealsWithPromo = items.filter(item => {
    const price = item.Offers?.Listings?.[0]?.Price?.Amount;
    const savings = item.Offers?.Listings?.[0]?.Savings?.Amount || 0;
    if (!price) return false;
    const discountPercent = (savings / (price + savings)) * 100;
    return discountPercent >= 5;
});

res.json({ Items: dealsWithPromo });

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

        // Filtrer les deals avec au moins 5% de réduction
        const dealsWithPromo = items.filter(item => {
            const listing = item.Offers?.Listings?.[0];
            if (!listing || !listing.Price) return false;

            const price = listing.Price.Amount;
            const savings = listing.Savings?.Amount || 0;

            // éviter division par zéro
            if (price + savings === 0) return false;

            const discountPercent = (savings / (price + savings)) * 100;
            return discountPercent >= 5;
        });

        res.json({ Items: dealsWithPromo });
    } catch (err) {
        console.error("Erreur API Amazon:", err);
        res.status(500).json({ error: "Erreur lors de l'appel à l'API Amazon", details: err.message });
    }
});

app.listen(port, () => {
    console.log(`Serveur en écoute sur http://localhost:${port}`);
});






