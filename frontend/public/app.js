// app.js

// debounce helper
function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

//const API_URL = "/api/amazon"; // ✅ fonctionne localement ET en ligne
const API_URL = "https://api-kiff-ton-deal.onrender.com"

async function fetchDeals(query = "bons plans") {
    const loader = document.getElementById("loading");
    const container = document.getElementById("deals-container");

    loader.style.display = "block";        // Affiche le loader
    container.innerHTML = "";              // Vide le contenu pendant chargement

    try {
        const res = await fetch(`${API_URL}?keyword=${encodeURIComponent(query)}`);
        const data = await res.json();
        displayDeals(data.Items || []);
    } catch (error) {
        console.error("Erreur lors de la récupération des produits:", error);
        container.innerHTML = "<p>Erreur lors du chargement des bons plans.</p>";
    } finally {
        loader.style.display = "none";     // Masque le loader quoi qu'il arrive
    }
}


function displayDeals(items) {
    const container = document.getElementById("deals-container");
    container.innerHTML = "";
    if (items.length === 0) {
        container.innerHTML = "<p>Aucun bon plan trouvé ou une erreur est survenue.</p>";
        return;
    }
    items.forEach((item) => {
        const title = item.ItemInfo?.Title?.DisplayValue || "Sans titre";
        const image = item.Images?.Primary?.Medium?.URL || "https://via.placeholder.com/300x180?text=Pas+d%27image";
        const price = item.Offers?.Listings?.[0]?.Price?.DisplayAmount || "Prix non dispo";
        const url = item.DetailPageURL || "#";

        const priceAmount = Number(item.Offers?.Listings?.[0]?.Price?.Amount) || 0;
        const savingsAmount = Number(item.Offers?.Listings?.[0]?.Savings?.Amount) || 0;
        const discountPercent = (savingsAmount && priceAmount + savingsAmount > 0)
            ? Math.round((savingsAmount / (priceAmount + savingsAmount)) * 100)
            : 0;

        const card = document.createElement("div");
        card.className = "deal";
        card.innerHTML = `
          <a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Voir le bon plan: ${title}">
            <img src="${image}" alt="${title}" />
          </a>
          <div class="content">
            <div class="title">${title}</div>
            <div class="price">${price}</div>
            ${discountPercent > 0 ? `<div class="badge-promo">-${discountPercent}%</div>` : ""}
          </div>
        `;
        container.appendChild(card);
    });
}

document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const keyword = btn.getAttribute('data-keyword');
        fetchDeals(keyword);
        // Met à jour la barre de recherche aussi
        document.getElementById('search').value = keyword;
    });
});


const searchInput = document.getElementById("search");
const btnSearch = document.getElementById("btn-search");

searchInput.setAttribute("aria-label", "Recherche de bons plans");

// Rechercher au clavier avec délai
searchInput.addEventListener("input", debounce((e) => {
    const val = e.target.value.trim();
    if(val.length > 0) {
        fetchDeals(val);
    } else {
        fetchDeals();
    }
}, 300));

// Rechercher au clic sur bouton
btnSearch.addEventListener("click", () => {
    const val = searchInput.value.trim();
    fetchDeals(val.length > 0 ? val : "bons plans");
});

// Menu burger
const burger = document.getElementById('burger');
const navLinks = document.getElementById('nav-links');

burger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});


// Chargement initial
fetchDeals();



