const express = require("express");
const cors = require("cors");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const dataDirectory = path.join(__dirname, "data");
fs.mkdirSync(dataDirectory, { recursive: true });
const db = new DatabaseSync(path.join(dataDirectory, "store.sqlite"));
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    total INTEGER NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_each INTEGER NOT NULL CHECK (price_each >= 0)
  );
`);

const categoryCount = db.prepare("SELECT COUNT(*) AS count FROM categories").get().count;
if (categoryCount === 0) {
  const addCategory = db.prepare("INSERT INTO categories (name) VALUES (?)");
  const addProduct = db.prepare(
    "INSERT INTO products (name, description, price, stock, category_id) VALUES (?, ?, ?, ?, ?)"
  );

  const phoneCategory = Number(addCategory.run("Смартфоны").lastInsertRowid);
  const laptopCategory = Number(addCategory.run("Ноутбуки").lastInsertRowid);
  addProduct.run("Смартфон", "Пример товара для проверки API", 25000, 10, phoneCategory);
  addProduct.run("Ноутбук", "Пример ноутбука для каталога", 65000, 5, laptopCategory);
}

app.get("/", (req, res) => {
  res.send("Backend магазина техники работает");
});

app.get("/api/categories", (req, res) => {
  const categories = db.prepare("SELECT id, name FROM categories ORDER BY name").all();
  res.json(categories);
});

app.get("/api/products", (req, res) => {
  const products = db.prepare(`
    SELECT products.id, products.name, products.description, products.price,
           products.stock, categories.name AS category
    FROM products
    JOIN categories ON categories.id = products.category_id
    ORDER BY products.id
  `).all();
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId < 1) {
    return res.status(400).json({ message: "Некорректный номер товара" });
  }

  const product = db.prepare(`
    SELECT products.id, products.name, products.description, products.price,
           products.stock, categories.name AS category
    FROM products
    JOIN categories ON categories.id = products.category_id
    WHERE products.id = ?
  `).get(productId);

  if (!product) {
    return res.status(404).json({ message: "Товар не найден" });
  }
  res.json(product);
});

app.post("/api/orders", (req, res) => {
  const { customerName, phone, address, items } = req.body;
  if (
    typeof customerName !== "string" || !customerName.trim() ||
    typeof phone !== "string" || !phone.trim() ||
    typeof address !== "string" || !address.trim() ||
    !Array.isArray(items) || items.length === 0
  ) {
    return res.status(400).json({ message: "Укажите имя, телефон, адрес и товары заказа" });
  }

  const quantities = new Map();
  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "В заказе указаны некорректные товары или количества" });
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const findProduct = db.prepare("SELECT id, name, price, stock FROM products WHERE id = ?");
  const orderProducts = [];
  for (const [productId, quantity] of quantities) {
    const product = findProduct.get(productId);
    if (!product) {
      return res.status(400).json({ message: `Товар с номером ${productId} не найден` });
    }
    if (product.stock < quantity) {
      return res.status(409).json({ message: `Недостаточно товара «${product.name}» на складе` });
    }
    orderProducts.push({ ...product, quantity });
  }

  const total = orderProducts.reduce((sum, product) => sum + product.price * product.quantity, 0);
  try {
    db.exec("BEGIN IMMEDIATE");
    const orderResult = db.prepare(`
      INSERT INTO orders (customer_name, phone, address, total)
      VALUES (?, ?, ?, ?)
    `).run(customerName.trim(), phone.trim(), address.trim(), total);
    const orderId = Number(orderResult.lastInsertRowid);
    const addItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, price_each)
      VALUES (?, ?, ?, ?)
    `);
    const reduceStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

    for (const product of orderProducts) {
      addItem.run(orderId, product.id, product.quantity, product.price);
      reduceStock.run(product.quantity, product.id);
    }
    db.exec("COMMIT");
    res.status(201).json({ id: orderId, total, status: "new" });
  } catch (error) {
    db.exec("ROLLBACK");
    console.error("Не удалось создать заказ:", error);
    res.status(500).json({ message: "Не удалось сохранить заказ" });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log("База SQLite: backend/data/store.sqlite");
});
