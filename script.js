
"use strict";


// 1. KONFIGURASI API


const API_URL = "https://api-web.dnccudinus.org/api/mobil";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=80"
];


// 2. MENGAMBIL ELEMEN HTML


const carGrid = document.getElementById("carGrid");
const apiStatus = document.getElementById("apiStatus");
const apiHelp = document.getElementById("apiHelp");
const emptyState = document.getElementById("emptyState");
const carCount = document.getElementById("carCount");

const searchInput = document.getElementById("searchInput");
const brandFilter = document.getElementById("brandFilter");
const sortFilter = document.getElementById("sortFilter");

const themeToggle = document.getElementById("themeToggle");
const carDialog = document.getElementById("carDialog");
const dialogContent = document.getElementById("dialogContent");

const retryButton = document.getElementById("retryButton");
const emptyReset = document.getElementById("emptyReset");
const dialogClose = document.getElementById("dialogClose");

// Menyimpan semua data mobil
let cars = [];


// 3. FUNGSI MEMBACA DATA


function firstValue(object, keys) {
  if (!object || typeof object !== "object") {
    return "";
  }

  for (const key of keys) {
    const value = object[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
}

// Mencari array mobil meskipun berada
// di dalam object respons API bertingkat.
function extractArray(payload, depth = 0) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    depth > 6
  ) {
    return [];
  }

  const possibleKeys = [
    "data",
    "mobil",
    "mobils",
    "cars",
    "results",
    "items",
    "records",
    "vehicles"
  ];

  for (const key of possibleKeys) {
    if (payload[key] !== undefined) {
      const result = extractArray(
        payload[key],
        depth + 1
      );

      if (result.length > 0) {
        return result;
      }
    }
  }

  for (const value of Object.values(payload)) {
    if (value && typeof value === "object") {
      const result = extractArray(
        value,
        depth + 1
      );

      if (result.length > 0) {
        return result;
      }
    }
  }

  return [];
}


// 4. NORMALISASI DATA MOBIL


function getImageUrl(car) {
  return firstValue(car, [
    "gambar",
    "foto",
    "image",
    "img",
    "thumbnail",
    "url_gambar",
    "foto_mobil",
    "gambar_mobil",
    "image_url",
    "imageUrl",
    "fotoMobil",
    "gambarMobil",
    "urlFoto"
  ]);
}

function normalizeCar(car, index) {
  const rawPrice = firstValue(car, [
    "harga",
    "price",
    "harga_jual",
    "price_amount"
  ]);

  let numericPrice = 0;

  if (typeof rawPrice === "number") {
    numericPrice = rawPrice;
  } else {
    const cleanedPrice = String(rawPrice)
      .replace(/[^\d]/g, "");

    numericPrice = Number(cleanedPrice) || 0;
  }

  return {
    id:
      firstValue(car, [
        "id",
        "id_mobil",
        "kode"
      ]) || index + 1,

    name:
      firstValue(car, [
        "nama",
        "nama_mobil",
        "model",
        "name",
        "namaMobil"
      ]) || "Mobil " + (index + 1),

    brand:
      firstValue(car, [
        "merek",
        "brand",
        "merk",
        "nama_merek"
      ]) || "Lainnya",

    price: numericPrice,

    year:
      firstValue(car, [
        "tahun",
        "year",
        "tahun_produksi"
      ]) || "-",

    transmission:
      firstValue(car, [
        "transmisi",
        "transmission",
        "tipe_transmisi"
      ]) || "-",

    fuel:
      firstValue(car, [
        "bahan_bakar",
        "fuel",
        "bbm",
        "jenis_bahan_bakar"
      ]) || "-",

    mileage:
      firstValue(car, [
        "kilometer",
        "km",
        "mileage"
      ]) || "-",

    description:
      firstValue(car, [
        "deskripsi",
        "description",
        "keterangan"
      ]) || "Informasi detail mobil belum tersedia.",

    image: getImageUrl(car),

    fallbackImage:
      FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]
  };
}


// 5. FORMAT HARGA


function formatPrice(price) {
  if (!price || price <= 0) {
    return "Hubungi showroom";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(price);
}


// 6. MENGATUR URL GAMBAR


function safeImageUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    return "";
  }

  const value = url.trim();

  try {
    // URL gambar lengkap
    if (/^https?:\/\//i.test(value)) {
      const parsed = new URL(value);

      if (
        parsed.protocol === "https:" ||
        parsed.protocol === "http:"
      ) {
        return parsed.href;
      }

      return "";
    }

    // URL gambar yang dimulai dengan /uploads/...
    if (value.startsWith("/") && !value.startsWith("//")) {
      return new URL(value, API_URL).href;
    }

    return "";
  } catch (error) {
    console.warn("URL gambar tidak valid:", url);
    return "";
  }
}


