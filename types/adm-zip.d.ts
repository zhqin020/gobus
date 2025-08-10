declare module 'adm-zip' {
  class AdmZip {
    constructor(zipFilePath: string);
    getEntries(): Array<{ entryName: string; getData(): Buffer; }>;
  }
  export default AdmZip;
}