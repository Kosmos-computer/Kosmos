import { SidebarPane } from "../../components/patterns";
import { GeneratorCatalog, GeneratorWorkspace } from "./GeneratorPanels";
import { useGeneratorStub } from "./useGeneratorStub";

export function GeneratorApp() {
  const generator = useGeneratorStub();

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
        onPromptChange={generator.setPrompt}
        onGenerate={generator.generate}
        onExampleSelect={generator.setPrompt}
        onTabChange={generator.setPreviewTab}
      />
    </div>
  );
}
