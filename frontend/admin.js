const API_URL = "http://localhost:3000/api";
const form = document.getElementById("admin-product-form");
const status = document.getElementById("admin-status");
const categorySelect = document.getElementById("admin-category");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

async function loadCategories() {
  try {
    const response = await fetch(`${API_URL}/categories`);
    if (!response.ok) throw new Error("Не удалось загрузить категории.");
    const categories = await response.json();
    categorySelect.innerHTML = categories.map((category) =>
      `<option value="${category.id}">${escapeHtml(category.name)}</option>`
    ).join("");
  } catch (error) {
    categorySelect.innerHTML = '<option value="">Категории недоступны</option>';
    status.textContent = error.message;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Сохраняем товар…";
  const formData = new FormData(form);
  try {
    const response = await fetch(`${API_URL}/admin/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${document.getElementById("admin-token").value.trim()}`,
      },
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
        categoryId: Number(formData.get("categoryId")),
        price: Number(formData.get("price")),
        stock: Number(formData.get("stock")),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Не удалось добавить товар.");
    status.textContent = `Товар добавлен. Код: ${result.id}. Обнови каталог, чтобы увидеть его.`;
    document.getElementById("admin-created").innerHTML = `<article class="builder-item"><div><strong>${escapeHtml(result.name)}</strong><p>${escapeHtml(result.category)} · ${new Intl.NumberFormat("ru-RU").format(result.price)} сом · Остаток: ${result.stock}</p></div></article>`;
    form.elements.name.value = "";
    form.elements.description.value = "";
    form.elements.price.value = "";
    form.elements.stock.value = "1";
  } catch (error) {
    status.textContent = error.message;
  }
});

loadCategories();
