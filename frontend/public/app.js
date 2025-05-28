const API_URL = "https://api-kiff-ton-deal.onrender.com/api/amazon";

let currentPage = 1;
let maxPages = 10;
let currentKeyword = "";
let currentCategory = "";

// Élément DOM
const container = document.getElementById("deals-container");
const searchInput = document.getElementById("search");
const btnSearch = document.getElementById("btn-search");
const categoryButtons = document.querySelectorAll(".category-btn");

// Pagination Elements
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

// Affichage des deals
function displayDeals(items) {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = "<p>Aucun bon plan trouvé.</p>";
    return;
  }

  items.forEach(item => {
    const title = item.ItemInfo?.Title?.DisplayValue || "Titre non disponible";
    const imgSrc = item.Images?.Primary?.Medium?.URL || "";
    const price = item.Offers?.Listings?.[0]?.Price?.DisplayAmount || "Prix non dispo";
    const savings = item.Offers?.Listings?.[0]?.Savings?.DisplayAmount || "";

    const dealDiv = document.createElement("div");
    dealDiv.className = "deal";
    dealDiv.innerHTML = `
      <img src="${imgSrc}" alt="${title}" />
      <div class="content">
        <h3 class="title">${title}</h3>
        <p class="price">Prix : ${price} ${savings ? `(<span style="color:green;">Économisez ${savings}</span>)` : ""}</p>
      </div>
    `;

    container.appendChild(dealDiv);
  });
}

// Construction URL avec filtres et pagination
function buildUrl(keyword, category, page) {
  const url = new URL(API_URL);
  if (keyword) url.searchParams.append("keyword", keyword);
  if (category) url.searchParams.append("category", category);
  url.searchParams.append("page", page);
  return url.toString();
}


// Chargement des deals depuis API
async function fetchDeals(keyword = currentKeyword, page = currentPage, category = currentCategory) {
  container.innerHTML = "<p>Chargement...</p>";

  try {
     const requestUrl = buildUrl(keyword, category, page); // ✅ renommé ici

    // 🔁 Mise à jour de l'URL visible
    history.replaceState(null, "", `?keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}&page=${page}`);

    const response = await fetch(requestUrl);
    if (!response.ok) throw new Error("Erreur réseau");

    const data = await response.json();

    // Supposons que ton API retourne un objet { items: [], totalPages: int }
    displayDeals(data.items || []);
    
    // Mise à jour pagination
    maxPages = data.totalPages || 10;
    paginationInfo.textContent = `Page ${page} / ${maxPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= maxPages;

  } catch (error) {
     container.innerHTML = "<p>Impossible de charger les bons plans. Veuillez réessayer plus tard.</p>";
     console.error(error);
  }
}

// Gestion évènements

btnSearch.addEventListener("click", () => {
  currentKeyword = searchInput.value.trim();
  currentPage = 1;
  fetchDeals(currentKeyword, currentPage, currentCategory);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

searchInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    btnSearch.click();
  }
});

categoryButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    currentCategory = btn.dataset.keyword;
    currentPage = 1;
    fetchDeals(currentKeyword, currentPage, currentCategory);
  });
});

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    fetchDeals(currentKeyword, currentPage, currentCategory);
  }
});

nextBtn.addEventListener("click", () => {
  if (currentPage < maxPages) {
    currentPage++;
    fetchDeals(currentKeyword, currentPage, currentCategory);
  }
});

const burger = document.getElementById("burger");
const navLinks = document.getElementById("nav-links");

function toggleMenu() {
  navLinks.classList.toggle("active");
  burger.setAttribute("aria-expanded", navLinks.classList.contains("active"));
}

burger.addEventListener("click", toggleMenu);
burger.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleMenu();
  }
});

// Lecture des paramètres dans l'URL au chargement de la page
const params = new URLSearchParams(window.location.search);
currentKeyword = params.get("keyword") || "";
currentCategory = params.get("category") || "";
currentPage = parseInt(params.get("page")) || 1;

// Pré-remplir le champ de recherche si besoin
if (currentKeyword) {
  searchInput.value = currentKeyword;
}

// Chargement initial
fetchDeals();