// 7. MEMBUAT GAMBAR MOBIL


function createImage(car) {
  const wrapper = document.createElement("div");
  wrapper.className = "car-image-wrap";

  const image = document.createElement("img");
  image.className = "car-image";
  image.alt = car.brand + " " + car.name;
  image.loading = "lazy";

  const fallback = document.createElement("div");
  fallback.className = "car-image-fallback";
  fallback.hidden = true;

  const icon = document.createElement("span");
  icon.textContent = "🚘";

  const message = document.createElement("p");
  message.textContent = "Gambar tidak tersedia";

  fallback.append(icon, message);

  const primaryImage = safeImageUrl(car.image);
  let usingFallback = !primaryImage;

  image.onerror = function () {
    if (!usingFallback) {
      usingFallback = true;
      this.src = car.fallbackImage;
      return;
    }

    this.hidden = true;
    fallback.hidden = false;
  };

  image.src = primaryImage || car.fallbackImage;

  wrapper.append(image, fallback);

  return wrapper;
}


// 8. MEMBUAT KARTU MOBIL


function createCarCard(car) {
  const card = document.createElement("article");
  card.className = "car-card";

  card.appendChild(createImage(car));

  const info = document.createElement("div");
  info.className = "car-info";

  const brand = document.createElement("p");
  brand.className = "car-brand";
  brand.textContent = car.brand;

  const name = document.createElement("h3");
  name.className = "car-name";
  name.textContent = car.name;

  const specs = document.createElement("div");
  specs.className = "car-specs";

  const specValues = [
    car.year,
    car.transmission,
    car.fuel
  ];

  specValues.forEach(value => {
    if (value && value !== "-") {
      const item = document.createElement("span");
      item.textContent = value;
      specs.appendChild(item);
    }
  });

  const bottom = document.createElement("div");
  bottom.className = "car-card-bottom";

  const priceWrap = document.createElement("div");

  const priceLabel = document.createElement("p");
  priceLabel.className = "price-label";
  priceLabel.textContent = "Harga";

  const price = document.createElement("p");
  price.className = "car-price";
  price.textContent = formatPrice(car.price);

  priceWrap.append(priceLabel, price);

  const detailButton = document.createElement("button");
  detailButton.className = "detail-btn";
  detailButton.type = "button";
  detailButton.textContent = "Lihat Detail";

  detailButton.addEventListener("click", function () {
    showDetails(car);
  });

  bottom.append(priceWrap, detailButton);
  info.append(brand, name, specs, bottom);
  card.appendChild(info);

  return card;
}


// 9. PENCARIAN, FILTER, DAN PENGURUTAN


function renderCars() {
  const keyword = searchInput.value
    .trim()
    .toLowerCase();

  const selectedBrand = brandFilter.value;
  const sortValue = sortFilter.value;

  let filteredCars = cars.filter(car => {
    const matchesSearch =
      String(car.name).toLowerCase().includes(keyword) ||
      String(car.brand).toLowerCase().includes(keyword);

    const matchesBrand =
      selectedBrand === "all" ||
      car.brand === selectedBrand;

    return matchesSearch && matchesBrand;
  });

  if (sortValue === "low") {
    filteredCars.sort((a, b) => a.price - b.price);
  } else if (sortValue === "high") {
    filteredCars.sort((a, b) => b.price - a.price);
  } else if (sortValue === "name") {
    filteredCars.sort((a, b) =>
      String(a.name).localeCompare(String(b.name), "id")
    );
  }

  carGrid.replaceChildren();

  const fragment = document.createDocumentFragment();

  filteredCars.forEach(car => {
    fragment.appendChild(createCarCard(car));
  });

  carGrid.appendChild(fragment);

  carCount.textContent = filteredCars.length + " mobil";
  emptyState.hidden = filteredCars.length > 0;
}


// 10. MENGISI FILTER MEREK


function populateBrands() {
  const previousValue = brandFilter.value;

  const brands = [
    ...new Set(cars.map(car => car.brand))
  ].sort((a, b) => a.localeCompare(b, "id"));

  brandFilter.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Semua Merek";

  brandFilter.appendChild(allOption);

  brands.forEach(brand => {
    const option = document.createElement("option");

    option.value = brand;
    option.textContent = brand;

    brandFilter.appendChild(option);
  });

  brandFilter.value = brands.includes(previousValue)
    ? previousValue
    : "all";
}


