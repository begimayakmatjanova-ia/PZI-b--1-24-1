const API_URL = "http://localhost:3000/api";
const CART_STORAGE_KEY = "techshop-cart-v1";

const S = {
  pc: '<rect x="3" y="4" width="13" height="10" rx="1.5"/><path d="M7 18h5M9.5 14v4"/><rect x="18" y="6" width="3.5" height="12" rx="1"/>',
  kit: '<rect x="3" y="3" width="12" height="8" rx="1.5"/><path d="M9 11v2"/><rect x="2" y="15" width="14" height="5" rx="1"/><path d="M5 17.5h.01M8 17.5h.01M11 17.5h.01M14 17.5h.01"/><rect x="18" y="3" width="4" height="17" rx="1"/><circle cx="20" cy="15" r=".8"/>',
  laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2.5 19h19l-1.5-4H4z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  mouse: '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 3v6"/>',
  kbd: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 13.5h.01M10 13.5h.01M14 13.5h.01M18 13.5h.01M8 16h8"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  head: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
};

const categoryIcons = {
  "Персональные компьютеры": "pc",
  "Готовые игровые комплекты": "kit",
  "Ноутбуки": "laptop",
  "Мониторы": "monitor",
  "Комплектующие": "chip",
  "Мыши": "mouse",
  "Клавиатуры": "kbd",
  "Смартфоны": "phone",
  "Наушники": "head",
};
const categoryOrder = Object.keys(categoryIcons);
const svg = (key) => `<svg viewBox="0 0 24 24" aria-hidden="true">${S[key] || S.chip}</svg>`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const formatPrice = (price) => `${new Intl.NumberFormat("ru-RU").format(price)} сом`;

const catsElement = document.getElementById("cats");
const catsViewport = document.getElementById("cats-viewport");
const gridElement = document.getElementById("grid");
const searchInput = document.querySelector('.search input[type="search"]');
const cartDialog = document.getElementById("cart-dialog");
const productDialog = document.getElementById("product-dialog");
let categories = [];
let allProducts = [];
let selectedCategoryId = null;
let cart = loadSavedCart();

function loadSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => Number.isInteger(item.id) && Number.isInteger(item.quantity) && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function renderCategories() {
  const orderedCategories = [...categories].sort((first, second) => {
    const firstOrder = categoryOrder.indexOf(first.name);
    const secondOrder = categoryOrder.indexOf(second.name);
    return (firstOrder < 0 ? categoryOrder.length : firstOrder)
      - (secondOrder < 0 ? categoryOrder.length : secondOrder);
  });

  catsElement.innerHTML = orderedCategories.map((category) => {
    const icon = categoryIcons[category.name] || "chip";
    const active = selectedCategoryId === category.id ? " aria-current=\"true\"" : "";
    return `<a class="cat lift" href="#catalog" data-category-id="${category.id}"${active}>
      <span class="ic">${svg(icon)}</span>${escapeHtml(category.name)}
    </a>`;
  }).join("");
}

function renderProducts(products) {
  if (products.length === 0) {
    gridElement.innerHTML = '<p class="empty-state">Товары не найдены. Попробуй изменить запрос или сбросить фильтры.</p>';
    return;
  }

  gridElement.innerHTML = products.map((product) => {
    const icon = categoryIcons[product.category] || "chip";
    const stockLabel = product.stock > 0 ? "В наличии" : "Нет в наличии";
    return `
      <article class="card lift" tabindex="0">
        <div class="pic">${svg(icon)}</div>
        <div class="info">
          <div class="brand"><span>${escapeHtml(product.category)}</span><span class="stock">${stockLabel}</span></div>
          <div class="name">${escapeHtml(product.name)}</div>
          <div class="buy"><span class="price">${formatPrice(product.price)}</span></div>
          <div class="product-actions">
            <button class="btn" type="button" data-add-id="${product.id}" ${product.stock < 1 ? "disabled" : ""}>В корзину</button>
            <button class="secondary-btn" type="button" data-details-id="${product.id}">Подробнее</button>
          </div>
        </div>
      </article>`;
  }).join("");
}

