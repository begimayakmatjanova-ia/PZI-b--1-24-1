const express = require("express");
const cors = require("cors");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
// Если ADMIN_TOKEN не задан в .env, создаём временный ключ для этой сессии.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(24).toString("hex");

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

const categoryNames = [
  "Персональные компьютеры",
  "Готовые игровые комплекты",
  "Ноутбуки",
  "Мониторы",
  "Комплектующие",
  "Мыши",
  "Клавиатуры",
  "Смартфоны",
  "Наушники",
];
const addCategory = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
for (const name of categoryNames) addCategory.run(name);

const categoryIds = Object.fromEntries(
  db.prepare("SELECT id, name FROM categories").all().map(({ id, name }) => [name, id])
);

// Обновляем только две исходные демонстрационные записи, если они ещё не были изменены.
db.prepare(`
  UPDATE products
  SET name = ?, description = ?, price = ?, stock = ?, category_id = ?
  WHERE name = ? AND description = ?
`).run(
  'Игровой ноутбук 16", 16 ГБ, RTX', "Игровой ноутбук", 89900, 7,
  categoryIds["Ноутбуки"], "Ноутбук", "Пример ноутбука для каталога"
);
db.prepare(`
  UPDATE products
  SET name = ?, description = ?, price = ?, stock = ?, category_id = ?
  WHERE name = ? AND description = ?
`).run(
  'Смартфон 6.7", 256 ГБ', "Смартфон", 36900, 10,
  categoryIds["Смартфоны"], "Смартфон", "Пример товара для проверки API"
);

const demoProducts = [
  ['Ноутбук для работы 15.6", 8 ГБ', "Рабочий ноутбук", 47500, 5, "Ноутбуки"],
  ['Монитор 27", IPS, 165 Гц', "Игровой монитор", 24900, 8, "Мониторы"],
  ["Игровой ПК, Ryzen 5, 32 ГБ", "Системный блок", 98000, 3, "Персональные компьютеры"],
  ["Видеокарта 8 ГБ GDDR6", "Видеокарта", 52300, 4, "Комплектующие"],
  ["Игровая мышь, 12 000 DPI", "Игровая мышь", 2490, 12, "Мыши"],
  ["Механическая клавиатура", "Клавиатура", 5900, 6, "Клавиатуры"],
  ["Беспроводные наушники с ANC", "Наушники", 7800, 9, "Наушники"],
  ["Игровой комплект Ryzen 5, 32 ГБ", "Готовый игровой комплект", 112000, 2, "Готовые игровые комплекты"],
  ["Домашний ПК, Ryzen 5, 16 ГБ", "Компьютер для учёбы, работы и повседневных задач", 58900, 4, "Персональные компьютеры"],
  ["Игровой ПК, Core i5, 16 ГБ", "Игровой системный блок с SSD 1 ТБ", 84900, 3, "Персональные компьютеры"],
  ["Компактный офисный ПК, Core i3", "Компьютер для офиса и учёбы", 42900, 5, "Персональные компьютеры"],
  ["Ноутбук для учёбы 14\", 8 ГБ", "Лёгкий ноутбук для учёбы и поездок", 38900, 6, "Ноутбуки"],
  ["Ноутбук для игр 15.6\", RTX", "Игровой ноутбук с SSD 512 ГБ", 109900, 2, "Ноутбуки"],
  ["Монитор 24\", IPS, 100 Гц", "Монитор для дома и работы", 13900, 7, "Мониторы"],
  ["Монитор 32\", QHD, 165 Гц", "Большой игровой монитор с разрешением QHD", 48900, 3, "Мониторы"],
  ["Видеокарта GeForce RTX 4060, 8 ГБ", "Видеокарта для современных игр", 37900, 4, "Комплектующие"],
  ["Процессор Ryzen 5, 6 ядер", "Процессор для игрового или рабочего ПК", 16900, 5, "Комплектующие"],
  ["SSD NVMe 1 ТБ", "Твердотельный накопитель формата M.2", 7900, 10, "Комплектующие"],
  ["Беспроводная мышь Bluetooth", "Компактная мышь для ноутбука", 1890, 12, "Мыши"],
  ["Клавиатура с подсветкой", "Полноразмерная клавиатура с подсветкой", 3490, 8, "Клавиатуры"],
  ["Смартфон 6.5\", 128 ГБ", "Смартфон с памятью 128 ГБ", 24900, 5, "Смартфоны"],
  ["Смартфон 6.8\", 512 ГБ", "Смартфон с большим экраном и памятью 512 ГБ", 59900, 3, "Смартфоны"],
  ["Беспроводные наушники с микрофоном", "Наушники для музыки, звонков и видеовстреч", 4200, 10, "Наушники"],
  ["Игровой комплект Ryzen 7, 32 ГБ", "Комплект для игр с SSD 1 ТБ", 149900, 2, "Готовые игровые комплекты"],
];

