// Menu burger (identique à app.js)
const burger = document.getElementById("burger");
const navLinks = document.getElementById("nav-links");

burger.addEventListener("click", () => {
  navLinks.classList.toggle("active");
  burger.setAttribute("aria-expanded", navLinks.classList.contains("active"));
});
burger.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    navLinks.classList.toggle("active");
  }
});

// ─── Étoiles ──────────────────────────────────────────────────────────────────
function renderStars(rating, reviewCount) {
  const rounded = Math.round(rating * 2) / 2;
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rounded) stars += `<span class="star star-full">★</span>`;
    else if (i - 0.5 === rounded) stars += `<span class="star star-half">★</span>`;
    else stars += `<span class="star star-empty">★</span>`;
  }
  const count = reviewCount ? `<span class="review-count">(${reviewCount.toLocaleString("fr-FR")} avis)</span>` : "";
  return `<span class="stars-wrap">${stars}</span> <span class="rating-value">${rating}</span> ${count}`;
}

// ─── Rendu de la page détail ──────────────────────────────────────────────────
function renderDetail(product) {
  // Meta dynamique
  document.title = `${product.shortTitle} — Bon plan | Kiff ton Deal`;

  // Fil d'ariane
  document.getElementById("breadcrumb-category").textContent = product.categoryLabel;
  document.getElementById("breadcrumb-title").textContent = product.shortTitle;

  // Badge promo sur image
  const badgeEl = document.getElementById("product-badge-detail");
  if (product.badge) {
    badgeEl.textContent = product.badge;
    badgeEl.className = `product-badge-detail ${product.badgeClass || "badge-promo"}`;
  }

  // Image
  const img = document.getElementById("product-main-image");
  img.src = product.image;
  img.alt = product.title;
  img.onerror = () => {
    img.src = "https://placehold.co/500x500/f5f5f5/aaa?text=Image+non+disponible";
  };

  // Catégorie
  document.getElementById("product-category-badge").innerHTML =
    `${product.categoryIcon} ${product.categoryLabel}`;

  // Titre
  document.getElementById("product-title").textContent = product.title;

  // Note
  document.getElementById("product-rating").innerHTML = renderStars(product.rating, product.reviewCount);

  // Prix
  document.getElementById("product-price").textContent = `${product.price.toFixed(2)} €`;

  if (product.originalPrice) {
    document.getElementById("product-original-price").innerHTML =
      `<del>${product.originalPrice.toFixed(2)} €</del>`;
    document.getElementById("product-savings-pct").textContent = `-${product.savingsPercent} %`;
    document.getElementById("product-savings-amount").textContent =
      `💰 Vous économisez ${product.savings.toFixed(2)} €`;
  } else {
    document.getElementById("product-savings-pct").style.display = "none";
    document.getElementById("product-savings-amount").textContent =
      product.promoCode ? `🏷️ Code promo : ${product.promoCode}` : "";
  }

  // Bouton Amazon
  document.getElementById("product-affiliate-btn").href = product.affiliateLink;

  // Description
  document.getElementById("product-description").textContent = product.description;

  // Caractéristiques
  const list = document.getElementById("product-features-list");
  product.features.forEach(f => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="feat-check">✓</span>${f}`;
    list.appendChild(li);
  });
}

// ─── Rendu des produits similaires ───────────────────────────────────────────
function renderRelated(currentId, currentCategory) {
  // D'abord même catégorie, puis n'importe quelle autre catégorie
  let related = DEMO_PRODUCTS.filter(p => p.id !== currentId && p.category === currentCategory);
  if (related.length < 3) {
    const others = DEMO_PRODUCTS.filter(p => p.id !== currentId && p.category !== currentCategory);
    related = [...related, ...others].slice(0, 3);
  } else {
    related = related.slice(0, 3);
  }

  const container = document.getElementById("related-container");
  related.forEach(p => {
    const card = document.createElement("div");
    card.className = "deal related-card";
    card.innerHTML = `
      ${p.badge ? `<div class="deal-badge ${p.badgeClass || "badge-promo"}">${p.badge}</div>` : ""}
      <a href="detail.html?id=${p.id}" class="deal-img-link">
        <img src="${p.image}" alt="${p.shortTitle}" loading="lazy"
             onerror="this.src='https://placehold.co/400x300/f5f5f5/aaa?text=Image'" />
      </a>
      <div class="content">
        <span class="deal-category">${p.categoryIcon} ${p.categoryLabel}</span>
        <h3 class="title">${p.shortTitle}</h3>
        <div class="price-block">
          <span class="current-price">${p.price.toFixed(2)} €</span>
          <span class="original-price">${p.originalPrice.toFixed(2)} €</span>
          <span class="badge-savings">-${p.savingsPercent}%</span>
        </div>
        <div class="deal-actions">
          <a href="detail.html?id=${p.id}" class="btn-detail">Voir le détail</a>
          <a href="${p.affiliateLink}" target="_blank" rel="noopener noreferrer" class="btn-amazon">🛒 Amazon</a>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ─── Initialisation ───────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const productId = parseInt(params.get("id"), 10);
const product = DEMO_PRODUCTS.find(p => p.id === productId);

const main = document.getElementById("product-detail-main");

if (!product) {
  main.innerHTML = `
    <div class="not-found container">
      <p>Produit introuvable.</p>
      <a href="/" class="btn-back">← Retour aux bons plans</a>
    </div>`;
} else {
  renderDetail(product);
  renderRelated(product.id, product.category);
}
