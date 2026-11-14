"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PRIVACY_LAW, REFUND_POLICY, formatGHS } from "@/lib/config/app";
import { Mail, Phone, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type FooterPage =
  | "find-a-trip"
  | "how-it-works"
  | "features"
  | "pricing"
  | "about"
  | "careers"
  | "press"
  | "contact"
  | "privacy"
  | "terms"
  | "data-protection"
  | "refund";

interface PageInfo {
  title: string;
  subtitle?: string;
}

const PAGES: Record<FooterPage, PageInfo> = {
  "find-a-trip": { title: "Find a trip", subtitle: "Search inter-city routes" },
  "how-it-works": { title: "How Aboard works", subtitle: "Booking in 3 steps" },
  features: { title: "Features", subtitle: "What you get with Aboard" },
  pricing: { title: "Pricing", subtitle: "Transparent pesewa-based fares" },
  about: { title: "About Aboard", subtitle: "Our mission" },
  careers: { title: "Careers", subtitle: "Join the crew" },
  press: { title: "Press", subtitle: "Aboard in the news" },
  contact: { title: "Contact", subtitle: "Get in touch" },
  privacy: { title: "Privacy Policy", subtitle: PRIVACY_LAW },
  terms: { title: "Terms of Service", subtitle: "The fine print" },
  "data-protection": {
    title: "Data Protection",
    subtitle: PRIVACY_LAW,
  },
  refund: { title: "Refund Policy", subtitle: "Fair, transparent refunds" },
};

export function FooterLinkSheet({
  page,
  open,
  onClose,
}: {
  page: FooterPage | null;
  open: boolean;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const info = page ? PAGES[page] : null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="font-display text-xl font-bold">
          {info?.title}
        </DialogTitle>
        {info?.subtitle && (
          <p className="text-sm text-muted-foreground">{info.subtitle}</p>
        )}
        <AnimatePresence mode="wait">
          {page && (
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="prose prose-sm max-w-none dark:prose-invert"
            >
              <FooterPageBody
                page={page}
                sent={sent}
                onSent={() => {
                  setSent(true);
                  toast.success("Message sent — we'll reply within 24h.");
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function FooterPageBody({
  page,
  sent,
  onSent,
}: {
  page: FooterPage;
  sent: boolean;
  onSent: () => void;
}) {
  switch (page) {
    case "find-a-trip":
      return (
        <div className="space-y-3 text-sm">
          <p>
            Use the <strong>Explore</strong> tab to search live trips between
            Ghanaian cities. Filter by date, time of day, price, and minimum
            available seats.
          </p>
          <p>
            Popular corridors: <em>Cape Coast ↔ Accra</em>,{" "}
            <em>Kumasi ↔ Tamale</em>, <em>Accra ↔ Takoradi</em>.
          </p>
          <p>Tip: Seats in the front row are +GH₵5 and have more leg room.</p>
        </div>
      );
    case "how-it-works":
      return (
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>
            <strong>Search</strong> by origin and destination.
          </li>
          <li>
            <strong>Pick a seat</strong> from the live seat map (held for 5
            minutes).
          </li>
          <li>
            <strong>Pay</strong> with mobile money or card.
          </li>
          <li>
            <strong>Receive</strong> an e-ticket with a signed QR code.
          </li>
          <li>
            <strong>Track</strong> your bus live and arrive safely.
          </li>
        </ol>
      );
    case "features":
      return (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Live seat maps with 5-minute holds.</li>
          <li>Idempotent payments (safe retries).</li>
          <li>Real-time GPS tracking via Socket.IO.</li>
          <li>Offline-first ticket scanning for drivers.</li>
          <li>Parent-paid trips &amp; consent links.</li>
          <li>Verified student-only fares.</li>
        </ul>
      );
    case "pricing":
      return (
        <div className="space-y-2 text-sm">
          <p>
            Fares are set per-route in pesewa (1 GHS = 100 pesewa). The front
            two rows carry a +GH₵5 premium. No hidden fees — what you see is
            what you pay.
          </p>
          <p>
            Sample fare: Cape Coast → Accra from{" "}
            <strong>{formatGHS(4500)}</strong>.
          </p>
        </div>
      );
    case "about":
      return (
        <div className="space-y-2 text-sm">
          <p>
            Aboard is a student-first inter-city bus booking &amp; live
            tracking platform built for Ghana. Our pilot launches at the
            University of Cape Coast.
          </p>
          <p>
            We exist so students can book a seat, board with confidence, and
            know they arrived safely — no more standing at lorry stations at
            4am.
          </p>
        </div>
      );
    case "careers":
      return (
        <div className="space-y-2 text-sm">
          <p>
            We're hiring across engineering, operations, and driver
            partnerships. Email{" "}
            <a href="mailto:careers@aboard.gh" className="text-primary underline">
              careers@aboard.gh
            </a>{" "}
            with your CV.
          </p>
          <p>Open roles: Senior Backend Engineer, Driver Onboarding Lead, Customer Support (Cape Coast).</p>
        </div>
      );
    case "press":
      return (
        <div className="space-y-2 text-sm">
          <p>For press inquiries, email press@aboard.gh.</p>
          <p>Brand assets and logos are available on request.</p>
        </div>
      );
    case "contact":
      return sent ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            Thanks — your message is on its way.
          </p>
          <p className="mt-1 text-muted-foreground">
            We reply within 24 hours.
          </p>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSent();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="cn-name">Name</Label>
              <Input id="cn-name" required placeholder="Ama Mensah" />
            </div>
            <div>
              <Label htmlFor="cn-phone">Phone</Label>
              <Input id="cn-phone" required placeholder="+233 24 000 0001" />
            </div>
          </div>
          <div>
            <Label htmlFor="cn-email">Email</Label>
            <Input id="cn-email" type="email" placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="cn-msg">Message</Label>
            <Textarea id="cn-msg" rows={4} required />
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Send message
          </Button>
          <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <Phone className="h-3 w-3" /> +233 30 000 0000
            </span>
            <span className="flex items-center gap-2">
              <Mail className="h-3 w-3" /> hello@aboard.gh
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-3 w-3" /> Cape Coast, Central Region
            </span>
          </div>
        </form>
      );
    case "privacy":
      return (
        <div className="space-y-2 text-sm">
          <p>
            We collect only the data needed to operate the service: your name,
            phone, institution, and student ID number (for verified student
            fares). Location data is collected only while a trip you booked is
            active, and is deleted within{" "}
            <strong>7 days</strong> of trip completion.
          </p>
          <p>
            We comply with the <em>{PRIVACY_LAW}</em>. You may request data
            export or deletion by emailing privacy@aboard.gh.
          </p>
        </div>
      );
    case "terms":
      return (
        <div className="space-y-2 text-sm">
          <p>
            By using Aboard, you agree to travel safely, present a valid ticket
            to the driver, and not resell tickets. Tickets are non-transferable
            except via the in-app transfer feature.
          </p>
          <p>
            Aboard acts as an intermediary between students and operators. We
            are not a common carrier.
          </p>
        </div>
      );
    case "data-protection":
      return (
        <div className="space-y-2 text-sm">
          <p>
            Under the {PRIVACY_LAW}, you have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access your personal data.</li>
            <li>Rectify inaccurate data.</li>
            <li>Request deletion ("right to be forgotten").</li>
            <li>Object to processing for direct marketing.</li>
            <li>Lodge a complaint with the Data Protection Commission.</li>
          </ul>
        </div>
      );
    case "refund":
      return (
        <div className="space-y-3 text-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3">Cancel before</th>
                <th className="py-2 pr-3">Refund</th>
                <th className="py-2">Example (GH₵45)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-2 pr-3">&gt; 2 hours before departure</td>
                <td className="py-2 pr-3">100% (full)</td>
                <td className="py-2">{formatGHS(4500 * REFUND_POLICY.FULL_FRACTION)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">30 min – 2h before</td>
                <td className="py-2 pr-3">50% (partial)</td>
                <td className="py-2">{formatGHS(4500 * REFUND_POLICY.PARTIAL_FRACTION)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">&lt; 30 min before</td>
                <td className="py-2 pr-3">0% (none)</td>
                <td className="py-2">{formatGHS(0)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Operator cancels</td>
                <td className="py-2 pr-3">100% (full) + apology</td>
                <td className="py-2">{formatGHS(4500 * REFUND_POLICY.OPERATOR_CANCEL_FRACTION)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Refunds are processed to the original payment method within 3–5
            business days.
          </p>
        </div>
      );
    default:
      return null;
  }
}

// Keep the X import for content tree-shaking sanity
export const _icons = { X };
