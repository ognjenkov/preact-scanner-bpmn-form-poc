import { useState } from "preact/hooks";
import Cropper from "react-easy-crop";
import { PDFDocument } from "pdf-lib";

interface CroppedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const Scanner = () => {
  const [image, setImage] = useState<string | null>(null);
  const [croppedArea, setCroppedArea] = useState<CroppedArea | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);

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

  const onCropComplete = (
    croppedAreaPercentage: any,
    croppedAreaPixels: CroppedArea
  ) => {
    setCroppedArea(croppedAreaPixels);
  };

  const getCroppedImage = (imageSrc: string, crop: CroppedArea) => {
    return new Promise<string>((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const image = new Image();
      image.src = imageSrc;

      image.onload = () => {
        // Set canvas size to the cropped area
        canvas.width = crop.width;
        canvas.height = crop.height;

        // Draw the image on the canvas, using the crop area coordinates
        ctx?.drawImage(
          image,
          crop.x, // x position of the crop on the image
          crop.y, // y position of the crop on the image
          crop.width, // width of the crop
          crop.height, // height of the crop
          0, // x position on the canvas (top-left corner)
          0, // y position on the canvas (top-left corner)
          crop.width, // width on canvas
          crop.height // height on canvas
        );

        // Get the base64 string of the cropped image
        const croppedImageUrl = canvas.toDataURL("image/jpeg");
        resolve(croppedImageUrl);
      };

      image.onerror = reject;
    });
  };

  const saveToPdf = async () => {
    if (!croppedArea || !image) return;

    // Get the cropped image
    const croppedImageUrl = await getCroppedImage(image, croppedArea);
    // Create PDF Document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([croppedArea.width, croppedArea.height]);

    // Embed the cropped image
    const img = await pdfDoc.embedJpg(croppedImageUrl);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: croppedArea.width,
      height: croppedArea.height,
    });

    // Save the PDF and trigger download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "cropped_image.pdf";
    link.click();
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={onImageChange} />
      {image && (
        <div style={{ position: "relative", width: "500px", height: "400px" }}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
      )}
      <button onClick={saveToPdf}>Save Cropped Area to PDF</button>
    </div>
  );
};

export default Scanner;