// 11. DETAIL MOBIL


function showDetails(car) {
  dialogContent.replaceChildren();

  const image = document.createElement("img");
  image.className = "dialog-image";
  image.alt = car.brand + " " + car.name;

  let usingFallback = false;

  image.onerror = function () {
    if (!usingFallback) {
      usingFallback = true;
      this.src = car.fallbackImage;
    } else {
      this.hidden = true;
    }
  };

  image.src = safeImageUrl(car.image) || car.fallbackImage;

  const body = document.createElement("div");
  body.className = "dialog-body";

  const brand = document.createElement("p");
  brand.className = "car-brand";
  brand.textContent = car.brand;

  const title = document.createElement("h2");
  title.id = "dialogTitle";
  title.textContent = car.name;

  const price = document.createElement("p");
  price.className = "dialog-price";
  price.textContent = formatPrice(car.price);

  const description = document.createElement("p");
  description.className = "dialog-description";
  description.textContent = car.description;

  const specs = document.createElement("div");
  specs.className = "dialog-specs";

  const details = [
    ["Tahun", car.year],
    ["Transmisi", car.transmission],
    ["Bahan bakar", car.fuel],
    ["Kilometer", car.mileage]
  ];

  details.forEach(([labelText, valueText]) => {
    const item = document.createElement("div");
    item.className = "dialog-spec";

    const label = document.createElement("span");
    label.textContent = labelText;

    const value = document.createElement("strong");
    value.textContent = valueText;

    item.append(label, value);
    specs.appendChild(item);
  });

  body.append(brand, title, price, description, specs);
  dialogContent.append(image, body);

  if (typeof carDialog.showModal === "function") {
    carDialog.showModal();
  } else {
    alert(car.name + "\n" + formatPrice(car.price));
  }
}


// 12. MENGAMBIL DATA DARI API


async function loadCars() {
  apiStatus.hidden = false;
  apiStatus.textContent = "Memuat data mobil...";

  apiHelp.hidden = true;
  emptyState.hidden = true;
  carGrid.replaceChildren();

  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    console.log("Status API:", response.status);

    if (!response.ok) {
      throw new Error(
        "Server mengembalikan status HTTP " +
        response.status
      );
    }

    const payload = await response.json();

    console.log("Respons JSON API:", payload);

    const data = extractArray(payload);

    if (data.length === 0) {
      console.error(
        "Daftar mobil tidak ditemukan dalam respons API:",
        payload
      );

      throw new Error(
        "API merespons, tetapi data mobil tidak ditemukan. Periksa struktur JSON di Console."
      );
    }

    cars = data.map(normalizeCar);

    populateBrands();
    renderCars();

    apiStatus.hidden = true;
    apiHelp.hidden = true;

    console.log(
      "Berhasil memuat " + cars.length + " mobil."
    );
  } catch (error) {
    console.error("Gagal mengambil data mobil:", error);

    cars = [];
    carGrid.replaceChildren();
    carCount.textContent = "0 mobil";

    apiStatus.hidden = false;

    if (
      error instanceof TypeError &&
      /fetch/i.test(error.message)
    ) {
      apiStatus.textContent =
        "API tidak dapat diakses. Periksa koneksi, alamat API, atau izin CORS.";
    } else {
      apiStatus.textContent = error.message;
    }

    apiHelp.hidden = false;
    emptyState.hidden = true;
  }
}


// 13. EVENT LISTENER


searchInput.addEventListener("input", renderCars);

brandFilter.addEventListener("change", renderCars);

sortFilter.addEventListener("change", renderCars);

if (retryButton) {
  retryButton.addEventListener("click", loadCars);
}

if (emptyReset) {
  emptyReset.addEventListener("click", function () {
    searchInput.value = "";
    brandFilter.value = "all";
    sortFilter.value = "default";

    renderCars();
  });
}

if (dialogClose) {
  dialogClose.addEventListener("click", function () {
    carDialog.close();
  });
}

if (carDialog) {
  carDialog.addEventListener("click", function (event) {
    if (event.target === carDialog) {
      carDialog.close();
    }
  });
}


// 14. PERGANTIAN TEMA


if (themeToggle) {
  themeToggle.addEventListener("click", function () {
    const isDark =
      document.body.dataset.theme !== "dark";

    if (isDark) {
      document.body.dataset.theme = "dark";
      themeToggle.textContent = "☀ Tema";
    } else {
      document.body.removeAttribute("data-theme");
      themeToggle.textContent = "☾ Tema";
    }
  });
}


// 15. TAHUN FOOTER


const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}


// 16. JALANKAN WEBSITE


loadCars();