// Ещё 72 демонстрационные позиции: по восемь в каждой из девяти категорий.
const catalogExpansion = [
  ["Персональные компьютеры", [
    ["ПК для офиса, Ryzen 3, 8 ГБ", "Системный блок для офисных программ и интернета", 34900],
    ["Домашний ПК, Core i3, 16 ГБ", "Универсальный компьютер для дома и учёбы", 47900],
    ["Игровой ПК, Ryzen 5, RTX 4060", "Игровая сборка с SSD 1 ТБ", 124900],
    ["Рабочая станция, Ryzen 7, 32 ГБ", "Компьютер для многозадачности и обработки медиа", 139900],
    ["ПК для дома, Core i5, 16 ГБ", "Сбалансированный компьютер с SSD 512 ГБ", 72900],
    ["Игровой ПК, Core i7, RTX 4070", "Производительная игровая сборка с 32 ГБ памяти", 189900],
    ["Мини-ПК, Ryzen 5, 16 ГБ", "Компактный компьютер для рабочего стола", 55900],
    ["ПК для учёбы, Core i3, 8 ГБ", "Базовый системный блок для учебных задач", 39900],
  ]],
  ["Готовые игровые комплекты", [
    ["Игровой комплект Ryzen 5 и RTX 4060", "Системный блок, монитор и базовая периферия", 159900],
    ["Игровой комплект Core i5 и RTX 4060", "Комплект для игр с монитором 24 дюйма", 164900],
    ["Игровой комплект Ryzen 7 и RTX 4070", "Мощная сборка с монитором и периферией", 239900],
    ["Стартовый игровой комплект Ryzen 5", "Системный блок и монитор для начала игры", 119900],
    ["Игровой комплект Core i7 и RTX 4070", "Комплект с 32 ГБ оперативной памяти", 249900],
    ["Комплект для стриминга Ryzen 7", "Игровой компьютер с камерой и гарнитурой", 219900],
    ["Компактный игровой комплект Ryzen 5", "Компактный корпус и монитор 24 дюйма", 149900],
    ["Игровой комплект Ryzen 5 и RTX 4060 Ti", "Сборка с монитором 27 дюймов", 189900],
  ]],
  ["Ноутбуки", [
    ["Ноутбук для учёбы 15.6 дюйма, 8 ГБ", "Модель для документов, занятий и браузера", 42900],
    ["Ноутбук для работы Core i5, 16 ГБ", "Рабочая модель с SSD 512 ГБ", 72900],
    ["Игровой ноутбук Ryzen 7, RTX 4060", "Ноутбук для игр с экраном 144 Гц", 139900],
    ["Ультрабук 14 дюймов, 16 ГБ", "Лёгкий ноутбук с SSD 512 ГБ", 84900],
    ["Ноутбук Core i3, 8 ГБ, 256 ГБ SSD", "Доступная модель для базовых задач", 39900],
    ["Ноутбук Core i7, 16 ГБ, RTX 4050", "Модель для работы с графикой и игр", 124900],
    ["Ноутбук Ryzen 5, 16 ГБ", "Универсальный ноутбук с экраном 15.6 дюйма", 67900],
    ["Ноутбук для игр Core i5, RTX 4050", "Игровая модель с SSD 1 ТБ", 114900],
  ]],
  ["Мониторы", [
    ["Монитор 22 дюйма, Full HD, IPS", "Компактный экран для офиса и учёбы", 10900],
    ["Монитор 24 дюйма, Full HD, 144 Гц", "Игровой монитор с быстрым экраном", 21900],
    ["Монитор 27 дюймов, QHD, IPS", "Экран с разрешением 2560 на 1440", 32900],
    ["Монитор 27 дюймов, 4K, IPS", "Монитор высокой чёткости для работы и медиа", 52900],
    ["Монитор 24 дюйма, Full HD, 75 Гц", "Универсальный монитор для дома", 14900],
    ["Монитор 34 дюйма, UltraWide", "Широкий экран для работы и развлечений", 69900],
    ["Монитор 27 дюймов, Full HD, 165 Гц", "Игровой экран с частотой 165 Гц", 28900],
    ["Монитор 32 дюйма, 4K, VA", "Большой экран для фильмов и работы", 58900],
  ]],
  ["Комплектующие", [
    ["Оперативная память DDR4, 16 ГБ", "Модуль памяти для настольного компьютера", 3900],
    ["Оперативная память DDR5, 32 ГБ", "Комплект памяти для современной сборки", 9900],
    ["Блок питания 650 Вт, 80 Plus Bronze", "Блок питания для игрового ПК", 6900],
    ["Материнская плата B550, AM4", "Плата для процессоров Ryzen серии AM4", 11900],
    ["Корпус для ПК с тремя вентиляторами", "Корпус с боковой панелью и вентиляцией", 7900],
    ["Кулер башенного типа для процессора", "Воздушное охлаждение для настольного ПК", 4200],
    ["SSD SATA 2.5 дюйма, 512 ГБ", "Накопитель для компьютера или ноутбука", 4500],
    ["Жёсткий диск 3.5 дюйма, 2 ТБ", "Накопитель для хранения файлов", 6900],
  ]],
  ["Мыши", [
    ["Игровая мышь, 6 кнопок, RGB", "Проводная мышь с настраиваемой подсветкой", 2990],
    ["Мышь офисная USB", "Простая проводная мышь для повседневной работы", 790],
    ["Беспроводная игровая мышь, 16000 DPI", "Игровая мышь с регулируемой чувствительностью", 4990],
    ["Мышь Bluetooth для ноутбука", "Компактная беспроводная модель", 1590],
    ["Эргономичная вертикальная мышь", "Форма для удобного хвата при долгой работе", 3290],
    ["Игровая мышь с оптическим сенсором", "Проводная модель с 7 программируемыми кнопками", 3790],
    ["Тихая беспроводная мышь", "Мышь с тихими кнопками для офиса", 2190],
    ["Лёгкая игровая мышь, 12000 DPI", "Лёгкий корпус и регулируемая чувствительность", 3490],
  ]],
  ["Клавиатуры", [
    ["Механическая клавиатура 87 клавиш", "Компактная механическая клавиатура", 6900],
    ["Офисная клавиатура USB", "Полноразмерная клавиатура для повседневной работы", 1190],
    ["Беспроводная клавиатура Bluetooth", "Компактная клавиатура для компьютера и планшета", 3490],
    ["Игровая клавиатура с RGB-подсветкой", "Полноразмерная модель с подсветкой клавиш", 5290],
    ["Механическая клавиатура с русской раскладкой", "Клавиатура с механическими переключателями", 8490],
    ["Тонкая клавиатура для офиса", "Тихая низкопрофильная модель", 2790],
    ["Компактная клавиатура 60 процентов", "Небольшая механическая клавиатура для игр", 5990],
    ["Клавиатура и мышь, беспроводной комплект", "Комплект для рабочего места с USB-приёмником", 3290],
  ]],
  ["Смартфоны", [
    ["Смартфон 6.1 дюйма, 128 ГБ", "Компактная модель с памятью 128 ГБ", 28900],
    ["Смартфон 6.6 дюйма, 256 ГБ", "Универсальная модель с большим экраном", 42900],
    ["Смартфон 6.7 дюйма, 512 ГБ", "Модель с увеличенным объёмом памяти", 64900],
    ["Смартфон 6.5 дюйма, 128 ГБ, NFC", "Смартфон с поддержкой бесконтактной оплаты", 31900],
    ["Смартфон 6.8 дюйма, AMOLED", "Модель с ярким AMOLED-экраном", 54900],
    ["Смартфон 6.4 дюйма, 256 ГБ, NFC", "Смартфон с памятью 256 ГБ и NFC", 38900],
    ["Смартфон 6.7 дюйма, 256 ГБ, 5G", "Модель с поддержкой мобильной сети 5G", 49900],
    ["Смартфон 6.5 дюйма, 64 ГБ", "Базовая модель для звонков и приложений", 19900],
  ]],
  ["Наушники", [
    ["Наушники накладные Bluetooth", "Беспроводные наушники для музыки и звонков", 3900],
    ["Игровая гарнитура с микрофоном", "Гарнитура с микрофоном для игр и общения", 4900],
    ["Наушники-вкладыши USB-C", "Проводные наушники с разъёмом USB-C", 1290],
    ["Полноразмерные наушники с ANC", "Беспроводная модель с активным шумоподавлением", 9900],
    ["Спортивные Bluetooth-наушники", "Лёгкие наушники для прогулок и тренировок", 2790],
    ["Студийные наушники, проводные", "Закрытые наушники для прослушивания и записи", 7900],
    ["TWS-наушники с зарядным кейсом", "Компактные полностью беспроводные наушники", 3590],
    ["Гарнитура для видеозвонков USB", "Проводная гарнитура для встреч и звонков", 2190],
  ]],
];
demoProducts.push(...catalogExpansion.flatMap(([category, products]) =>
  products.map(([name, description, price], index) => [name, description, price, 3 + (index % 9), category])
));
const findProductByName = db.prepare("SELECT id FROM products WHERE name = ?");
const insertProduct = db.prepare(
  "INSERT INTO products (name, description, price, stock, category_id) VALUES (?, ?, ?, ?, ?)"
);
for (const [name, description, price, stock, categoryName] of demoProducts) {
  if (!findProductByName.get(name)) {
    insertProduct.run(name, description, price, stock, categoryIds[categoryName]);
  }
}

