"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  Bus,
  ChevronRight,
  Clock,
  Facebook,
  Github,
  Heart,
  Instagram,
  LayoutGrid,
  LogOut,
  Map as MapIcon,
  Menu,
  Phone,
  MapPin,
  Rocket,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Twitter,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoLockup } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/brand/theme-switcher";
import { MagneticWrap } from "@/components/motion/magnetic-wrap";
import { TiltCard } from "@/components/motion/tilt-card";
import { GradientText } from "@/components/common/gradient-text";
import { InteractiveJourneySteps } from "@/components/common/interactive-journey-steps";
import { FooterLinkSheet, type FooterPage } from "@/components/common/footer-link-sheet";
import { NotificationsBell } from "@/components/common/notifications-bell";
import { LocationPermissionModal } from "@/components/common/location-permission-modal";
import { TripsExplorer } from "@/components/trips/trips-explorer";
import type { TripCardData } from "@/components/trips/trip-card";
import { BookingSheet } from "@/components/trips/booking-sheet";
import { AdminPanel } from "@/components/admin/admin-panel";
import { DriverMode } from "@/components/driver/driver-mode";
import { EmptyState } from "@/components/common/empty-state";
import { RealMapView } from "@/components/map/real-map-view";
import { SignInSheet } from "@/components/auth/sign-in-sheet";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_DESCRIPTION,
  COUNTRY,
  PILOT_CAMPUS,
  PILOT_REGION,
  formatGHS,
} from "@/lib/config/app";
import { apiClient } from "@/lib/api/client";
import { GHANA_REGIONS, ROUTE_SEEDS } from "@/lib/config/ghana";
void GHANA_REGIONS;

type ViewKey = "home" | "explore" | "map" | "admin" | "drive";

const NAV: Array<{ id: ViewKey; label: string; icon: React.ReactNode }> = [
  { id: "home", label: "Home", icon: <Sparkles className="h-4 w-4" /> },
  { id: "explore", label: "Explore", icon: <Search className="h-4 w-4" /> },
  { id: "map", label: "Live Map", icon: <MapIcon className="h-4 w-4" /> },
  { id: "drive", label: "Drive", icon: <Bus className="h-4 w-4" /> },
  { id: "admin", label: "Admin", icon: <LayoutGrid className="h-4 w-4" /> },
];

const FEATURE_LINKS: Array<{ id: FooterPage; label: string }> = [
  { id: "find-a-trip", label: "Find a trip" },
  { id: "how-it-works", label: "How it works" },
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
];

const COMPANY_LINKS: Array<{ id: FooterPage; label: string }> = [
  { id: "about", label: "About" },
  { id: "careers", label: "Careers" },
  { id: "press", label: "Press" },
  { id: "contact", label: "Contact" },
];

const LEGAL_LINKS: Array<{ id: FooterPage; label: string }> = [
  { id: "privacy", label: "Privacy" },
  { id: "terms", label: "Terms" },
  { id: "data-protection", label: "Data Protection" },
  { id: "refund", label: "Refunds" },
];

const POPULAR_CORRIDORS = [
  "Cape Coast → Accra",
  "Accra → Kumasi",
  "Kumasi → Tamale",
  "Cape Coast → Takoradi",
  "Accra → Ho",
  "Kumasi → Sunyani",
];

