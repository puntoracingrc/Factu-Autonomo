"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  FileText,
  Landmark,
  MailCheck,
  MonitorPlay,
  Receipt,
  ScanLine,
  ShieldCheck,
  UploadCloud,
  WalletCards,
} from "lucide-react";

const productPillars = [
  {
    title: "Facturas y documentos",
    description:
      "Abre una factura, rellena los datos del cliente y descarga el PDF. Si el cliente es nuevo, la app crea su ficha sola.",
    Icon: FileText,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    title: "Gastos y proveedores",
    description:
      "Registra compras, tickets, gastos fijos y proveedores. Con Pro puedes apoyarte en escaneo IA y buzón inteligente.",
    Icon: Receipt,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Impuestos orientativos",
    description:
      "Ten a mano IVA, IRPF y beneficio por periodo para llegar a tu gestor con los números más claros.",
    Icon: Landmark,
    tone: "bg-amber-50 text-amber-700",
  },
  {
    title: "Importación y copias",
    description:
      "Trae datos desde otros programas, guarda copias y conecta Drive si quieres sincronizar móvil y ordenador.",
    Icon: UploadCloud,
    tone: "bg-violet-50 text-violet-700",
  },
];

const firstSteps = [
  "Completa tus datos fiscales una vez.",
  "Abre una factura y escribe los datos del cliente.",
  "Guarda: el cliente queda creado automáticamente.",
  "Emite la factura y descarga el PDF.",
  "Registra gastos y revisa el resumen fiscal.",
];

const trustItems = [
  "Plan gratis sin tarjeta",
  "Cuenta con email verificado",
  "Datos locales y nube opcional",
  "Textos legales visibles antes de pagar",
];

function ProductBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-slate-50" />
      <div className="absolute right-[-18rem] top-10 hidden w-[52rem] rotate-[-2deg] rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-2xl shadow-slate-300/60 lg:block">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="h-3 w-36 rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-24 rounded-full bg-slate-100" />
          </div>
          <div className="h-10 w-32 rounded-2xl bg-blue-600" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-2xl bg-blue-600 p-4 text-white shadow-sm">
            <FileText className="h-6 w-6" />
            <div className="mt-5 h-3 w-24 rounded-full bg-white/85" />
          </div>
          <div className="rounded-2xl bg-emerald-600 p-4 text-white shadow-sm">
            <Receipt className="h-6 w-6" />
            <div className="mt-5 h-3 w-20 rounded-full bg-white/85" />
          </div>
          <div className="rounded-2xl bg-amber-500 p-4 text-white shadow-sm">
            <BarChart3 className="h-6 w-6" />
            <div className="mt-5 h-3 w-24 rounded-full bg-white/85" />
          </div>
          <div className="rounded-2xl bg-slate-800 p-4 text-white shadow-sm">
            <WalletCards className="h-6 w-6" />
            <div className="mt-5 h-3 w-20 rounded-full bg-white/85" />
          </div>
        </div>
        <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-44 rounded-full bg-slate-200" />
            <div className="h-3 w-28 rounded-full bg-slate-100" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between">
                <div className="h-3 w-24 rounded-full bg-blue-100" />
                <div className="h-3 w-20 rounded-full bg-slate-200" />
              </div>
              <div className="h-3 rounded-full bg-blue-600" />
            </div>
            <div>
              <div className="mb-2 flex justify-between">
                <div className="h-3 w-24 rounded-full bg-emerald-100" />
                <div className="h-3 w-20 rounded-full bg-slate-200" />
              </div>
              <div className="h-3 rounded-full bg-emerald-600" />
            </div>
            <div>
              <div className="mb-2 flex justify-between">
                <div className="h-3 w-24 rounded-full bg-amber-100" />
                <div className="h-3 w-20 rounded-full bg-slate-200" />
              </div>
              <div className="h-3 w-2/5 rounded-full bg-amber-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PublicLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/inicio" className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/app-icon.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-base font-black text-slate-950">
                Factura Autónomo
              </p>
              <p className="truncate text-xs font-medium text-slate-500">
                Tu negocio, simple y claro
              </p>
            </div>
          </Link>

          <nav
            aria-label="Navegación pública"
            className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex"
          >
            <a href="#producto" className="hover:text-slate-950">
              Producto
            </a>
            <Link href="/precios" className="hover:text-slate-950">
              Precios
            </Link>
            <Link href="/ayuda" className="hover:text-slate-950">
              Ayuda
            </Link>
            <Link href="/legal/privacidad" className="hover:text-slate-950">
              Legal
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/demo"
              className="hidden min-h-10 items-center justify-center rounded-2xl px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 md:inline-flex"
            >
              Ver demo
            </Link>
            <Link
              href="/cuenta#inicio-sesion"
              className="hidden min-h-10 items-center justify-center rounded-2xl px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:inline-flex"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/cuenta?modo=crear#inicio-sesion"
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Probar gratis
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-slate-200">
          <ProductBackdrop />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1 text-sm font-bold text-blue-700 shadow-sm">
                <BadgeCheck className="h-4 w-4" />
                Para autónomos y pequeños negocios
              </p>
              <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Facturación sencilla para autónomos
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
                Crea facturas, controla gastos y mira tus impuestos orientativos
                sin pelearte con hojas de cálculo.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/cuenta?modo=crear#inicio-sesion"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-base font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Probar gratis
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-blue-100 bg-white px-6 text-base font-bold text-blue-700 hover:bg-blue-50"
                >
                  <MonitorPlay className="h-5 w-5" />
                  Ver demo
                </Link>
                <Link
                  href="/precios"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-6 text-base font-bold text-slate-800 hover:bg-slate-50"
                >
                  Ver precios
                </Link>
              </div>

              <p className="mt-5 flex max-w-xl items-start gap-2 text-sm font-medium text-slate-600">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                El plan gratis empieza con cuenta verificada, sin tarjeta. Las
                funciones avanzadas de IA y nube tienen límites para evitar abuso.
              </p>
            </div>
          </div>
        </section>

        <section id="producto" className="bg-white px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-wide text-blue-700">
                Qué puedes hacer
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                Lo básico de un autónomo, en un solo sitio
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {productPillars.map(({ title, description, Icon, tone }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-black text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
                Primeros minutos
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                De cero a primera factura sin perder contexto
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                La app está pensada para trabajar rápido: no tienes que crear
                una ficha de cliente antes. Empieza el documento, rellena los
                datos y Factura Autónomo guarda lo necesario.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {firstSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex min-h-24 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-bold leading-6 text-slate-800">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-sky-200">
                  <ScanLine className="h-4 w-4" />
                  Pro+ IA
                </p>
                <h2 className="mt-3 text-3xl font-black">
                  Cuando crezcas, la IA te quita trabajo repetitivo
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  Escanea gastos, lee líneas de facturas de proveedor y prepara
                  productos con revisión previa. Tú decides qué se guarda.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Escaneos IA con límites por plan",
                  "Buzón inteligente de gastos",
                  "Productos desde facturas de proveedor",
                  "Margen por línea y por documento",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    <p className="text-sm font-bold leading-6 text-slate-100">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm font-bold text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <h2 className="text-3xl font-black text-slate-950">
              Empieza gratis y emite tu primera factura cuando tengas la cuenta
              lista
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Sin tarjeta para probar. Si necesitas documentos ilimitados, nube,
              importación avanzada o IA, puedes pasar a Pro cuando tenga sentido.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cuenta?modo=crear#inicio-sesion"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-base font-bold text-white shadow-sm hover:bg-blue-700"
              >
                Crear cuenta gratis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-blue-100 bg-white px-6 text-base font-bold text-blue-700 hover:bg-blue-50"
              >
                <MonitorPlay className="h-5 w-5" />
                Ver demo
              </Link>
              <Link
                href="/ayuda/inicio"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-6 text-base font-bold text-slate-800 hover:bg-slate-50"
              >
                Ver cómo funciona
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Factura Autónomo · Facturación clara para autónomos.</p>
          <div className="flex flex-wrap gap-4 font-semibold">
            <Link href="/legal/aviso-legal" className="hover:text-slate-900">
              Aviso legal
            </Link>
            <Link href="/legal/privacidad" className="hover:text-slate-900">
              Privacidad
            </Link>
            <Link href="/legal/terminos" className="hover:text-slate-900">
              Términos
            </Link>
            <Link href="/precios" className="hover:text-slate-900">
              Precios
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
