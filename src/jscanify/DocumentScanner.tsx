import { useRef, useState } from "preact/hooks";
// import jscanify from "jscanify";
import jscanify from "jscanify/dist/jscanify.min.js";
import "./DocumentScanner.css";

type HTMLImageElementWithSrc = HTMLImageElement & { src: string };

export default function DocumentScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLImageElementWithSrc>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const scanner = new jscanify();
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setStream(mediaStream);
      setIsScanning(true);
      requestAnimationFrame(scanDocument);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert(
        "Could not access camera. Please ensure you've granted permission."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsScanning(false);
    }
  };

  const scanDocument = () => {
    if (
      !isScanning ||
      !videoRef.current ||
      !canvasRef.current ||
      !resultCanvasRef.current
    )
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Try to extract document
    const resultCanvas = scanner.extractPaper(
      canvas,
      canvas.width,
      canvas.height
    );
    resultCanvasRef.current.src = resultCanvas.toDataURL("image/jpeg");

    // Continue scanning
    requestAnimationFrame(scanDocument);
  };

  const captureDocument = () => {
    if (!resultCanvasRef.current?.src) return;

    setScannedImage(resultCanvasRef.current.src);
    stopCamera();
  };

  const downloadScannedImage = () => {
    if (!scannedImage) return;

    const link = document.createElement("a");
    link.href = scannedImage;
    link.download = "scanned-document.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="scanner-container">
      <h1>Document Scanner</h1>

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={isScanning ? "" : "hidden"}
        />
        <canvas ref={canvasRef} className="hidden" />
        <img
          ref={resultCanvasRef}
          className={scannedImage ? "" : "hidden"}
          alt="Scanned document"
        />
      </div>

      <div className="controls">
        {!isScanning ? (
          <button onClick={startCamera} className="btn">
            Start Camera
          </button>
        ) : (
          <button onClick={captureDocument} className="btn">
            Capture Document
          </button>
        )}

        {scannedImage && (
          <>
            <button onClick={downloadScannedImage} className="btn">
              Download
            </button>
            <button onClick={() => setScannedImage(null)} className="btn">
              Scan Again
            </button>
          </>
        )}
      </div>

      {scannedImage && (
        <div className="preview">
          <h2>Preview</h2>
          <img
            src={scannedImage}
            alt="Scanned document preview"
            className="preview-image"
          />
        </div>
      )}
    </div>
  );
}
