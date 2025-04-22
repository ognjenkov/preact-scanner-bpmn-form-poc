import {
  ScannerOpenCV1BPMN,
  scannerOpenCV1BPMNType,
} from "./ScannerOpenCV1BPMN";

class CustomFormFields {
  constructor(formFields: any) {
    formFields.register(scannerOpenCV1BPMNType, ScannerOpenCV1BPMN);
  }
}

export default {
  __init__: ["scannerOpenCV1BPMNField"],
  scannerOpenCV1BPMNField: ["type", CustomFormFields],
};
