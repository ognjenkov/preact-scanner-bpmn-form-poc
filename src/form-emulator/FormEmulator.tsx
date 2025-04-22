// App.tsx
import { useEffect, useRef } from "react";
import { Form } from "@bpmn-io/form-js";
import "@bpmn-io/form-js/dist/assets/form-js.css";

import scannerFieldModule from "../bpmn-html/index";
import scannerOpenCV1BPMNFieldModule from "../ScannerOpenCV1/bpmn-html/index";

import { scannerType } from "../bpmn-html/Scanner";
import { scannerOpenCV1BPMNType } from "../ScannerOpenCV1/bpmn-html/ScannerOpenCV1BPMN";
const schema = {
  type: "default",
  components: [
    {
      type: scannerType, // your custom field type
      key: "scannedDocument",
      label: "Scan and Upload Document",
    },
    {
      type: scannerOpenCV1BPMNType,
      key: "scannedDocument2",
      label: "Scanner OpenCV",
    },
  ],
};

function FormEmulator() {
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = new Form({
      container: formRef.current!,
      additionalModules: [scannerFieldModule, scannerOpenCV1BPMNFieldModule],
    });

    form.importSchema(schema).catch((err) => {
      console.error("Failed to load schema", err);
    });

    return () => form?.destroy();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Scanner Field Preview</h1>
      <div ref={formRef} />
    </div>
  );
}

export default FormEmulator;
