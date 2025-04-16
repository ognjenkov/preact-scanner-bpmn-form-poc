import classNames from "classnames";
import { html, useContext } from "diagram-js/lib/ui";
import { useState, useRef } from "preact/hooks";
import { PDFDocument } from "pdf-lib";
import ReactCrop, { PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Description, Errors, FormContext, Textfield } from "@bpmn-io/form-js";

export const scannerType = "scanner";

export function Scanner(props: any) {
  const { disabled, errors = [], field, readonly, value } = props;

  const {
    description,
    id,
    label,
    validate = {},
    organization,
    taskId,
    key,
  } = field;

  const { required } = validate;

  const { formId } = useContext(FormContext);
  const jsonValue = value ? JSON.parse(value) : [];

  const errorMessageId =
    errors.length === 0 ? undefined : `${prefixId(id, formId)}-error-message`;

  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({
    unit: "px",
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef(null);

  const onImageChange = (e: any) => {
    const file = e?.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string); // ovo se desi posle reader.readAsDataUrl
      };
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: any) => {
    const target = e.target;
    setCrop({
      unit: "px",
      width: target.width,
      height: target.height,
      x: 0,
      y: 0,
    });
  };

  const onCropComplete = (c: any) => {
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

    const img = await pdfDoc.embedJpg(croppedImageUrl as any); // as any ovde ?

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

  const getCroppedImage = (imageElement: any, imageSrc: any, crop: any) => {
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

  return html` <div class="space-y-6">
    <input
      type="file"
      accept="image/*"
      capture="environment"
      onChange=${onImageChange}
      class="border rounded px-2 py-1"
    />
    ${image &&
    html`<div class="relative w-[500px] h-[400px]">
      <${ReactCrop}
        crop=${crop}
        onChange=${(_: any, percentCrop: any) => setCrop(percentCrop)}
        onComplete=${onCropComplete}
        minWidth=${50}
        minHeight=${50}
      >
        <img ref=${imgRef} src=${image} alt="Crop me" onLoad=${onImageLoad} />
      <//>
    </div>`}
    ${completedCrop &&
    html`<div>
      <button
        class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        onClick=${saveToPdf}
      >
        Save Cropped Area to PDF
      </button>
    </div>`}
    <${Description} description=${description} />
    <${Errors} errors=${errors} id=${errorMessageId} />
  </div>`;
}

/*
 * This is the configuration part of the custom field. It defines
 * the schema type, UI label and icon, palette group, properties panel entries
 * and much more.
 */
Scanner.config = {
  /* we can extend the default configuration of existing fields */
  ...Textfield.config,
  label: "Document Scanner",
  type: scannerType,
  group: "custom",
  propertiesPanelEntries: [],
};

// helper //////////////////////

function formFieldClasses(
  type: string,
  { errors = [], disabled = false, readonly = false } = {}
) {
  if (!type) {
    throw new Error("type required");
  }

  return classNames("fjs-form-field", `fjs-form-field-${type}`, {
    "fjs-has-errors": errors.length > 0,
    "fjs-disabled": disabled,
    "fjs-readonly": readonly,
  });
}

function prefixId(id: string, formId: string) {
  if (formId) {
    return `fjs-form-${formId}-${id}`;
  }

  return `fjs-form-${id}`;
}
