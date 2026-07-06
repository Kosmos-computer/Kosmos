import { SidebarPane } from "../../components/patterns";
import { GeneratorCatalog, GeneratorWorkspace } from "./GeneratorPanels";
import { useGenerator } from "./useGenerator";

export function GeneratorApp() {
  const generator = useGenerator();

  return (
    <div className="arco-generator">
      <SidebarPane width={generator.sidebarWidth} onWidthChange={generator.setSidebarWidth}>
        <GeneratorCatalog
          items={generator.catalog}
          searchQuery={generator.catalogSearch}
          activeId={generator.activeCatalogId}
          onSearchChange={generator.setCatalogSearch}
          onSelect={generator.selectCatalogItem}
        />
      </SidebarPane>
      <GeneratorWorkspace
        prompt={generator.prompt}
        generating={generator.generating}
        result={generator.result}
        previewTab={generator.previewTab}
        examples={generator.examples}
        error={generator.error}
        onPromptChange={generator.setPrompt}
        onGenerate={() => void generator.generate()}
        onExampleSelect={generator.setPrompt}
        onTabChange={generator.setPreviewTab}
        onSaveToCatalog={() => void generator.saveToCatalog()}
        onRefineInStudio={generator.refineInStudio}
      />
    </div>
  );
}