async function loadProducts() {
  const params = new URLSearchParams();
  const query = searchInput.value.trim();
  if (query) params.set("q", query);
  if (selectedCategoryId !== null) params.set("category_id", selectedCategoryId);

  gridElement.innerHTML = '<p class="empty-state">Загружаем товары…</p>';
  try {
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/products${queryString ? `?${queryString}` : ""}`);
    if (!response.ok) throw new Error(`Ошибка API: ${response.status}`);
    const products = await response.json();
    renderProducts(products);
    document.getElementById("catalog-status").textContent = `${products.length} товаров${query || selectedCategoryId !== null ? " по выбранным условиям" : " в каталоге"}`;
  } catch (error) {
    console.error("Не удалось загрузить товары из backend:", error);
    gridElement.innerHTML = '<p class="empty-state">Не удалось загрузить товары. Проверь, запущен ли backend на localhost:3000.</p>';
  }
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("cart-count").textContent = count;
}

function getCartRows() {
  return cart.map((entry) => {
    const product = allProducts.find((item) => item.id === entry.id);
    return product ? { ...product, quantity: entry.quantity } : null;
  }).filter(Boolean);
}

function renderCart() {
  const rows = getCartRows();
  const itemsElement = document.getElementById("cart-items");
  if (rows.length === 0) {
    itemsElement.innerHTML = '<p class="section-note">Корзина пока пустая. Добавь товары из каталога.</p>';
  } else {
    itemsElement.innerHTML = rows.map((item) => `
      <div class="cart-row">
        <div><strong>${escapeHtml(item.name)}</strong><p>${formatPrice(item.price)} · ${escapeHtml(item.category)}</p></div>
        <div class="quantity-controls">
          <button type="button" data-quantity-id="${item.id}" data-delta="-1" aria-label="Уменьшить количество">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-quantity-id="${item.id}" data-delta="1" aria-label="Увеличить количество" ${item.quantity >= item.stock ? "disabled" : ""}>+</button>
          <button class="remove-item" type="button" data-remove-id="${item.id}" aria-label="Удалить товар">×</button>
        </div>
      </div>`).join("");
  }

  const total = rows.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.getElementById("cart-total").textContent = formatPrice(total);
  document.getElementById("checkout-button").disabled = rows.length === 0;
  updateCartCount();
}

function addToCart(productId) {
  const product = allProducts.find((item) => item.id === productId);
  if (!product || product.stock < 1) return;
  const entry = cart.find((item) => item.id === productId);
  if (entry && entry.quantity >= product.stock) {
    alert("На складе больше нет доступного количества этого товара.");
    return;
  }
  if (entry) entry.quantity += 1;
  else cart.push({ id: productId, quantity: 1 });
  saveCart();
  renderCart();
}

function showProductDetails(productId) {
  const product = allProducts.find((item) => item.id === productId);
  if (!product) return;
  const icon = categoryIcons[product.category] || "chip";
  document.getElementById("product-details").innerHTML = `
    <div class="product-detail">
      <div class="pic">${svg(icon)}</div>
      <div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description || "Описание пока не добавлено.")}</p>
        <dl class="detail-list">
          <dt>Категория</dt><dd>${escapeHtml(product.category)}</dd>
          <dt>Цена</dt><dd>${formatPrice(product.price)}</dd>
          <dt>Наличие</dt><dd>${product.stock > 0 ? `На складе: ${product.stock} шт.` : "Нет в наличии"}</dd>
          <dt>Код товара</dt><dd>${product.id}</dd>
        </dl>
        <button class="btn" type="button" data-add-id="${product.id}" ${product.stock < 1 ? "disabled" : ""}>В корзину</button>
      </div>
    </div>`;
  productDialog.showModal();
}

catsElement.addEventListener("click", (event) => {
  const categoryLink = event.target.closest("[data-category-id]");
  if (!categoryLink) return;
  event.preventDefault();
  const clickedCategoryId = Number(categoryLink.dataset.categoryId);
  selectedCategoryId = selectedCategoryId === clickedCategoryId ? null : clickedCategoryId;
  renderCategories();
  loadProducts();
});

const categoriesPrev = document.getElementById("categories-prev");
const categoriesNext = document.getElementById("categories-next");
function updateCategoryArrows() {
  const maxScroll = catsViewport.scrollWidth - catsViewport.clientWidth;
  categoriesPrev.disabled = catsViewport.scrollLeft <= 2;
  categoriesNext.disabled = maxScroll <= 2 || catsViewport.scrollLeft >= maxScroll - 2;
}
categoriesPrev.addEventListener("click", () => {
  catsViewport.scrollBy({ left: -Math.max(260, catsViewport.clientWidth * 0.75), behavior: "smooth" });
});
categoriesNext.addEventListener("click", () => {
  catsViewport.scrollBy({ left: Math.max(260, catsViewport.clientWidth * 0.75), behavior: "smooth" });
});
catsViewport.addEventListener("scroll", updateCategoryArrows, { passive: true });
window.addEventListener("resize", updateCategoryArrows);
updateCategoryArrows();

gridElement.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-id]");
  const detailsButton = event.target.closest("[data-details-id]");
  if (addButton) addToCart(Number(addButton.dataset.addId));
  if (detailsButton) showProductDetails(Number(detailsButton.dataset.detailsId));
});

document.getElementById("builder-results").addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-id]");
  if (addButton) addToCart(Number(addButton.dataset.addId));
});

document.getElementById("product-details").addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-id]");
  if (addButton) {
    addToCart(Number(addButton.dataset.addId));
    productDialog.close();
  }
});

document.getElementById("clear-filters").addEventListener("click", () => {
  searchInput.value = "";
  selectedCategoryId = null;
  renderCategories();
  loadProducts();
});

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchInput.searchTimer);
  searchInput.searchTimer = window.setTimeout(loadProducts, 250);
});

document.getElementById("open-cart").addEventListener("click", () => {
  renderCart();
  cartDialog.showModal();
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.getElementById(button.dataset.close).close());
});

document.getElementById("cart-items").addEventListener("click", (event) => {
  const quantityButton = event.target.closest("[data-quantity-id]");
  const removeButton = event.target.closest("[data-remove-id]");
  if (quantityButton) {
    const id = Number(quantityButton.dataset.quantityId);
    const entry = cart.find((item) => item.id === id);
    const product = allProducts.find((item) => item.id === id);
    if (entry && product) {
      entry.quantity += Number(quantityButton.dataset.delta);
      if (entry.quantity < 1) cart = cart.filter((item) => item.id !== id);
      else entry.quantity = Math.min(entry.quantity, product.stock);
      saveCart();
      renderCart();
    }
  }
  if (removeButton) {
    cart = cart.filter((item) => item.id !== Number(removeButton.dataset.removeId));
    saveCart();
    renderCart();
  }
});

document.getElementById("checkout-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById("checkout-status");
  const rows = getCartRows();
  if (rows.length === 0) return;

  const formData = new FormData(form);
  const button = document.getElementById("checkout-button");
  button.disabled = true;
  status.textContent = "Отправляем заказ…";
  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: formData.get("customerName"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        items: rows.map((item) => ({ productId: item.id, quantity: item.quantity })),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Не удалось оформить заказ");
    cart = [];
    saveCart();
    renderCart();
    form.reset();
    status.textContent = `Заказ №${result.id} сохранён. Оплату и доставку нужно согласовать с продавцом.`;
    // Заказ уменьшает остатки в базе, поэтому обновляем общий список,
    // чтобы корзина и рекомендации сразу показывали актуальное наличие.
    const productsResponse = await fetch(`${API_URL}/products`);
    if (productsResponse.ok) allProducts = await productsResponse.json();
    await loadProducts();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = getCartRows().length === 0;
  }
});

document.getElementById("builder-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const budget = Number(document.getElementById("builder-budget").value);
  const purpose = document.getElementById("builder-purpose").value;
  const preferred = purpose === "Игры"
    ? ["Персональные компьютеры", "Готовые игровые комплекты", "Комплектующие", "Мониторы"]
    : purpose === "Работа"
      ? ["Ноутбуки", "Персональные компьютеры", "Мониторы"]
      : ["Ноутбуки", "Комплектующие"];
  const recommendations = allProducts
    .filter((product) => product.price <= budget && product.stock > 0 && preferred.includes(product.category))
    .sort((first, second) => second.price - first.price)
    .slice(0, 3);
  const results = document.getElementById("builder-results");
  results.innerHTML = recommendations.length
    ? recommendations.map((product) => `
      <article class="builder-item"><div><strong>${escapeHtml(product.name)}</strong><p>${escapeHtml(product.category)} · ${formatPrice(product.price)}</p></div>
      <button class="btn" type="button" data-add-id="${product.id}">В корзину</button></article>`).join("")
    : '<p class="section-note">В этой категории пока нет товаров в наличии в пределах указанного бюджета.</p>';
});

document.querySelectorAll(".modal").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

async function startCatalog() {
  try {
    const [categoriesResponse, productsResponse] = await Promise.all([
      fetch(`${API_URL}/categories`),
      fetch(`${API_URL}/products`),
    ]);
    if (!categoriesResponse.ok || !productsResponse.ok) throw new Error("Backend вернул ошибку");
    categories = await categoriesResponse.json();
    allProducts = await productsResponse.json();
    renderCategories();
    updateCategoryArrows();
    renderProducts(allProducts);
    document.getElementById("catalog-status").textContent = `${allProducts.length} товаров в каталоге`;
    renderCart();
  } catch (error) {
    console.error("Не удалось подключиться к backend:", error);
    catsElement.innerHTML = "";
    gridElement.innerHTML = '<p class="empty-state">Не удалось подключиться к backend. Проверь, запущен ли сервер на localhost:3000.</p>';
  }
}

// Подсветка пункта меню по текущей секции (только якорные ссылки)
const navItems = [...document.querySelectorAll('.menu a[href*="#"]')]
  .map((link) => ({ link, el: document.getElementById(link.hash.slice(1)) }))
  .filter((item) => item.el);

function updateActiveLink() {
  if (!navItems.length) return;
  const line = 140;
  let current = navItems[0];

  for (const item of navItems) {
    if (item.el.getBoundingClientRect().top <= line) current = item;
  }

  const pageHeight = document.documentElement.scrollHeight;
  const scrollable = pageHeight - window.innerHeight > 50;
  const atBottom = window.innerHeight + window.scrollY >= pageHeight - 2;

  if (window.scrollY < 10) {
    current = navItems[0];                       
  } else if (scrollable && atBottom) {
    current = navItems[navItems.length - 1];   

  navItems.forEach((item) => item.link.classList.toggle('on', item === current));
}

window.addEventListener('scroll', updateActiveLink, { passive: true });
window.addEventListener('resize', updateActiveLink);
window.addEventListener('load', updateActiveLink);
updateActiveLink();
updateCartCount();
startCatalog();
