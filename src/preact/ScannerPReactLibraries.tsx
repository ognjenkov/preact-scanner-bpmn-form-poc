import { PDFDocument } from "pdf-lib";
import { useState, useRef } from "preact/hooks";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const ScannerNEWNEW = () => {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "px",
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: Event) => {
    const target = e.target as HTMLImageElement;
    setCrop({
      unit: "px",
      width: target.width,
      height: target.height,
      x: 0,
      y: 0,
    });
  };

  const onCropComplete = (c: PixelCrop) => {
    setCompletedCrop(c);
  };

  const saveToPdf = async () => {
    if (!completedCrop || !image || !imgRef.current) return;

    const croppedImageUrl = await getCroppedImage(
      imgRef.current,
      image,
      completedCrop
    );

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([completedCrop.width, completedCrop.height]);

    const img = await pdfDoc.embedJpg(croppedImageUrl);

    page.drawImage(img, {
      x: 0,
      y: 0,
      width: completedCrop.width,
      height: completedCrop.height,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "cropped_image.pdf";
    link.click();
  };

  const getCroppedImage = (
    imageElement: HTMLImageElement,
    imageSrc: string,
    crop: PixelCrop
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
        const scaleX = image.naturalWidth / imageElement.width;
        const scaleY = image.naturalHeight / imageElement.height;

        const cropX = crop.x * scaleX;
        const cropY = crop.y * scaleY;
        const cropWidth = crop.width * scaleX;
        const cropHeight = crop.height * scaleY;

        const canvas = document.createElement("canvas");
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(
          image,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );

        resolve(canvas.toDataURL("image/jpeg"));
      };
      image.onerror = reject;
    });
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        capture="environment" // or "user"
        onChange={onImageChange}
      />
      {image && (
        <div style={{ position: "relative", width: "500px", height: "400px" }}>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={onCropComplete}
            minWidth={50}
            minHeight={50}
          >
            <img ref={imgRef} src={image} alt="Crop me" onLoad={onImageLoad} />
          </ReactCrop>
        </div>
      )}
      {!!completedCrop && (
        <div style={{ position: "absolute", top: "1px" }}>
          <button onClick={saveToPdf}>Save Cropped Area to PDF</button>
        </div>
      )}
    </div>
  );
};

export default ScannerNEWNEW;
