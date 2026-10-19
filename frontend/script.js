const S = {
  pc:'<rect x="3" y="4" width="13" height="10" rx="1.5"/><path d="M7 18h5M9.5 14v4"/><rect x="18" y="6" width="3.5" height="12" rx="1"/>',
  kit:'<rect x="3" y="3" width="12" height="8" rx="1.5"/><path d="M9 11v2"/><rect x="2" y="15" width="14" height="5" rx="1"/><path d="M5 17.5h.01M8 17.5h.01M11 17.5h.01M14 17.5h.01"/><rect x="18" y="3" width="4" height="17" rx="1"/><circle cx="20" cy="15" r=".8"/>',
  laptop:'<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2.5 19h19l-1.5-4H4z"/>',
  monitor:'<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  chip:'<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  mouse:'<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 3v6"/>',
  kbd:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 13.5h.01M10 13.5h.01M14 13.5h.01M18 13.5h.01M8 16h8"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  head:'<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'
};
const svg = (k, vb='0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${S[k]}</svg>`;

const cats = [
  ['Персональные компьютеры','pc'],['Готовые игровые комплекты','kit'],['Ноутбуки','laptop'],
  ['Мониторы','monitor'],['Комплектующие','chip'],['Мыши','mouse'],['Клавиатуры','kbd']
];
document.getElementById('cats').innerHTML = cats.map(([n,k]) =>
  `<a class="cat lift" href="#"><span class="ic">${svg(k)}</span>${n}</a>`).join('');

const items = [
  ['Ноутбук','Игровой ноутбук 16", 16 ГБ, RTX','laptop','89 900'],
  ['Ноутбук','Ноутбук для работы 15.6", 8 ГБ','laptop','47 500'],
  ['Монитор','Монитор 27", IPS, 165 Гц','monitor','24 900'],
  ['Системный блок','Игровой ПК, Ryzen 5, 32 ГБ','pc','98 000'],
  ['Комплектующие','Видеокарта 8 ГБ GDDR6','chip','52 300'],
  ['Мышь','Игровая мышь, 12 000 DPI','mouse','2 490'],
  ['Смартфон','Смартфон 6.7", 256 ГБ','phone','36 900'],
  ['Наушники','Беспроводные наушники с ANC','head','7 800']
];
document.getElementById('grid').innerHTML = items.map(([b,n,k,p]) => `
  <article class="card lift" tabindex="0">
    <div class="pic">${svg(k)}</div>
    <div class="info">
      <div class="brand"><span>${b}</span><span class="stock">В наличии</span></div>
      <div class="name">${n}</div>
      <div class="buy"><span class="price">${p} <small>сом</small></span><button class="btn" type="button">В корзину</button></div>
    </div>
  </article>`).join('');
