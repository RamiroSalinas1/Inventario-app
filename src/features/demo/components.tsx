import {
  ArrowDownLeft,
  ArrowRight,
  FlaskConical,
  Layers3,
  LayoutDashboard,
  Package,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DemoProduct } from "./data";

const navigation = [
  { label: "Vista general", href: "#overview", icon: LayoutDashboard },
  { label: "Stock de productos", href: "#stock", icon: Package },
  { label: "Movimientos", href: "#movements", icon: ArrowDownLeft },
  { label: "Depósitos", href: "#warehouses", icon: Warehouse },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col px-5 py-7">
      <a
        href="/demo"
        className="mb-11 flex items-center gap-3 px-2 text-xl font-semibold tracking-tight"
        aria-label="Inventario SaaS, inicio"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Layers3 className="size-5" />
        </span>
        inventario<span className="-ml-2 text-primary">.</span>
      </a>
      <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
        ESPACIO DE TRABAJO
      </p>
      <nav aria-label="Navegación principal" className="space-y-1.5">
        {navigation.map(({ label, href, icon: Icon }, i) => (
          <a
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
              i === 0
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-[18px]" />
            {label}
            {i === 0 && (
              <span className="ml-auto size-1.5 rounded-full bg-primary" />
            )}
          </a>
        ))}
      </nav>
      <div className="mt-9 border-t pt-6">
        <p className="px-3 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
          PRÓXIMAMENTE
        </p>
        <div className="mt-3 space-y-4 px-3 text-sm text-muted-foreground/65">
          <p>Proveedores y categorías</p>
          <p>Usuarios y permisos</p>
          <p>Informes y exportación</p>
        </div>
      </div>
      <div className="mt-auto pt-10">
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
          <FlaskConical className="mb-3 size-5 text-primary" />
          <p className="text-sm font-medium">Una base para crecer</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Estás explorando un entorno de demostración. Todos los datos son
            ficticios.
          </p>
          <a
            href="#foundation"
            onClick={onNavigate}
            className="mt-4 flex items-center gap-2 text-xs font-medium text-primary"
          >
            Conocer esta versión <ArrowRight className="size-3.5" />
          </a>
        </div>
        <div className="mt-6 flex items-center gap-3 px-2 text-xs text-muted-foreground">
          <span className="flex size-8 items-center justify-center rounded-full border bg-secondary">
            <FlaskConical className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">Visitante de la demo</p>
            <p className="mt-0.5 text-[11px]">Sin sesión iniciada</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "gap-0 py-5 shadow-none",
        accent && "border-primary/35 bg-primary/[0.07]",
      )}
    >
      <CardContent className="px-5">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <Icon
            className={cn(
              "size-[18px] text-muted-foreground",
              accent && "text-primary",
            )}
          />
        </div>
        <p
          className={cn(
            "text-[29px] leading-none font-semibold tracking-tight tabular-nums xl:text-[32px]",
            accent && "text-primary",
          )}
        >
          {value}
        </p>
        <p className="mt-3 text-[11px] text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

export function StockBadge({ product }: { product: DemoProduct }) {
  if (product.stock === 0)
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-rose-400/20 bg-rose-400/5 text-rose-300"
      >
        <span className="size-1 rounded-full bg-rose-300" />
        Sin stock
      </Badge>
    );
  if (product.stock <= product.minimum)
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-amber-300/20 bg-amber-300/5 text-amber-200"
      >
        <span className="size-1 rounded-full bg-amber-200" />
        Stock bajo
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-primary/15 bg-primary/5 text-primary"
    >
      <span className="size-1 rounded-full bg-primary" />
      Disponible
    </Badge>
  );
}
