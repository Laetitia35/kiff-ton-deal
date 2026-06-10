const API_URL = "https://api-kiff-ton-deal.onrender.com/api/amazon";

let currentPage = 1;
let maxPages = 10;
let currentKeyword = "";
let currentCategory = "";
let isDemoMode = false;

// Éléments DOM
const container = document.getElementById("deals-container");
const searchInput = document.getElementById("search");
const btnSearch = document.getElementById("btn-search");
const categoryButtons = document.querySelectorAll(".category-btn");
const demoBanner = document.getElementById("demo-banner");

// Pagination
const paginationDiv = document.createElement("div");
paginationDiv.id = "pagination";
paginationDiv.style.textAlign = "center";
paginationDiv.style.margin = "20px 0";
paginationDiv.innerHTML = `
  <button id="prev-page" disabled aria-label="Page précédente">Précédent</button>
  <span id="pagination-info">Page 1 / 10</span>
  <button id="next-page" aria-label="Page suivante">Suivant</button>
`;
container.after(paginationDiv);

const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const paginationInfo = document.getElementById("pagination-info");

// ─── Rendu d'une carte deal (API ou démo) ─────────────────────────────────────
function renderDealCard(item, isDemo) {
  let title, shortTitle, image, priceDisplay, originalPriceDisplay;
  let savingsDisplay, savingsPercent, affiliateLink;
  let category, categoryIcon, badge, badgeClass;

  if (isDemo) {
    title = item.title;
    shortTitle = item.shortTitle || item.title;
    image = item.image;
    priceDisplay = item.price.toFixed(2) + " €";
    originalPriceDisplay = item.originalPrice ? item.originalPrice.toFixed(2) + " €" : null;
    savingsDisplay = item.savings ? item.savings.toFixed(2) + " €" : null;
    savingsPercent = item.savingsPercent;
    affiliateLink = item.affiliateLink;
    category = item.categoryLabel;
    categoryIcon = item.categoryIcon;
    badge = item.badge;
    badgeClass = item.badgeClass || "badge-promo";
  } else {
    title = item.ItemInfo?.Title?.DisplayValue || "Titre non disponible";
    shortTitle = title;
    image = item.Images?.Primary?.Medium?.URL || "";
    priceDisplay = item.Offers?.Listings?.[0]?.Price?.DisplayAmount || "Prix non dispo";
    const savingsAmt = item.Offers?.Listings?.[0]?.Savings?.DisplayAmount;
    originalPriceDisplay = null;
    savingsDisplay = savingsAmt || null;
    const rawPrice = item.Offers?.Listings?.[0]?.Price?.Amount;
    const rawSavings = item.Offers?.Listings?.[0]?.Savings?.Amount || 0;
    savingsPercent = rawPrice && rawSavings
      ? Math.round((rawSavings / (rawPrice + rawSavings)) * 100)
      : null;
    affiliateLink = item.DetailPageURL || "#";
    category = "";
    categoryIcon = "";
    badge = savingsPercent ? `-${savingsPercent}%` : null;
    badgeClass = "badge-promo";
  }

  const dealDiv = document.createElement("div");
  dealDiv.className = "deal";

  dealDiv.innerHTML = `
    ${badge ? `<div class="deal-badge ${badgeClass}">${badge}</div>` : ""}
    <a href="${isDemo ? `detail.html?id=${item.id}` : affiliateLink}"
       ${!isDemo ? 'target="_blank" rel="noopener noreferrer"' : ''}
       class="deal-img-link">
      <img src="${image}" alt="${title}" loading="lazy"
           onerror="this.src='https://placehold.co/400x300/f5f5f5/aaa?text=Image+non+disponible'" />
    </a>
    <div class="content">
      ${category ? `<span class="deal-category">${categoryIcon} ${category}</span>` : ""}
      <h3 class="title">${shortTitle}</h3>
      <div class="price-block">
        <span class="current-price">${priceDisplay}</span>
        ${originalPriceDisplay ? `<span class="original-price">${originalPriceDisplay}</span>` : ""}
        ${savingsPercent ? `<span class="badge-savings">-${savingsPercent}%</span>` : ""}
      </div>
      ${savingsDisplay ? `<p class="savings-text">💰 Vous économisez ${savingsDisplay}</p>` : ""}
      <div class="deal-actions">
        ${isDemo ? `<a href="detail.html?id=${item.id}" class="btn-detail">Voir le détail</a>` : ""}
        <a href="${affiliateLink}" target="_blank" rel="noopener noreferrer" class="btn-amazon">🛒 Amazon</a>
      </div>
    </div>
  `;

  return dealDiv;
}

