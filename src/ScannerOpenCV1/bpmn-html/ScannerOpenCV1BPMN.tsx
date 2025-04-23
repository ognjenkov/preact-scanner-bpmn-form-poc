import { html, useContext } from "diagram-js/lib/ui";
import { useEffect, useRef, useState } from "preact/hooks";
import { Description, Errors, FormContext, Textfield } from "@bpmn-io/form-js";
import { PDFDocument } from "pdf-lib";
import { waitForOpenCV } from "../waitForOpenCV";

export const scannerOpenCV1BPMNType = "scanner-opencv";

export function ScannerOpenCV1BPMN(props: any) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [pdfs, setPdfs] = useState<Uint8Array[]>([]);
  const galleryRef = useRef<HTMLDivElement>(null);

  const { disabled, errors = [], field, readonly } = props;
  const { description, id, label, validate = {} } = field;
  const { required } = validate;

  const { formId } = useContext(FormContext);
  const errorMessageId =
    errors.length === 0 ? undefined : `${prefixId(id, formId)}-error-message`;

  const [cv, setCv] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Prevent duplicate script
    const scriptUrl = "https://docs.opencv.org/4.x/opencv.js";
    let script: HTMLScriptElement | null = document.querySelector(
      `script[src="${scriptUrl}"]`
    );

    const load = async () => {
      const cvInstance = await waitForOpenCV();
      setCv(cvInstance);
      console.log("OpenCV Loaded:", cvInstance.getBuildInformation());
    };

    // If the script doesn't exist, create and append it
    if (!script) {
      script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.type = "text/javascript";
      script.onload = load; // Call load() after script finishes loading
      document.body.appendChild(script);
    } else if (window.cv) {
      // If script already loaded, and cv is ready
      load();
    }

    return () => {
      // Optional cleanup
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (window.cv) {
        delete window.cv;
      }
    };
  }, []);

  const handleImageUpload = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !cv) return;

    setLoading(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        const src = cv.imread(canvas);
        const gray = new cv.Mat();
        const thresh = new cv.Mat();
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.threshold(gray, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        cv.findContours(
          thresh,
          contours,
          hierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE
        );

        let maxArea = 0;
        let maxContour = null;
        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);
          if (area > maxArea) {
            maxArea = area;
            maxContour = cnt;
          }
        }

        if (!maxContour) throw new Error("No contours found");

        const approx = new cv.Mat();
        const peri = cv.arcLength(maxContour, true);
        cv.approxPolyDP(maxContour, approx, 0.02 * peri, true);

        if (approx.rows !== 4) throw new Error("Document must have 4 corners");

        const points = [];
        for (let i = 0; i < 4; i++) {
          points.push({
            x: approx.data32S[i * 2],
            y: approx.data32S[i * 2 + 1],
          });
        }

        points.sort((a, b) => a.y - b.y);
        const top = points.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottom = points.slice(2).sort((a, b) => b.x - a.x);
        const ordered = [...top, ...bottom];

        const width = Math.max(
          Math.abs(ordered[1].x - ordered[0].x),
          Math.abs(ordered[2].x - ordered[3].x)
        );

        const height = Math.max(
          Math.abs(ordered[3].y - ordered[0].y),
          Math.abs(ordered[2].y - ordered[1].y)
        );

        const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
          ordered[0].x,
          ordered[0].y,
          ordered[1].x,
          ordered[1].y,
          ordered[2].x,
          ordered[2].y,
          ordered[3].x,
          ordered[3].y,
        ]);

        const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
          0,
          0,
          width,
          0,
          width,
          height,
          0,
          height,
        ]);
        const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
        const warped = new cv.Mat();
        cv.warpPerspective(src, warped, M, new cv.Size(width, height));

        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = warped.cols;
        outputCanvas.height = warped.rows;
        cv.imshow(outputCanvas, warped);

        // ovde izmena

        const previewUrlBlob = await new Promise<Blob>((resolve) =>
          outputCanvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95)
        );
        const previewUrl = URL.createObjectURL(previewUrlBlob);
        // setPreviewUrl(previewUrl);
        setPreviews((prev) => [...prev, previewUrl]);

        // Also prepare the PDF, but wait to trigger download until "Done"
        const imageBytes = new Uint8Array(await previewUrlBlob.arrayBuffer());
        const pdfDoc = await PDFDocument.create();
        const imgEmbed = await pdfDoc.embedJpg(imageBytes);

        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;
        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        page.drawImage(imgEmbed, {
          x: 0,
          y: 0,
          width: A4_WIDTH,
          height: A4_HEIGHT,
        });

        const pdfBytes = await pdfDoc.save();
        // setPdfDataUrl(pdfBytes);
        setPdfs((prev) => [...prev, pdfBytes]);

        [src, gray, thresh, contours, hierarchy, approx, warped].forEach((m) =>
          m.delete()
        );

        setTimeout(() => {
          galleryRef.current?.scrollTo({
            top: galleryRef.current.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      } catch (err) {
        console.error("OpenCV processing error:", err);
      } finally {
        setLoading(false);
      }
    };
  };

  return html`
    <div
      style="display: flex; flex-direction: column; gap: 1rem; font-family: sans-serif;"
    >
      <label style="font-weight: 600; color: #f9f9f9;">${label}</label>

      <button
        type="button"
        onClick=${(e: any) => {
          e.preventDefault();
          e.stopPropagation();
          inputRef.current?.click();
        }}
        disabled=${loading}
        style="
        padding: 0.5rem 1rem;
        background: #2196f3;
        color: white;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
      "
      >
        Use Scanner
      </button>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref=${inputRef}
        onChange=${(e: any) => {
          e.preventDefault();
          e.stopPropagation();
          handleImageUpload(e);
        }}
        disabled=${loading}
        style="display: none;"
      />

      ${previews &&
      previews.length > 0 &&
      html`
        <div
          style="
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  "
        >
          <div
            ref=${galleryRef}
            style="max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem;"
          >
            ${previews.map(
              (url) => html`
                <div
                  style="width: 90vw; aspect-ratio: 1 / 1.4142; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;"
                >
                  <img
                    src=${url}
                    style="width: 100%; height: 100%; object-fit: fill;"
                  />
                </div>
              `
            )}
          </div>

          <div
            style="
      margin-top: 1rem;
      display: flex;
      gap: 1rem;
      justify-content: center;
    "
          >
            <button
              type="button"
              style="
                  background: #ccc;
                  color: #000;
                  padding: 0.75rem 1.5rem;
                  border: none;
                  border-radius: 8px;
                  font-weight: bold;
                "
              onClick=${(e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                setPreviews([]);
                setPdfs([]);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              style="
                  background: orange;
                  color: white;
                  padding: 0.75rem 1.5rem;
                  border: none;
                  border-radius: 8px;
                  font-weight: bold;
                "
              onClick=${(e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                setPreviews((prev) => prev.slice(0, -1));
                setPdfs((prev) => prev.slice(0, -1));
                inputRef.current?.click();
              }}
            >
              Retake
            </button>
            <button
              type="button"
              onClick=${(e: any) => {
                e.preventDefault();
                e.stopPropagation();
                inputRef.current?.click();
              }}
              style="padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 0.375rem;"
            >
              Add Document
            </button>
            <button
              type="button"
              style="
                  background: green;
                  color: white;
                  padding: 0.75rem 1.5rem;
                  border: none;
                  border-radius: 8px;
                  font-weight: bold;
                "
              onClick=${async (e: Event) => {
                e.preventDefault();
                e.stopPropagation();

                const mergedPdf = await PDFDocument.create();
                for (const pdfBytes of pdfs) {
                  const pdf = await PDFDocument.load(pdfBytes);
                  const pages = await mergedPdf.copyPages(
                    pdf,
                    pdf.getPageIndices()
                  );
                  pages.forEach((p) => mergedPdf.addPage(p));
                }
                const finalPdf = await mergedPdf.save();
                const blob = new Blob([finalPdf], { type: "application/pdf" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "scanned_document.pdf";
                link.click();

                setPreviews([]);
                setPdfs([]);
              }}
            >
              Done
            </button>
          </div>
        </div>
      `}
      ${loading &&
      html`<p style="color: #888; font-size: 0.9rem;">Processing image...</p>`}
      <${Description} description=${description} />
      <${Errors} errors=${errors} id=${errorMessageId} />
    </div>
  `;
}

ScannerOpenCV1BPMN.config = {
  ...Textfield.config,
  label: "Document Scanner (OpenCV)",
  type: scannerOpenCV1BPMNType,
  group: "custom",
  propertiesPanelEntries: [],
};

function prefixId(id: string, formId: string) {
  return formId ? `fjs-form-${formId}-${id}` : `fjs-form-${id}`;
}