export default function Home() {
  const [view, setView] = useState<ViewKey>("home");
  const [user, setUser] = useState<any>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [bookingTrip, setBookingTrip] = useState<TripCardData | null>(null);
  const [footerPage, setFooterPage] = useState<FooterPage | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const queryClient = useQueryClient();
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);

  const tripsQ = useQuery({
    queryKey: ["trips", "page-feed"],
    queryFn: () => apiClient.trips.search({ page: 1, pageSize: 24 }),
  });
  const tripDetailQ = useQuery({
    queryKey: ["trip", bookingTrip?.id],
    queryFn: () => apiClient.trips.detail(bookingTrip!.id),
    enabled: !!bookingTrip,
  });

  const trips: TripCardData[] = (tripsQ.data?.items ?? []).map((t: any) => ({
    id: t.id,
    departureAt: t.departureAt,
    arrivalAt: t.arrivalAt,
    status: t.status,
    basePricePesewa: t.basePricePesewa,
    seatsAvailable: t.seatsAvailable,
    originName: t.originName,
    originRegion: t.originRegion,
    destName: t.destName,
    destRegion: t.destRegion,
    durationMin: t.durationMin,
    distanceKm: t.distanceKm,
    busPlateNumber: t.busPlateNumber,
    operatorName: t.operatorName,
    operatorId: t.operatorId,
  }));

  const allTrips = tripsQ.data?.items ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header
        view={view}
        setView={(v) => {
          setView(v);
          setMobileNav(false);
        }}
        user={user}
        onSignIn={() => setSignInOpen(true)}
        onSignOut={() => {
          apiClient.auth.logout().catch(() => undefined);
          setUser(null);
        }}
        mobileNavOpen={mobileNav}
        onToggleMobile={() => setMobileNav((v) => !v)}
      />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Hero
                onExplore={() => setView("explore")}
                onOpenMap={() => setView("map")}
                tripsCount={allTrips.length}
              />
              <Stats />
              <TripsSection
                trips={trips}
                onSelectTrip={(t) => setBookingTrip(t)}
                onSeeAll={() => setView("explore")}
                loading={tripsQ.isLoading}
              />
              <HowItWorks />
              <Features />
              <Roles />
              <ThemeShowcase />
            </motion.div>
          )}
          {view === "explore" && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mx-auto w-full max-w-6xl px-4 py-10"
            >
              <ExploreView
                trips={trips}
                onSelectTrip={(t) => setBookingTrip(t)}
                loading={tripsQ.isLoading}
              />
            </motion.div>
          )}
          {view === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mx-auto w-full max-w-6xl px-4 py-10"
            >
              <RealMapView
                user={user}
                trips={allTrips}
                tripDetail={tripDetailQ.data}
                onSelectTrip={(id) => {
                  const t = allTrips.find((x: any) => x.id === id);
                  if (t) setBookingTrip(t as any);
                }}
              />
            </motion.div>
          )}
          {view === "drive" && (
            <motion.div
              key="drive"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {user ? (
                <DriverMode user={user} />
              ) : (
                <div className="mx-auto max-w-md px-4 py-16">
                  <EmptyState
                    title="Sign in to drive"
                    description="Drivers sign in to broadcast their live GPS as the bus position for students."
                    action={
                      <Button onClick={() => setSignInOpen(true)} className="bg-grad-primary text-white">
                        Sign in
                      </Button>
                    }
                  />
                </div>
              )}
            </motion.div>
          )}
          {view === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mx-auto w-full max-w-6xl px-4 py-10"
            >
              <AdminPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer onOpenPage={(p) => setFooterPage(p)} />

      <SignInSheet
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={(u) => {
          setUser(u);
          // invalidate notifications so the bell picks up the new sign-in notification
          setTimeout(() => {
            queryClient?.invalidateQueries({ queryKey: ["notifications"] });
          }, 600);
          toast.success("Signed in successfully", {
            description: "Now let's enable your location for live tracking.",
          });
          // auto-pop the location permission prompt after sign-in
          setTimeout(() => setLocationPromptOpen(true), 800);
        }}
      />

      {/* Location permission prompt — auto-pops after sign-in */}
      <LocationPermissionModal
        open={locationPromptOpen}
        onClose={() => setLocationPromptOpen(false)}
        onGranted={() => {
          // switch to the Live Map so the user sees their position immediately
          setView("map");
        }}
      />

      <BookingSheet
        trip={bookingTrip}
        open={!!bookingTrip}
        onClose={() => setBookingTrip(null)}
        userId={user?.id}
      />

      <FooterLinkSheet
        page={footerPage}
        open={!!footerPage}
        onClose={() => setFooterPage(null)}
      />
    </div>
  );
}

