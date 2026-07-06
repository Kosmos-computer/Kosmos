import { ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui";
import { PdfViewer } from "./PdfViewer";

export interface PdfReaderViewProps {
  file: { id: string; name: string };
  onBack: () => void;
}

export function PdfReaderView({ file, onBack }: PdfReaderViewProps) {
  return (
    <div className="arco-drive-editor arco-drive-editor--pdf">
      <div className="arco-drive-editor__header">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={13} /> Back
        </Button>
        <span className="arco-drive-editor__path">{file.name}</span>
      </div>
      <PdfViewer fileId={file.id} variant="reader" />
    </div>
  );
}
