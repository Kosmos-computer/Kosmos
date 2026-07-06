import { arcoDocsUrl, demoUrl } from "./content/site-content";
import { SiteHeader } from "./components/SiteHeader";
import { SpecHero } from "./components/spec/SpecHero";
import { FoundationSection } from "./components/spec/FoundationSection";
import { DecisionsSection } from "./components/spec/DecisionsSection";
import { SpecArchitectureSection } from "./components/spec/SpecArchitectureSection";
import { RoadmapSection } from "./components/spec/RoadmapSection";
import { AdoptionSection } from "./components/spec/AdoptionSection";
import { ProductSection } from "./components/spec/ProductSection";
import { AppendixSection } from "./components/spec/AppendixSection";
import { CTASection, SiteFooter } from "./components/CTASection";
import { specNavLinks } from "./content/spec-content";

export default function SpecPage() {
  return (
    <div>
      <SiteHeader links={specNavLinks} homeHref="/" />
      <main>
        <SpecHero />
        <FoundationSection />
        <DecisionsSection />
        <SpecArchitectureSection />
        <RoadmapSection />
        <AdoptionSection />
        <ProductSection />
        <AppendixSection />
        <CTASection
          title="One registry away from generative apps"
          body="The full spec lives in docs/open-standards-map.md and the Arco docs site. Start with the registry prototype — everything else on the roadmap builds on it."
          journey={false}
          actions={[
            { label: "Back to Kosmos", href: "/", variant: "primary" },
            { label: "Arco docs", href: arcoDocsUrl, variant: "secondary" },
            { label: "Launch Kosmos demo", href: demoUrl, variant: "secondary" },
          ]}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