function Header({
  view,
  setView,
  user,
  onSignIn,
  onSignOut,
  mobileNavOpen,
  onToggleMobile,
}: {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  user: any;
  onSignIn: () => void;
  onSignOut: () => void;
  mobileNavOpen: boolean;
  onToggleMobile: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <button
          onClick={() => setView("home")}
          className="flex items-center gap-2"
          aria-label={APP_NAME}
        >
          <LogoLockup height={32} gradientText />
        </button>

        <nav className="hidden md:block">
          <div className="relative inline-flex rounded-full border border-border bg-card p-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  view === n.id
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {view === n.id && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-grad-primary"
                    transition={{ type: "spring", stiffness: 280, damping: 28 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {n.icon}
                  {n.label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeSwitcher className="hidden sm:flex" />
          {user ? (
            <>
              <NotificationsBell userId={user.id} />
              <span className="hidden text-sm text-muted-foreground sm:block">
                Hi, {user.name?.split(" ")[0] ?? "there"}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={onSignOut}
              >
                <LogOut className="mr-1 h-3.5 w-3.5" />
                Sign out
              </Button>
            </>
          ) : (
            <MagneticWrap>
              <Button
                onClick={onSignIn}
                className="rounded-full bg-grad-primary"
                size="sm"
              >
                Sign in
              </Button>
            </MagneticWrap>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleMobile}
            aria-label="Menu"
          >
            {mobileNavOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {mobileNavOpen && (
        <div className="border-t border-border px-4 py-3 md:hidden">
          <div className="grid gap-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  view === n.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground",
                )}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <ThemeSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({
  onExplore,
  onOpenMap,
  tripsCount,
}: {
  onExplore: () => void;
  onOpenMap: () => void;
  tripsCount: number;
}) {
  const [origin, setOrigin] = useState("Cape Coast");
  const [dest, setDest] = useState("Accra");
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-grad-hero opacity-10" />
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col justify-center gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Rocket className="h-3 w-3" />
            Now piloting at {PILOT_CAMPUS}
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Get on board.
            <br />
            <GradientText variant="primary">Know you arrived.</GradientText>
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            {APP_DESCRIPTION} Book a seat in seconds, watch your bus roll in,
            and arrive safe — every trip, every time.
          </p>
          <div className="flex flex-wrap gap-3">
            <MagneticWrap>
              <Button
                onClick={onExplore}
                size="lg"
                className="rounded-full bg-grad-primary"
              >
                <Search className="mr-1 h-4 w-4" />
                Find a trip
              </Button>
            </MagneticWrap>
            <MagneticWrap strength={0.3}>
              <Button
                onClick={onOpenMap}
                variant="outline"
                size="lg"
                className="rounded-full"
              >
                <MapIcon className="mr-1 h-4 w-4" />
                Live map
              </Button>
            </MagneticWrap>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Bus className="h-3.5 w-3.5 text-primary" />
              {tripsCount} live trips
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Verified students only
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {PILOT_REGION} region
            </span>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <PhoneMockup
            origin={origin}
            setOrigin={setOrigin}
            dest={dest}
            setDest={setDest}
            onExplore={onExplore}
          />
        </div>
      </div>
    </section>
  );
}

function PhoneMockup({
  origin,
  setOrigin,
  dest,
  setDest,
  onExplore,
}: {
  origin: string;
  setOrigin: (v: string) => void;
  dest: string;
  setDest: (v: string) => void;
  onExplore: () => void;
}) {
  const cities = Array.from(
    new Set(ROUTE_SEEDS.flatMap((r) => [r.originName, r.destName])),
  ).sort();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      className="relative w-full max-w-xs"
    >
      <div className="rounded-[2.5rem] border-[6px] border-belt bg-belt p-2 shadow-glow">
        <div className="overflow-hidden rounded-[2rem] bg-background">
          <div className="bg-grad-primary px-4 pt-4 pb-3 text-primary-foreground">
            <div className="mb-2 flex items-center justify-between text-[10px] opacity-90">
              <span>{APP_NAME}</span>
              <span>9:41</span>
            </div>
            <div className="text-lg font-semibold">Where to today?</div>
          </div>
          <div className="space-y-2 p-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="rounded-lg border border-border bg-card px-2 py-2 text-xs"
              >
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                className="rounded-lg border border-border bg-card px-2 py-2 text-xs"
              >
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Today</span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                  4 seats left
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold">{origin}</div>
                  <div className="text-[10px] text-muted-foreground">
                    06:00
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="text-right">
                  <div className="font-semibold">{dest}</div>
                  <div className="text-[10px] text-muted-foreground">
                    08:45
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="text-[10px] text-muted-foreground">
                  2h 45m · 145 km
                </span>
                <span className="text-sm font-semibold text-grad-primary">
                  {formatGHS(4500)}
                </span>
              </div>
            </div>
            <Button
              onClick={onExplore}
              className="w-full rounded-full bg-grad-primary text-[11px]"
              size="sm"
            >
              <Ticket className="mr-1 h-3 w-3" />
              Book seat
            </Button>
            <div className="rounded-xl border border-border bg-muted/40 p-2 text-[10px] text-muted-foreground">
              <div className="mb-1 flex items-center justify-between">
                <span>Driver en route</span>
                <span className="flex items-center gap-1 text-primary">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                    style={{ animation: "aboard-pulse-ring 1.6s ease-out infinite" }}
                  />
                  Live
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-3/5 bg-grad-primary" />
              </div>
              <div className="mt-1 flex justify-between text-[9px]">
                <span>Boarding</span>
                <span>2 min away</span>
                <span>Arrived</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Stats() {
  const stats = [
    { label: "Routes", value: "10+", icon: <RouteIcon className="h-4 w-4" /> },
    { label: "Students served", value: "12k+", icon: <Users className="h-4 w-4" /> },
    { label: "Avg. delay", value: "<4 min", icon: <Clock className="h-4 w-4" /> },
    { label: "Trips / day", value: "30+", icon: <Bus className="h-4 w-4" /> },
  ];
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {s.icon}
            </span>
            <div>
              <div className="font-display text-xl font-bold">{s.value}</div>
              <div className="text-[11px] text-muted-foreground">
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TripsSection({
  trips,
  onSelectTrip,
  onSeeAll,
  loading,
}: {
  trips: TripCardData[];
  onSelectTrip: (t: TripCardData) => void;
  onSeeAll: () => void;
  loading: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            <GradientText variant="primary">Departing soon</GradientText>
          </h2>
          <p className="text-sm text-muted-foreground">
            Real seat availability, held for you for 5 minutes.
          </p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={onSeeAll}>
          See all
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.slice(0, 6).map((t) => (
            <TripCardMini key={t.id} trip={t} onSelect={onSelectTrip} />
          ))}
        </div>
      )}
    </section>
  );
}

function TripCardMini({
  trip,
  onSelect,
}: {
  trip: TripCardData;
  onSelect: (t: TripCardData) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-grad-primary" />
      <div className="flex items-center justify-between pl-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {trip.originName}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <MapPin className="h-3.5 w-3.5 text-red-500" />
          {trip.destName}
        </div>
      </div>
      <div className="pl-3 text-[11px] text-muted-foreground">
        {new Date(trip.departureAt).toLocaleString("en-GH", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        · {trip.operatorName}
      </div>
      <div className="flex items-end justify-between pl-3">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">
            From
          </div>
          <div className="font-display text-lg font-bold text-grad-primary">
            {formatGHS(trip.basePricePesewa)}
          </div>
        </div>
        <Button
          size="sm"
          className="rounded-full bg-grad-primary"
          onClick={() => onSelect(trip)}
        >
          View seats
        </Button>
      </div>
    </motion.div>
  );
}

function HowItWorks() {
  return (
    <section className="bg-grad-belt py-16 text-belt-foreground">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-10 text-center">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium">
            How it works
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold">
            From search to arrival in 3 taps.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
            No standing at lorry stations. No "the bus is coming" for an hour.
            Just a seat, an e-ticket, and live GPS.
          </p>
        </div>
        <InteractiveJourneySteps />
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: <Ticket className="h-5 w-5" />,
      title: "Live seat maps",
      body: "5-minute holds. No overbooking. No double-selling. The seat you tap is yours.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Verified students",
      body: "Only verified students at your institution can book — so fares stay student-only.",
    },
    {
      icon: <MapIcon className="h-5 w-5" />,
      title: "Real-time GPS",
      body: "Watch your bus roll in on a live map. Get notified when it's 2 minutes away.",
    },
    {
      icon: <Activity className="h-5 w-5" />,
      title: "Offline-first tickets",
      body: "Drivers scan QR codes offline. Your ticket works even with no signal.",
    },
    {
      icon: <Heart className="h-5 w-5" />,
      title: "Parent-paid trips",
      body: "Parents can pay for and track your ride — with your explicit consent.",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Honest pricing",
      body: "Fares in pesewa. No hidden fees. Refunds in 3–5 days, fair policy.",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mb-10 text-center">
        <span className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          Features
        </span>
        <h2 className="mt-3 font-display text-3xl font-bold">
          Built for student life in Ghana.
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <TiltCard key={f.title} className="rounded-2xl">
            <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-grad-primary text-primary-foreground">
                {f.icon}
              </span>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          </TiltCard>
        ))}
      </div>
    </section>
  );
}

function Roles() {
  const roles = [
    {
      icon: <Users className="h-5 w-5" />,
      title: "Students",
      body: "Book seats, track buses, ride safe.",
      tone: "primary",
    },
    {
      icon: <Bus className="h-5 w-5" />,
      title: "Drivers",
      body: "Scan tickets, log trips, get rated.",
      tone: "accent",
    },
    {
      icon: <RouteIcon className="h-5 w-5" />,
      title: "Operators",
      body: "Manage routes, buses, schedules, payouts.",
      tone: "primary",
    },
    {
      icon: <Heart className="h-5 w-5" />,
      title: "Parents",
      body: "Pay for rides, track arrivals, give consent.",
      tone: "accent",
    },
  ];
  return (
    <section className="border-y border-border bg-card/40 py-16">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold">For every role</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            One app, four roles. Each with its own powers.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {r.icon}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold">
                {r.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThemeShowcase() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mb-8 text-center">
        <h2 className="font-display text-3xl font-bold">Three themes.</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pick the one that matches your ride. Black is the structural belt that
          holds it all together.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ThemeCard id="emerald" label="Emerald" sub="Default — Ghana green" swatches={["#047857", "#10b981", "#f59e0b"]} />
        <ThemeCard id="sunset" label="Sunset" sub="Warm savanna sunsets" swatches={["#ea580c", "#f59e0b", "#10b981"]} />
        <ThemeCard id="midnight" label="Midnight" sub="Dark-first, cool teal" swatches={["#14b8a6", "#0f766e", "#fbbf24"]} />
      </div>
      <div className="mt-6 flex justify-center">
        <ThemeSwitcherInline />
      </div>
    </section>
  );
}

function ThemeCard({
  id,
  label,
  sub,
  swatches,
}: {
  id: string;
  label: string;
  sub: string;
  swatches: string[];
}) {
  return (
    <button
      type="button"
      data-theme-card={id}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:border-primary/40"
    >
      <div className="flex -space-x-1">
        {swatches.map((c, i) => (
          <span
            key={i}
            className="h-8 w-8 rounded-full ring-2 ring-background"
            style={{ background: c }}
          />
        ))}
      </div>
      <div>
        <div className="font-display font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </button>
  );
}

function ThemeSwitcherInline() {
  return <ThemeSwitcher />;
}

function ExploreView({
  trips,
  onSelectTrip,
  loading,
}: {
  trips: TripCardData[];
  onSelectTrip: (t: TripCardData) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">
          <GradientText variant="primary">Explore trips</GradientText>
        </h1>
        <p className="text-sm text-muted-foreground">
          {trips.length} trips across 10 routes in {COUNTRY}.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by city or region…"
            className="rounded-full pl-9"
          />
        </div>
      </div>
      <TripsExplorer
        trips={trips}
        onSelectTrip={onSelectTrip}
        onSelectRoute={(_r, _d) => undefined}
      />
    </div>
  );
}

function Footer({ onOpenPage }: { onOpenPage: (p: FooterPage) => void }) {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-5">
        <div className="md:col-span-2">
          <LogoLockup height={32} gradientText />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {APP_DESCRIPTION} {APP_TAGLINE}
          </p>
          <div className="mt-4 flex items-center gap-3 text-muted-foreground">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter"
              className="transition-colors hover:text-primary"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="transition-colors hover:text-primary"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="transition-colors hover:text-primary"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="transition-colors hover:text-primary"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
        <FooterColumn title="Features" links={FEATURE_LINKS} onOpen={onOpenPage} />
        <FooterColumn title="Company" links={COMPANY_LINKS} onOpen={onOpenPage} />
        <FooterColumn title="Legal" links={LEGAL_LINKS} onOpen={onOpenPage} />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} {APP_NAME}. Made with{" "}
            <Heart className="inline-block h-3 w-3 text-red-500" /> in {COUNTRY}.
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span>Popular corridors:</span>
            {POPULAR_CORRIDORS.slice(0, 3).map((c) => (
              <span key={c} className="text-foreground">
                {c}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> +233 30 000 0000
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  onOpen,
}: {
  title: string;
  links: Array<{ id: FooterPage; label: string }>;
  onOpen: (p: FooterPage) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 font-display text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.id}>
            <button
              onClick={() => onOpen(l.id)}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
