import { Scanner, scannerType } from "./Scanner";

class CustomFormFields {
  constructor(formFields: any) {
    formFields.register(scannerType, Scanner);
  }
}

export default {
  __init__: ["scannerField"],
  scannerField: ["type", CustomFormFields],
};
