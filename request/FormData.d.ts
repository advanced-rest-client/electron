export declare interface FormDataResult {
  /**
   * The contents of the form data
   */
  buffer: Buffer;
  /**
   * Content type for the form data.
   */
  type: string;
}

export default function(data: FormData): Promise<FormDataResult>;
