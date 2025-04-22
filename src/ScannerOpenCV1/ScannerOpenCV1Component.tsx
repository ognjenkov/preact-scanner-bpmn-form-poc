import { useRef, useEffect, useState } from "preact/hooks";
import { PDFDocument, rgb } from "pdf-lib";

import { waitForOpenCV } from "./waitForOpenCV";

export default function ScannerOpenCV1Component() {
  const [cv, setCv] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    const load = async () => {
      const cvInstance = await waitForOpenCV();
      setCv(cvInstance);
      console.log("OpenCV Loaded:", cvInstance.getBuildInformation());
    };
    setTimeout(load, 1000);
    // load();

    return () => {
      // Clean up script on unmount
      document.body.removeChild(script);
      // Optionally remove global `cv` reference
      // @ts-ignore
      if (window.cv) {
        // @ts-ignore
        delete window.cv;
      }
    };
  }, []);

  // useEffect(() => {
  //   const load = async () => {
  //     const cvInstance = await waitForOpenCV();
  //     setCv(cvInstance);
  //     console.log("OpenCV Loaded:", cvInstance.getBuildInformation());
  //   };

  // }, []);

  const handleImageUpload = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !cv) return;

    setLoading(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
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

      try {
        // Simple grayscale and threshold
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.threshold(gray, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

        // Find contours
        cv.findContours(
          thresh,
          contours,
          hierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE
        );

        // Find the largest contour
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

        // Approximate to polygon
        const approx = new cv.Mat();
        const peri = cv.arcLength(maxContour, true);
        cv.approxPolyDP(maxContour, approx, 0.02 * peri, true);

        if (approx.rows !== 4) {
          throw new Error("Document must have 4 corners");
        }

        // Get the four corners
        const points = [];
        for (let i = 0; i < 4; i++) {
          points.push({
            x: approx.data32S[i * 2],
            y: approx.data32S[i * 2 + 1],
          });
        }

        // Sort points: top-left, top-right, bottom-right, bottom-left
        points.sort((a, b) => a.y - b.y);
        const topPoints = points.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottomPoints = points.slice(2).sort((a, b) => b.x - a.x);
        const orderedPoints = [...topPoints, ...bottomPoints];

        // Calculate width and height of the document
        const width = Math.max(
          Math.abs(orderedPoints[1].x - orderedPoints[0].x),
          Math.abs(orderedPoints[2].x - orderedPoints[3].x)
        );

        const height = Math.max(
          Math.abs(orderedPoints[3].y - orderedPoints[0].y),
          Math.abs(orderedPoints[2].y - orderedPoints[1].y)
        );

        // Create source and destination points for perspective transform
        const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
          orderedPoints[0].x,
          orderedPoints[0].y,
          orderedPoints[1].x,
          orderedPoints[1].y,
          orderedPoints[2].x,
          orderedPoints[2].y,
          orderedPoints[3].x,
          orderedPoints[3].y,
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

        // Apply perspective transform
        const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
        const warped = new cv.Mat();
        cv.warpPerspective(src, warped, M, new cv.Size(width, height));

        // After getting the warped image, add A4 formatting:
        const A4_WIDTH_MM = 210;
        const A4_HEIGHT_MM = 297;
        const MM_TO_POINTS = 72 / 25.4; // 72 points per inch, 25.4 mm per inch

        const A4_WIDTH_POINTS = A4_WIDTH_MM * MM_TO_POINTS;
        const A4_HEIGHT_POINTS = A4_HEIGHT_MM * MM_TO_POINTS;

        // Calculate aspect ratios
        const docAspectRatio = width / height;
        const a4AspectRatio = A4_WIDTH_POINTS / A4_HEIGHT_POINTS;

        let outputWidth, outputHeight;

        // Determine whether to fit to width or height
        if (docAspectRatio > a4AspectRatio) {
          // Fit to width
          outputWidth = A4_WIDTH_POINTS;
          outputHeight = outputWidth / docAspectRatio;
        } else {
          // Fit to height
          outputHeight = A4_HEIGHT_POINTS;
          outputWidth = outputHeight * docAspectRatio;
        }

        // Convert warped image to canvas
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = warped.cols;
        outputCanvas.height = warped.rows;
        cv.imshow(outputCanvas, warped);

        // Create PDF with A4 page
        const imgData = await new Promise<Uint8Array>((resolve) => {
          outputCanvas.toBlob(
            async (blob) => {
              resolve(new Uint8Array(await blob!.arrayBuffer()));
            },
            "image/jpeg",
            0.9
          );
        });

        const pdfDoc = await PDFDocument.create();
        const img = await pdfDoc.embedJpg(imgData);

        // Create A4 page and center the image
        const page = pdfDoc.addPage([A4_WIDTH_POINTS, A4_HEIGHT_POINTS]);

        // Calculate centering position
        const xOffset = (A4_WIDTH_POINTS - outputWidth) / 2;
        const yOffset = (A4_HEIGHT_POINTS - outputHeight) / 2;

        // page.drawImage(img, { ovaj kod napravi dokument da je A4 ali slika ostaje warpovana kako si skenirao
        //   x: xOffset,
        //   y: yOffset,
        //   width: outputWidth,
        //   height: outputHeight,
        // });
        page.drawImage(img, {
          // ovo strecuje sliku na A4
          x: 0,
          y: 0,
          width: A4_WIDTH_POINTS,
          height: A4_HEIGHT_POINTS,
        });

        // Add white background if needed (optional)
        // page.drawRectangle({
        //   x: 0,
        //   y: 0,
        //   width: A4_WIDTH_POINTS,
        //   height: A4_HEIGHT_POINTS,
        //   borderWidth: 0,
        //   color: rgb(1, 1, 1), // White
        // });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${Math.random() * 1000}.pdf`;
        link.click();
      } catch (error) {
        console.error("Error processing document:", error);
      } finally {
        // Clean up
        [src, gray, thresh, contours, hierarchy].forEach((m) => m.delete());
        setLoading(false);
      }
    };

    return false;
  };

  return (
    <div class="p-4 space-y-2">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={inputRef}
        onChange={handleImageUpload}
        disabled={loading}
      />
      {loading && <p>Processing image...</p>}
    </div>
  );
}
