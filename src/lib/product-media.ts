export interface ProductMediaSpec {
  swatchImageUrl: string;
  productUrl: string;
  vendorName: string;
}

function makeProductSvgDataUri(opts: {
  title: string;
  subtitle: string;
  bgHex: string;
  accentHex: string;
  pattern: "cf8i" | "wood" | "tile" | "quartz" | "fixture" | "hvac" | "paint" | "appliance" | "cabinet" | "lighting";
}): string {
  const { title, subtitle, bgHex, accentHex, pattern } = opts;
  let graphic = "";

  if (pattern === "cf8i") {
    graphic = `
      <rect x="24" y="22" width="112" height="72" rx="6" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2"/>
      <rect x="24" y="22" width="32" height="72" rx="4" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.5"/>
      <rect x="56" y="22" width="68" height="72" fill="#CBD5E1"/>
      <line x1="72" y1="22" x2="72" y2="94" stroke="#475569" stroke-width="2" stroke-dasharray="4 3"/>
      <line x1="100" y1="22" x2="100" y2="94" stroke="#475569" stroke-width="2" stroke-dasharray="4 3"/>
      <circle cx="86" cy="45" r="5" fill="#DC2626"/>
      <circle cx="86" cy="72" r="5" fill="#DC2626"/>
    `;
  } else if (pattern === "wood") {
    graphic = `
      <rect x="20" y="20" width="120" height="76" rx="6" fill="${bgHex}" stroke="${accentHex}" stroke-width="2"/>
      <line x1="20" y1="39" x2="140" y2="39" stroke="${accentHex}" stroke-width="1.5" opacity="0.6"/>
      <line x1="20" y1="58" x2="140" y2="58" stroke="${accentHex}" stroke-width="1.5" opacity="0.6"/>
      <line x1="20" y1="77" x2="140" y2="77" stroke="${accentHex}" stroke-width="1.5" opacity="0.6"/>
      <line x1="75" y1="20" x2="75" y2="39" stroke="${accentHex}" stroke-width="1.5" opacity="0.6"/>
      <line x1="105" y1="39" x2="105" y2="58" stroke="${accentHex}" stroke-width="1.5" opacity="0.6"/>
      <line x1="55" y1="58" x2="55" y2="77" stroke="${accentHex}" stroke-width="1.5" opacity="0.6"/>
    `;
  } else if (pattern === "tile" || pattern === "quartz") {
    graphic = `
      <rect x="22" y="20" width="116" height="76" rx="6" fill="${bgHex}" stroke="#94A3B8" stroke-width="2"/>
      <path d="M28 35 Q65 48 92 30 T132 52" stroke="${accentHex}" stroke-width="2" fill="none" opacity="0.55"/>
      <path d="M25 72 Q70 55 108 78 T135 68" stroke="${accentHex}" stroke-width="1.5" fill="none" opacity="0.45"/>
      <line x1="80" y1="20" x2="80" y2="96" stroke="#CBD5E1" stroke-width="1" opacity="0.5"/>
    `;
  } else if (pattern === "fixture") {
    graphic = `
      <rect x="28" y="18" width="104" height="78" rx="8" fill="#1E293B" stroke="${accentHex}" stroke-width="2"/>
      <path d="M62 78 L62 40 Q62 28 76 28 L96 28 Q106 28 106 38 L106 46" stroke="${bgHex}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="62" cy="78" r="8" fill="${bgHex}"/>
      <rect x="86" y="56" width="18" height="6" rx="3" fill="${bgHex}"/>
    `;
  } else if (pattern === "cabinet") {
    graphic = `
      <rect x="24" y="18" width="112" height="78" rx="6" fill="${bgHex}" stroke="#475569" stroke-width="2"/>
      <rect x="30" y="24" width="47" height="66" rx="3" fill="none" stroke="${accentHex}" stroke-width="2"/>
      <rect x="83" y="24" width="47" height="66" rx="3" fill="none" stroke="${accentHex}" stroke-width="2"/>
      <line x1="72" y1="48" x2="72" y2="62" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
      <line x1="88" y1="48" x2="88" y2="62" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
    `;
  } else if (pattern === "appliance") {
    graphic = `
      <rect x="26" y="16" width="108" height="80" rx="6" fill="#334155" stroke="#94A3B8" stroke-width="2"/>
      <rect x="34" y="24" width="92" height="14" rx="2" fill="#0F172A"/>
      <circle cx="46" cy="31" r="3" fill="#EF4444"/>
      <circle cx="58" cy="31" r="3" fill="#EF4444"/>
      <circle cx="102" cy="31" r="3" fill="#EF4444"/>
      <circle cx="114" cy="31" r="3" fill="#EF4444"/>
      <rect x="36" y="44" width="88" height="44" rx="4" fill="#1E293B" stroke="#64748B" stroke-width="1.5"/>
    `;
  } else if (pattern === "lighting") {
    graphic = `
      <rect x="24" y="18" width="112" height="78" rx="8" fill="#0F172A" stroke="#334155" stroke-width="2"/>
      <line x1="55" y1="18" x2="55" y2="48" stroke="${bgHex}" stroke-width="3"/>
      <line x1="80" y1="18" x2="80" y2="42" stroke="${bgHex}" stroke-width="3"/>
      <line x1="105" y1="18" x2="105" y2="52" stroke="${bgHex}" stroke-width="3"/>
      <circle cx="55" cy="56" r="9" fill="#FEF3C7" stroke="${bgHex}" stroke-width="2"/>
      <circle cx="80" cy="50" r="9" fill="#FEF3C7" stroke="${bgHex}" stroke-width="2"/>
      <circle cx="105" cy="60" r="9" fill="#FEF3C7" stroke="${bgHex}" stroke-width="2"/>
    `;
  } else if (pattern === "paint") {
    graphic = `
      <rect x="24" y="18" width="112" height="78" rx="8" fill="${bgHex}" stroke="#64748B" stroke-width="2"/>
      <rect x="24" y="70" width="112" height="26" rx="4" fill="#0F172A" opacity="0.82"/>
      <text x="32" y="87" fill="#F8FAFC" font-family="monospace" font-size="11" font-weight="bold">${subtitle}</text>
    `;
  } else {
    graphic = `
      <rect x="24" y="18" width="112" height="78" rx="8" fill="#1E293B" stroke="#38BDF8" stroke-width="2"/>
      <line x1="36" y1="44" x2="124" y2="44" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round"/>
      <line x1="36" y1="58" x2="124" y2="58" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
      <line x1="36" y1="72" x2="124" y2="72" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 125" fill="none">
    <rect width="160" height="125" rx="12" fill="#0B1120"/>
    ${graphic}
    <text x="80" y="114" text-anchor="middle" fill="#E2E8F0" font-family="sans-serif" font-size="10" font-weight="bold">${title.slice(0, 24)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getDefaultProductMedia(item: {
  sku?: string;
  manufacturer?: string;
  productName?: string;
  colorName?: string;
  colorCode?: string;
  colorHex?: string;
  tradeSlug?: string;
  swatchImageUrl?: string | null;
  productUrl?: string | null;
}): ProductMediaSpec {
  const sku = (item.sku || "").toUpperCase();
  const mfg = (item.manufacturer || "").toLowerCase();
  const trade = item.tradeSlug || "";
  const bgHex = item.colorHex || "#CBD5E1";

  let productUrl = item.productUrl || "";
  let vendorName = item.manufacturer || "Manufacturer Direct";
  let pattern: Parameters<typeof makeProductSvgDataUri>[0]["pattern"] = "fixture";

  if (sku.includes("NUFORM") || mfg.includes("nuform") || trade.includes("concrete")) {
    pattern = "cf8i";
    productUrl = productUrl || "https://www.nuformbuilding.com/conform/";
    vendorName = "Nuform Building Technologies (ConForm CF8i)";
  } else if (mfg.includes("kährs") || mfg.includes("kahrs") || sku.includes("KAHRS")) {
    pattern = "wood";
    productUrl = productUrl || "https://www.kahrs.com/en-US/wood-floors/oak-nouveau-snow/";
    vendorName = "Kährs Flooring USA";
  } else if (mfg.includes("heritage") || sku.includes("HICK")) {
    pattern = "wood";
    productUrl = productUrl || "https://www.nwfa.org/";
    vendorName = "Heritage Mill Timber Supply";
  } else if (mfg.includes("atlas") || sku.includes("AC-BST")) {
    pattern = "tile";
    productUrl = productUrl || "https://www.atlasconcorde.com/en/collections/ac/boost-stone/";
    vendorName = "Atlas Concorde USA Tile Studio";
  } else if (mfg.includes("coretec") || sku.includes("CAIRO")) {
    pattern = "wood";
    productUrl = productUrl || "https://coretecfloors.com/";
    vendorName = "COREtec Commercial & Residential";
  } else if (mfg.includes("cambria") || trade.includes("countertops")) {
    pattern = "quartz";
    productUrl = productUrl || "https://www.cambriausa.com/quartz-countertops/quartz-colors/designs/brittanicca-warm";
    vendorName = "Cambria Quartz Surfaces";
  } else if (mfg.includes("brizo") || sku.includes("T60P") || sku.includes("R60000")) {
    pattern = "fixture";
    productUrl = productUrl || "https://www.brizo.com/bath/collection/odin";
    vendorName = "Brizo Kitchen & Bath Showroom (Ferguson)";
  } else if (mfg.includes("uponor") || sku.includes("UPN")) {
    pattern = "hvac";
    productUrl = productUrl || "https://www.uponor.com/en-us/products/radiant-heating-and-cooling";
    vendorName = "Uponor Hydronic Radiant Supply";
  } else if (mfg.includes("tekmar") || sku.includes("TEK")) {
    pattern = "hvac";
    productUrl = productUrl || "https://www.watts.com/our-story/brands/tekmar";
    vendorName = "Watts / tekmar Controls";
  } else if (mfg.includes("titus") || sku.includes("TITUS")) {
    pattern = "hvac";
    productUrl = productUrl || "https://www.titus-hvac.com/Products/Diffusers/Architectural_Linear_Diffusers/FLB";
    vendorName = "Titus Architectural HVAC";
  } else if (mfg.includes("zehnder") || sku.includes("ZEH")) {
    pattern = "hvac";
    productUrl = productUrl || "https://www.zehnderamerica.com/comfoair-q-series/";
    vendorName = "Zehnder America Passivhaus ERV";
  } else if (mfg.includes("sherwin") || sku.includes("SW-")) {
    pattern = "paint";
    productUrl = productUrl || "https://www.sherwin-williams.com/en-us/color/color-family/white-paint-colors/sw7008-alabaster";
    vendorName = "Sherwin-Williams Pro Store (Sunbury)";
  } else if (mfg.includes("shiloh") || mfg.includes("millwork") || trade.includes("cabinetry")) {
    pattern = "cabinet";
    productUrl = productUrl || "https://www.shilohcabinetry.com/";
    vendorName = "Shiloh Custom Cabinetry Dealer";
  } else if (mfg.includes("wolf") || mfg.includes("sub-zero") || trade.includes("appliances")) {
    pattern = "appliance";
    productUrl = productUrl || "https://www.subzero-wolf.com/";
    vendorName = "Sub-Zero, Wolf, and Cove Showroom";
  } else if (mfg.includes("visual comfort") || sku.includes("VC-KW")) {
    pattern = "lighting";
    productUrl = productUrl || "https://www.visualcomfort.com/";
    vendorName = "Visual Comfort & Co. Trade Portal";
  } else if (mfg.includes("lutron") || sku.includes("LUT")) {
    pattern = "lighting";
    productUrl = productUrl || "https://www.lutron.com/en-US/Products/Pages/ShadingSystems/Triathlon/Overview.aspx";
    vendorName = "Lutron Pro Shading & Controls";
  } else if (mfg.includes("james hardie") || sku.includes("JH-")) {
    pattern = "tile";
    productUrl = productUrl || "https://www.jameshardie.com/";
    vendorName = "James Hardie Building Products";
  } else if (mfg.includes("tesla") || sku.includes("EV-BISR")) {
    pattern = "hvac";
    productUrl = productUrl || "https://www.tesla.com/support/charging/wall-connector";
    vendorName = "Tesla / Eaton Electrical Supply";
  } else {
    productUrl = productUrl || "https://www.fergusonshowrooms.com/";
    vendorName = item.manufacturer || "Ferguson Bath, Kitchen & Lighting Gallery";
  }

  const swatchImageUrl =
    item.swatchImageUrl ||
    makeProductSvgDataUri({
      title: item.manufacturer || "KO Spec",
      subtitle: item.colorCode || item.sku || "SPEC",
      bgHex,
      accentHex: "#F59E0B",
      pattern,
    });

  return {
    swatchImageUrl,
    productUrl,
    vendorName,
  };
}
