// Public, fictional fixtures. Never imported by server repositories or authentication.
export const demoCompanies = [
  { id: "norte", name: "Norte Distribuciones", initials: "ND" },
  { id: "sur", name: "Sur Estudio", initials: "SE" },
] as const;
export const demoInventories = [
  { id: "general", companyId: "norte", name: "Inventario general" },
  { id: "repuestos", companyId: "norte", name: "Repuestos y mantenimiento" },
  { id: "estudio", companyId: "sur", name: "Equipamiento del estudio" },
] as const;
export type DemoProduct = {
  id: string;
  companyId: string;
  inventoryId: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minimum: number;
  cost: number;
  warehouse: string;
  symbol: string;
};
export const demoProducts: DemoProduct[] = [
  {
    id: "p1",
    companyId: "norte",
    inventoryId: "general",
    name: "Auriculares inalámbricos",
    sku: "TEC-001",
    category: "Tecnología",
    stock: 124,
    minimum: 30,
    cost: 24900,
    warehouse: "Depósito central",
    symbol: "headphones",
  },
  {
    id: "p2",
    companyId: "norte",
    inventoryId: "general",
    name: "Lámpara de escritorio",
    sku: "HOG-002",
    category: "Hogar y oficina",
    stock: 18,
    minimum: 25,
    cost: 18200,
    warehouse: "Depósito central",
    symbol: "lamp",
  },
  {
    id: "p3",
    companyId: "norte",
    inventoryId: "general",
    name: "Mochila urbana",
    sku: "ACC-003",
    category: "Accesorios",
    stock: 86,
    minimum: 20,
    cost: 32500,
    warehouse: "Depósito secundario",
    symbol: "backpack",
  },
  {
    id: "p4",
    companyId: "norte",
    inventoryId: "general",
    name: "Teclado mecánico",
    sku: "TEC-004",
    category: "Tecnología",
    stock: 0,
    minimum: 15,
    cost: 42600,
    warehouse: "Depósito central",
    symbol: "keyboard",
  },
  {
    id: "p5",
    companyId: "norte",
    inventoryId: "general",
    name: "Botella térmica 750 ml",
    sku: "ACC-005",
    category: "Accesorios",
    stock: 212,
    minimum: 40,
    cost: 12800,
    warehouse: "Depósito secundario",
    symbol: "bottle",
  },
  {
    id: "p6",
    companyId: "norte",
    inventoryId: "general",
    name: "Mouse inalámbrico",
    sku: "TEC-006",
    category: "Tecnología",
    stock: 12,
    minimum: 20,
    cost: 14500,
    warehouse: "Depósito central",
    symbol: "mouse",
  },
  {
    id: "p7",
    companyId: "norte",
    inventoryId: "repuestos",
    name: "Rodamiento industrial",
    sku: "REP-001",
    category: "Mecánica",
    stock: 45,
    minimum: 10,
    cost: 9600,
    warehouse: "Taller",
    symbol: "box",
  },
  {
    id: "p8",
    companyId: "norte",
    inventoryId: "repuestos",
    name: "Correa de transmisión",
    sku: "REP-002",
    category: "Mecánica",
    stock: 4,
    minimum: 8,
    cost: 7400,
    warehouse: "Taller",
    symbol: "box",
  },
  {
    id: "p9",
    companyId: "sur",
    inventoryId: "estudio",
    name: "Monitor de estudio",
    sku: "EST-001",
    category: "Audio",
    stock: 8,
    minimum: 2,
    cost: 285000,
    warehouse: "Sala técnica",
    symbol: "box",
  },
  {
    id: "p10",
    companyId: "sur",
    inventoryId: "estudio",
    name: "Micrófono de condensador",
    sku: "EST-002",
    category: "Audio",
    stock: 1,
    minimum: 3,
    cost: 145000,
    warehouse: "Sala técnica",
    symbol: "box",
  },
];
export const demoMovements = [
  {
    id: "m1",
    productId: "p1",
    delta: 24,
    day: 6,
    time: "10:42",
    reason: "Recepción de mercadería",
  },
  {
    id: "m2",
    productId: "p3",
    delta: -8,
    day: 6,
    time: "10:15",
    reason: "Despacho de pedido",
  },
  {
    id: "m3",
    productId: "p5",
    delta: 60,
    day: 5,
    time: "16:30",
    reason: "Recepción de mercadería",
  },
  {
    id: "m4",
    productId: "p2",
    delta: -5,
    day: 4,
    time: "14:20",
    reason: "Despacho de pedido",
  },
  {
    id: "m5",
    productId: "p6",
    delta: -12,
    day: 3,
    time: "11:05",
    reason: "Despacho de pedido",
  },
  {
    id: "m6",
    productId: "p1",
    delta: 40,
    day: 2,
    time: "09:10",
    reason: "Recepción de mercadería",
  },
  {
    id: "m7",
    productId: "p3",
    delta: -16,
    day: 1,
    time: "15:40",
    reason: "Despacho de pedido",
  },
  {
    id: "m8",
    productId: "p7",
    delta: 15,
    day: 6,
    time: "09:20",
    reason: "Recepción de repuestos",
  },
  {
    id: "m9",
    productId: "p8",
    delta: -2,
    day: 4,
    time: "12:05",
    reason: "Mantenimiento",
  },
  {
    id: "m10",
    productId: "p9",
    delta: 2,
    day: 5,
    time: "11:30",
    reason: "Alta de equipamiento",
  },
  {
    id: "m11",
    productId: "p10",
    delta: -1,
    day: 6,
    time: "13:10",
    reason: "Salida a reparación",
  },
];

export function getDemoInventory(companyId: string, inventoryId: string) {
  const products = demoProducts.filter(
    (p) => p.companyId === companyId && p.inventoryId === inventoryId,
  );
  const ids = new Set(products.map((p) => p.id));
  const movements = demoMovements.filter((m) => ids.has(m.productId));
  return {
    products,
    movements,
    units: products.reduce((sum, p) => sum + p.stock, 0),
    value: products.reduce((sum, p) => sum + p.stock * p.cost, 0),
    lowStock: products.filter((p) => p.stock <= p.minimum).length,
  };
}
