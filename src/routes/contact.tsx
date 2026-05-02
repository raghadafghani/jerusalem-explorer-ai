import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Compass, Mail, Phone, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { LangSwitcher } from "@/components/LangSwitcher";
import { Button } from "@/components/ui/button";
import { LANGS, LANG_STORAGE_KEY, type Lang, isLang, t } from "@/lib/i18n";

const CONTACTS = [
  { name: "Hadeel Abdellatif", email: "hadeel.abdellatif2001@gmail.com", phone: "+972 584933933" },
  { name: "Raghad Afaghany", email: "raghadafghani2001@gmail.com", phone: "+972 527720461" },
  { name: "Asma'a Abdellatif", email: "asmaa.younes.abdellatif@gmail.com", phone: "+972 585933911" },
];

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

function ContactPage() {
  const [lang, setLang] = useState<Lang>("en");
  const dir = LANGS.find((l) => l.code === lang)!.dir;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLang = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(storedLang)) {
      setLang(storedLang);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", lang);
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    }
  }, [dir, lang]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-glow">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-tight">{t(lang, "brand")}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t(lang, "tagline")}</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-2 rounded-full border-border/60 bg-surface/80 backdrop-blur">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">{t(lang, "home")}</span>
              </Link>
            </Button>
            <LangSwitcher lang={lang} onChange={setLang} />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="gradient-hero">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {t(lang, "contact_badge")}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">{t(lang, "contact_title")}</h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t(lang, "contact_intro")}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="grid gap-5 md:grid-cols-3">
            {CONTACTS.map((contact) => (
              <article key={contact.name} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">{contact.name}</h2>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <ContactDetail
                    href={`mailto:${contact.email}`}
                    icon={<Mail className="h-4 w-4" aria-hidden="true" />}
                    value={contact.email}
                  />
                  <ContactDetail
                    href={`tel:${contact.phone.replace(/[\s-]/g, "")}`}
                    icon={<Phone className="h-4 w-4" aria-hidden="true" />}
                    value={contact.phone}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-surface/85 backdrop-blur-sm" aria-label="Site footer">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-5 text-center text-sm text-muted-foreground sm:px-6 md:justify-between md:text-start">
          <div className="inline-flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-medium text-foreground">{t(lang, "brand")}</span>
          </div>
          <p>© {currentYear} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function ContactDetail({ href, icon, value }: { href: string; icon: React.ReactNode; value: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="text-primary">{icon}</span>
      <span>{value}</span>
    </a>
  );
}