function requireAdmin(req, res, next) {
  const authorization = req.get("authorization") || "";
  const suppliedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expected = Buffer.from(ADMIN_TOKEN);
  const supplied = Buffer.from(suppliedToken);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ message: "Нет доступа. Проверь ключ разработчика." });
  }
  next();
}

app.get("/", (req, res) => {
  res.send("Backend магазина техники работает");
});

app.get("/api/categories", (req, res) => {
  const categories = db.prepare("SELECT id, name FROM categories ORDER BY name").all();
  res.json(categories);
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const { name, description = "", price, stock = 0, categoryId } = req.body || {};
  const parsedPrice = Number(price);
  const parsedStock = Number(stock);
  const parsedCategoryId = Number(categoryId);
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) {
    return res.status(400).json({ message: "Название обязательно и должно быть не длиннее 120 символов." });
  }
  if (typeof description !== "string" || description.length > 1000) {
    return res.status(400).json({ message: "Описание должно быть текстом до 1000 символов." });
  }
  if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ message: "Цена должна быть целым числом от 0 сом." });
  }
  if (!Number.isInteger(parsedStock) || parsedStock < 0) {
    return res.status(400).json({ message: "Количество на складе должно быть целым числом от 0." });
  }
  if (!Number.isInteger(parsedCategoryId) || !categoryIds[Object.keys(categoryIds).find((name) => categoryIds[name] === parsedCategoryId)]) {
    return res.status(400).json({ message: "Выбери категорию из списка." });
  }

  const categoryName = Object.keys(categoryIds).find((name) => categoryIds[name] === parsedCategoryId);
  const result = db.prepare(`
    INSERT INTO products (name, description, price, stock, category_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), description.trim(), parsedPrice, parsedStock, parsedCategoryId);
  res.status(201).json({
    id: Number(result.lastInsertRowid),
    name: name.trim(),
    description: description.trim(),
    price: parsedPrice,
    stock: parsedStock,
    category: categoryName,
  });
});

app.get("/api/products", (req, res) => {
  const { q, category_id, min_price, max_price, in_stock, sort, page, limit } = req.query;
  const conditions = [];
  const values = [];

  if (q !== undefined) {
    if (typeof q !== "string" || q.trim().length > 100) {
      return res.status(400).json({ message: "Параметр q должен содержать не более 100 символов" });
    }
    const search = `%${q.trim()}%`;
    conditions.push("(products.name LIKE ? OR products.description LIKE ?)");
    values.push(search, search);
  }

  if (category_id !== undefined) {
    const categoryId = Number(category_id);
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      return res.status(400).json({ message: "category_id должен быть положительным целым числом" });
    }
    conditions.push("products.category_id = ?");
    values.push(categoryId);
  }

  for (const [key, value] of [["min_price", min_price], ["max_price", max_price]]) {
    if (value !== undefined) {
      const price = Number(value);
      if (!Number.isInteger(price) || price < 0) {
        return res.status(400).json({ message: `${key} должен быть целым числом не меньше 0` });
      }
      conditions.push(key === "min_price" ? "products.price >= ?" : "products.price <= ?");
      values.push(price);
    }
  }

  if (min_price !== undefined && max_price !== undefined && Number(min_price) > Number(max_price)) {
    return res.status(400).json({ message: "min_price не может быть больше max_price" });
  }

  if (in_stock !== undefined) {
    if (in_stock !== "true" && in_stock !== "false") {
      return res.status(400).json({ message: "in_stock должен быть true или false" });
    }
    conditions.push(in_stock === "true" ? "products.stock > 0" : "products.stock = 0");
  }

  const sortOptions = {
    id: "products.id ASC",
    price_asc: "products.price ASC, products.id ASC",
    price_desc: "products.price DESC, products.id ASC",
    name_asc: "products.name COLLATE NOCASE ASC, products.id ASC",
    name_desc: "products.name COLLATE NOCASE DESC, products.id ASC",
  };
  const orderBy = sortOptions[sort || "id"];
  if (!orderBy) {
    return res.status(400).json({
      message: "Неизвестная сортировка",
      allowed: Object.keys(sortOptions),
    });
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const from = `
    FROM products
    JOIN categories ON categories.id = products.category_id
    ${where}
  `;
  const selectProducts = `
    SELECT products.id, products.name, products.description, products.price,
           products.stock, products.category_id, categories.name AS category
    ${from}
    ORDER BY ${orderBy}
  `;

  // Без page/limit маршрут, как и раньше, возвращает массив товаров.
  // Если передана пагинация, возвращаем items и общее количество результатов.
  if (page === undefined && limit === undefined) {
    return res.json(db.prepare(selectProducts).all(...values));
  }

  const parsedPage = page === undefined ? 1 : Number(page);
  const parsedLimit = limit === undefined ? 10 : Number(limit);
  if (!Number.isInteger(parsedPage) || parsedPage < 1 || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return res.status(400).json({ message: "page должен быть >= 1, limit — от 1 до 100" });
  }

  const total = db.prepare(`SELECT COUNT(*) AS total ${from}`).get(...values).total;
  const items = db.prepare(`${selectProducts} LIMIT ? OFFSET ?`)
    .all(...values, parsedLimit, (parsedPage - 1) * parsedLimit);
  res.json({
    items,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  });
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
  const baseUrl = `http://localhost:${PORT}`;
  const exampleCategory = db.prepare("SELECT id FROM categories ORDER BY id LIMIT 1").get();

  console.log(`Сервер запущен: ${baseUrl}`);
  console.log(`Ключ панели разработчика (вставь в frontend/admin.html): ${ADMIN_TOKEN}`);
  console.log("API — нажимай Ctrl+клик по ссылкам в терминале VS Code:");
  console.log(`Все товары: ${baseUrl}/api/products`);
  console.log(`Поиск «ноутбук»: ${baseUrl}/api/products?q=${encodeURIComponent("ноутбук")}`);
  if (exampleCategory) {
    console.log(`Фильтр по категории (ID ${exampleCategory.id}): ${baseUrl}/api/products?category_id=${exampleCategory.id}`);
  }
  console.log(`Товары в наличии: ${baseUrl}/api/products?in_stock=true`);
  console.log(`Сортировка по цене: ${baseUrl}/api/products?sort=price_asc`);
  console.log(`Поиск + фильтр + страницы: ${baseUrl}/api/products?q=${encodeURIComponent("смартфон")}&in_stock=true&sort=price_asc&page=1&limit=10`);
  console.log(`Категории: ${baseUrl}/api/categories`);
  console.log("База SQLite: backend/data/store.sqlite");
});
