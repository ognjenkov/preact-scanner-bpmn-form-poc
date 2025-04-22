import { useState } from "preact/hooks";
import "./app.css";
import ScannerOpenCV1Component from "./ScannerOpenCV1/ScannerOpenCV1Component";
import FormEmulator from "./form-emulator/FormEmulator";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>hello world</div>
      {/* <Scanner /> */}
      {/* <ScannerNEWNEW /> */}
      <FormEmulator />
      {/* <ScannerOpenCV1Component /> */}
      {/* <DocumentScanner /> */}
      {/* <DocumentScanner /> */}
    </>
  );
}
