declare global {
  interface Window {
    cv: any;
  }
}

export const waitForOpenCV = async () => {
  if (typeof window.cv?.then === "function") {
    // If cv is a Promise (async WASM build)
    return await window.cv;
  }

  // Fallback for older builds
  return new Promise<void>((resolve) => {
    const check = () => {
      if (window.cv && window.cv["onRuntimeInitialized"]) {
        window.cv["onRuntimeInitialized"] = () => resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
};
