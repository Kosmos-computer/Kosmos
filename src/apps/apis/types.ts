export type ApiCatalogTab = "installed" | "marketplace";

export interface ApiIntegration {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  version?: string;
  rating?: number;
  installed: boolean;
  /** Lucide icon name consumed by appIcon(). */
  icon: string;
  docsUrl?: string;
}
