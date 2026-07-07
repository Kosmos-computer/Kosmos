import { ImageGenGallery, ImageGenLayout, ImageGenWorkspace } from "./ImageGenPanels";
import { useImageGen } from "./useImageGen";

export function ImageGenApp() {
  const imageGen = useImageGen();

  return (
    <ImageGenLayout
      sidebarWidth={imageGen.sidebarWidth}
      onSidebarWidthChange={imageGen.setSidebarWidth}
      gallery={
        <ImageGenGallery
          items={imageGen.history}
          searchQuery={imageGen.historySearch}
          activeId={imageGen.activeId}
          onSearchChange={imageGen.setHistorySearch}
          onSelect={imageGen.selectHistoryItem}
          onDelete={(id) => void imageGen.removeHistoryItem(id)}
        />
      }
      workspace={
        <ImageGenWorkspace
          prompt={imageGen.prompt}
          size={imageGen.size}
          style={imageGen.style}
          generating={imageGen.generating}
          activeItem={imageGen.activeItem}
          examples={imageGen.examples}
          sizes={imageGen.sizes}
          styles={imageGen.styles}
          status={imageGen.status}
          error={imageGen.error}
          onPromptChange={imageGen.setPrompt}
          onSizeChange={imageGen.setSize}
          onStyleChange={imageGen.setStyle}
          onGenerate={() => void imageGen.generate()}
          onExampleSelect={imageGen.setPrompt}
        />
      }
    />
  );
}
