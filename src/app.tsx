import { useState } from "preact/hooks";
import preactLogo from "./assets/preact.svg";
import viteLogo from "/vite.svg";
import "./app.css";
import Scanner from "./not-working/Scanner";
import ScannerNEWNEW from "./preact/ScannerPReactLibraries";
import FormEmulator from "./form-emulator/FormEmulator";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>hello world</div>
      {/* <Scanner /> */}
      {/* <ScannerNEWNEW /> */}
      <FormEmulator />
    </>
  );
}