// ─── Affichage résultats API ──────────────────────────────────────────────────
function displayDeals(items) {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = "<p>Aucun bon plan trouvé.</p>";
    return;
  }
  items.forEach(item => container.appendChild(renderDealCard(item, false)));
}

// ─── Filtre sur les produits démo (recherche + catégorie) ─────────────────────
function filterDemoProducts(keyword, category) {
  return DEMO_PRODUCTS.filter(p => {
    const matchCat = !category || p.category === category;
    const kw = keyword.toLowerCase();
    const matchKw = !keyword ||
      p.title.toLowerCase().includes(kw) ||
      p.shortTitle.toLowerCase().includes(kw) ||
      p.description.toLowerCase().includes(kw) ||
      p.categoryLabel.toLowerCase().includes(kw) ||
      p.features.some(f => f.toLowerCase().includes(kw));
    return matchCat && matchKw;
  });
}

// ─── Affichage démo ───────────────────────────────────────────────────────────
function displayDemoDeals(products) {
  container.innerHTML = "";
  if (!products.length) {
    container.innerHTML = "<p>Aucun bon plan trouvé pour cette recherche.</p>";
    return;
  }
  products.forEach(p => container.appendChild(renderDealCard(p, true)));
}

function showDemoBanner() {
  if (demoBanner) demoBanner.style.display = "block";
}

function hideDemoBanner() {
  if (demoBanner) demoBanner.style.display = "none";
}

// ─── Construction URL API ─────────────────────────────────────────────────────
function buildUrl(keyword, category, page) {
  const url = new URL(API_URL);
  if (keyword) url.searchParams.append("keyword", keyword);
  if (category) url.searchParams.append("category", category);
  url.searchParams.append("page", page);
  return url.toString();
}

// ─── Chargement depuis l'API (avec bascule démo si indisponible) ──────────────
async function fetchDeals(keyword = currentKeyword, page = currentPage, category = currentCategory) {
  const loading = document.getElementById("loading");
  if (loading) loading.style.display = "block";
  container.innerHTML = "";

  history.replaceState(null, "", `?keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}&page=${page}`);

  try {
    const response = await fetch(buildUrl(keyword, category, page));
    if (!response.ok) throw new Error("Erreur réseau");

    const data = await response.json();
    isDemoMode = false;
    hideDemoBanner();
    displayDeals(data.items || []);

    maxPages = data.totalPages || 10;
    paginationInfo.textContent = `Page ${page} / ${maxPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= maxPages;

  } catch (error) {
    console.warn("API non disponible — mode démonstration activé", error);
    isDemoMode = true;
    showDemoBanner();

    const filtered = filterDemoProducts(keyword, category);
    displayDemoDeals(filtered);

    maxPages = 1;
    paginationInfo.textContent = "Démo";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  } finally {
    if (loading) loading.style.display = "none";
  }
}

// ─── Synchronisation de l'état actif des catégories ──────────────────────────
function setActiveCategory(keyword) {
  categoryButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.keyword === keyword);
  });
}

// ─── Événements ──────────────────────────────────────────────────────────────
btnSearch.addEventListener("click", () => {
  currentKeyword = searchInput.value.trim();
  currentPage = 1;
  currentCategory = "";
  setActiveCategory("");
  fetchDeals(currentKeyword, currentPage, currentCategory);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

searchInput.addEventListener("keypress", e => {
  if (e.key === "Enter") btnSearch.click();
});

categoryButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentCategory = btn.dataset.keyword;
    currentKeyword = "";
    searchInput.value = "";
    currentPage = 1;
    setActiveCategory(currentCategory);
    fetchDeals(currentKeyword, currentPage, currentCategory);
    window.scrollTo({ top: document.getElementById("deals-container").offsetTop - 80, behavior: "smooth" });
  });
});

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    fetchDeals(currentKeyword, currentPage, currentCategory);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

nextBtn.addEventListener("click", () => {
  if (currentPage < maxPages) {
    currentPage++;
    fetchDeals(currentKeyword, currentPage, currentCategory);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Menu burger
const burger = document.getElementById("burger");
const navLinks = document.getElementById("nav-links");

function toggleMenu() {
  navLinks.classList.toggle("active");
  burger.setAttribute("aria-expanded", navLinks.classList.contains("active"));
}

burger.addEventListener("click", toggleMenu);
burger.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleMenu();
  }
});

// ─── Lecture des paramètres URL au chargement ─────────────────────────────────
const params = new URLSearchParams(window.location.search);
currentKeyword = params.get("keyword") || "";
currentCategory = params.get("category") || "";
currentPage = parseInt(params.get("page")) || 1;

if (currentKeyword) searchInput.value = currentKeyword;
if (currentCategory) setActiveCategory(currentCategory);

fetchDeals();
