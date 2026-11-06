"use client";

import { useState } from "react";
import { Sidebar, StatCard, StockBadge } from "./components";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Backpack,
  Box,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  Headphones,
  Keyboard,
  LampDesk,
  Layers3,
  Menu,
  Mouse,
  Package,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Warehouse,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { demoCompanies, demoInventories, getDemoInventory } from "./data";

const number = new Intl.NumberFormat("es-AR");
const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const symbols: Record<string, LucideIcon> = {
  headphones: Headphones,
  lamp: LampDesk,
  backpack: Backpack,
  keyboard: Keyboard,
  bottle: Waves,
  mouse: Mouse,
  box: Box,
};
export function DemoDashboard() {
  const [companyId, setCompanyId] = useState<string>(demoCompanies[0].id);
  const [inventoryId, setInventoryId] = useState<string>(demoInventories[0].id);
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const company = demoCompanies.find((c) => c.id === companyId)!;
  const inventories = demoInventories.filter((i) => i.companyId === companyId);
  const inventory = inventories.find((i) => i.id === inventoryId)!;
  const data = getDemoInventory(companyId, inventoryId);
  const filtered = data.products.filter(
    (p) =>
      `${p.name} ${p.sku} ${p.category}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")) &&
      (!onlyLowStock || p.stock <= p.minimum),
  );
  const warehouses = [...new Set(data.products.map((p) => p.warehouse))];
  const week = Array.from({ length: 7 }, (_, day) => {
    const movements = data.movements.filter((m) => m.day === day);
    return {
      label: ["Sáb", "Dom", "Lun", "Mar", "Mié", "Jue", "Vie"][day],
      incoming: movements.reduce((s, m) => s + Math.max(0, m.delta), 0),
      outgoing: movements.reduce((s, m) => s + Math.max(0, -m.delta), 0),
    };
  });
  const max = Math.max(1, ...week.flatMap((d) => [d.incoming, d.outgoing]));
  const incoming = week.reduce((s, d) => s + d.incoming, 0);
  const outgoing = week.reduce((s, d) => s + d.outgoing, 0);

  function changeCompany(id: string) {
    const first = demoInventories.find((i) => i.companyId === id);
    if (!first) return;
    setCompanyId(id);
    setInventoryId(first.id);
    setSearch("");
    setOnlyLowStock(false);
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-[#141a1d] lg:block">
        <Sidebar />
      </aside>
      <div className="lg:pl-60">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b px-5 py-4 md:px-8 xl:px-10">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-[#141a1d] p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menú de navegación</SheetTitle>
                </SheetHeader>
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="hidden text-xs text-muted-foreground md:inline">
              Espacio de trabajo
            </span>
            <ChevronRight className="hidden size-3 text-muted-foreground md:block" />
            <span className="text-xs font-medium">Vista general</span>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="hidden size-4 text-muted-foreground sm:block" />
            <Select value={companyId} onValueChange={changeCompany}>
              <SelectTrigger
                aria-label="Empresa"
                className="w-48 border-0 bg-transparent text-xs sm:w-52"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {demoCompanies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="flex size-8 items-center justify-center rounded-lg border bg-secondary text-[10px] font-semibold">
              {company.initials}
            </span>
          </div>
        </header>
        <main
          id="main"
          className="mx-auto max-w-[1600px] space-y-7 px-5 pt-8 pb-10 md:px-8 xl:px-10"
        >
          <section
            id="overview"
            className="flex flex-wrap items-end justify-between gap-5"
          >
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                <p className="text-[10px] font-semibold tracking-[0.18em] text-primary">
                  TU OPERACIÓN, EN PERSPECTIVA
                </p>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Vista general
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Todo lo que necesitás saber sobre tu inventario.
              </p>
            </div>
            <div>
              <label
                htmlFor="inventory"
                className="mb-2 block text-[10px] font-medium tracking-wider text-muted-foreground"
              >
                INVENTARIO ACTIVO
              </label>
              <Select
                value={inventoryId}
                onValueChange={(id) => {
                  setInventoryId(id);
                  setSearch("");
                  setOnlyLowStock(false);
                }}
              >
                <SelectTrigger
                  id="inventory"
                  aria-label="Inventario"
                  className="h-10 min-w-64 bg-card text-xs"
                >
                  <Layers3 className="mr-1 size-4 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inventories.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/15 bg-primary/[0.035] px-4 py-3 text-xs text-muted-foreground">
            <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <p>
              <span className="font-medium text-foreground">
                Modo demostración.
              </span>{" "}
              Explorá las empresas e inventarios de ejemplo. No se realizan
              operaciones reales.
            </p>
            <Badge
              variant="outline"
              className="ml-auto hidden shrink-0 border-primary/20 text-[9px] text-primary sm:inline-flex"
            >
              BASE INICIAL · v0.1
            </Badge>
          </div>
          <section
            aria-label="Resumen del inventario"
            aria-live="polite"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <StatCard
              label="Valor del inventario"
              value={money.format(data.value)}
              note="Valuación a costo · ARS"
              icon={Layers3}
              accent
            />
            <StatCard
              label="Productos registrados"
              value={number.format(data.products.length)}
              note="SKU únicos en este inventario"
              icon={Package}
            />
            <StatCard
              label="Unidades disponibles"
              value={number.format(data.units)}
              note={`Distribuidas en ${warehouses.length} depósitos`}
              icon={Box}
            />
            <StatCard
              label="Productos por reponer"
              value={number.format(data.lowStock)}
              note="En el mínimo o por debajo"
              icon={TriangleAlert}
            />
          </section>
          <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
            <Card className="gap-5 py-5 shadow-none">
              <CardHeader className="flex flex-row items-start justify-between px-5">
                <div>
                  <CardTitle className="text-sm font-medium">
                    Actividad del inventario
                  </CardTitle>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    31 oct. – 6 nov. 2026 · Semana de ejemplo
                  </p>
                </div>
                <span className="rounded-md border px-2.5 py-1 text-[10px] text-muted-foreground">
                  7 días
                </span>
              </CardHeader>
              <CardContent className="px-5">
                <div className="mb-5 flex gap-7">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary" />
                      Entradas
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">
                      {incoming}
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                        unidades
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#617a78]" />
                      Salidas
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">
                      {outgoing}
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                        unidades
                      </span>
                    </p>
                  </div>
                </div>
                <figure aria-label="Entradas y salidas por día de la semana">
                  <div className="relative">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-7"
                    >
                      {[0, 1, 2, 3].map((line) => (
                        <div
                          key={line}
                          className="border-t border-dashed border-border/70"
                        />
                      ))}
                    </div>
                    <div className="relative flex h-40 items-end justify-around gap-3">
                      {week.map((d) => (
                        <div
                          key={d.label}
                          className="flex h-full w-full max-w-12 flex-col justify-end"
                        >
                          <div className="flex h-32 items-end justify-center gap-1.5">
                            <div
                              title={`${d.label}: ${d.incoming} entradas`}
                              className="w-3 rounded-t-sm bg-primary/90 sm:w-4"
                              style={{
                                height: `${(d.incoming / max) * 100}%`,
                                minHeight: d.incoming ? 4 : 0,
                              }}
                            />
                            <div
                              title={`${d.label}: ${d.outgoing} salidas`}
                              className="w-3 rounded-t-sm bg-[#617a78] sm:w-4"
                              style={{
                                height: `${(d.outgoing / max) * 100}%`,
                                minHeight: d.outgoing ? 4 : 0,
                              }}
                            />
                          </div>
                          <span className="mt-3 text-center text-[10px] text-muted-foreground">
                            {d.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <figcaption className="sr-only">
                    {week
                      .map(
                        (d) =>
                          `${d.label}: ${d.incoming} entradas y ${d.outgoing} salidas`,
                      )
                      .join(". ")}
                  </figcaption>
                </figure>
              </CardContent>
            </Card>
            <Card className="gap-0 py-5 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between px-5">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <TriangleAlert className="size-4 text-amber-200" />
                  Necesitan atención
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {data.lowStock} productos
                </span>
              </CardHeader>
              <CardContent className="flex h-full flex-col px-5">
                <div className="mt-5 space-y-5">
                  {data.products
                    .filter((p) => p.stock <= p.minimum)
                    .slice(0, 3)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {p.name}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {p.sku} · Mínimo: {p.minimum}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-2 py-1 text-[11px] tabular-nums",
                            p.stock
                              ? "bg-amber-200/5 text-amber-200"
                              : "bg-rose-300/5 text-rose-300",
                          )}
                        >
                          {p.stock} un.
                        </span>
                      </div>
                    ))}
                </div>
                <Button
                  asChild
                  variant="ghost"
                  className="mt-auto w-full justify-between border-t pt-5 text-xs text-primary"
                >
                  <a href="#stock" onClick={() => setOnlyLowStock(true)}>
                    Ver productos por reponer{" "}
                    <ArrowRight className="size-3.5" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
          <section id="stock">
            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:flex-row">
                <div>
                  <CardTitle className="text-sm font-medium">
                    Stock de productos
                  </CardTitle>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {inventory.name} <span className="px-1">/</span>{" "}
                    {company.name}
                  </p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <div className="relative flex-1 sm:w-52">
                    <Search className="pointer-events-none absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
                    <Input
                      aria-label="Buscar productos"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar producto o SKU…"
                      className="h-9 pl-9 text-xs"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant={onlyLowStock ? "default" : "outline"}
                    className="size-9"
                    aria-label="Mostrar solo stock bajo"
                    aria-pressed={onlyLowStock}
                    onClick={() => setOnlyLowStock((v) => !v)}
                  >
                    <SlidersHorizontal className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background/40 hover:bg-background/40">
                      <TableHead className="pl-5 text-[10px]">
                        PRODUCTO
                      </TableHead>
                      <TableHead className="text-[10px]">CATEGORÍA</TableHead>
                      <TableHead className="text-right text-[10px]">
                        STOCK
                      </TableHead>
                      <TableHead className="pl-6 text-[10px]">ESTADO</TableHead>
                      <TableHead className="pr-5 text-right text-[10px]">
                        COSTO UNITARIO
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const Icon = symbols[p.symbol] ?? Box;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="py-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-secondary/50 text-[#b9cac6]">
                                <Icon className="size-[18px]" />
                              </span>
                              <div>
                                <p className="text-xs font-medium">{p.name}</p>
                                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                  {p.sku}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.category}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums">
                            {number.format(p.stock)}
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                              un.
                            </span>
                          </TableCell>
                          <TableCell className="pl-6">
                            <StockBadge product={p} />
                          </TableCell>
                          <TableCell className="pr-5 text-right text-xs tabular-nums text-muted-foreground">
                            {money.format(p.cost)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-28 text-center text-sm text-muted-foreground"
                        >
                          No hay productos que coincidan con los filtros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5 text-[10px] text-muted-foreground">
                  <p>
                    Mostrando {filtered.length} de {data.products.length}{" "}
                    productos de demostración
                  </p>
                  {search || onlyLowStock ? (
                    <button
                      className="text-primary"
                      onClick={() => {
                        setSearch("");
                        setOnlyLowStock(false);
                      }}
                    >
                      Limpiar filtros
                    </button>
                  ) : (
                    <p>
                      Los cambios de stock estarán disponibles en la próxima
                      etapa
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
          <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
            <section id="movements">
              <Card className="h-full gap-4 py-5 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between px-5">
                  <CardTitle className="text-sm font-medium">
                    Últimos movimientos
                  </CardTitle>
                  <span className="text-[10px] text-muted-foreground">
                    DATOS DE EJEMPLO
                  </span>
                </CardHeader>
                <CardContent className="space-y-4 px-5">
                  {[...data.movements]
                    .sort(
                      (a, b) => b.day - a.day || b.time.localeCompare(a.time),
                    )
                    .slice(0, 4)
                    .map((m) => (
                      <div key={m.id} className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full",
                            m.delta > 0
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-[#b0c3c0]",
                          )}
                        >
                          {m.delta > 0 ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {
                              data.products.find((p) => p.id === m.productId)
                                ?.name
                            }
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {m.reason} · {m.day} nov., {m.time}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "ml-auto shrink-0 text-xs font-medium tabular-nums",
                            m.delta > 0
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {m.delta > 0 ? "+" : ""}
                          {m.delta} un.
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </section>
            <section id="warehouses">
              <Card className="h-full gap-4 py-5 shadow-none">
                <CardHeader className="px-5">
                  <CardTitle className="text-sm font-medium">
                    Tus depósitos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 px-5">
                  {warehouses.map((w) => {
                    const units = data.products
                      .filter((p) => p.warehouse === w)
                      .reduce((s, p) => s + p.stock, 0);
                    return (
                      <div key={w}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="flex items-center gap-2 text-xs">
                            <Warehouse className="size-3.5 text-muted-foreground" />
                            {w}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {number.format(units)} un.
                          </p>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{
                              width: `${data.units ? (units / data.units) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="border-t pt-4 text-[10px] leading-relaxed text-muted-foreground">
                    Distribución de unidades por depósito en el inventario
                    seleccionado.
                  </p>
                </CardContent>
              </Card>
            </section>
          </div>
          <section
            id="foundation"
            className="flex flex-wrap items-start gap-4 rounded-xl border border-dashed p-5"
          >
            <ShieldCheck className="mt-0.5 size-5 text-primary" />
            <div className="max-w-2xl flex-1">
              <h2 className="text-sm font-medium">
                La estructura está lista. El siguiente paso es conectar tu
                operación.
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Esta primera versión prepara el esquema multiempresa, los
                permisos del servidor y la conexión a Neon. El acceso real, las
                altas de productos, las fotografías y los movimientos se
                desarrollarán en las próximas etapas.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-[10px] text-primary">
                <Check className="size-3" />
                Sin datos reales ni escrituras en una base de datos
              </p>
            </div>
            <CircleHelp className="hidden size-4 text-muted-foreground sm:block" />
          </section>
          <footer className="flex flex-wrap justify-between gap-2 text-[10px] text-muted-foreground">
            <p>
              Inventario SaaS <span className="px-1">·</span> Una visión clara
              de tu stock.
            </p>
            <p>
              Base inicial v0.1 <span className="px-1">·</span> Entorno de
              demostración
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
