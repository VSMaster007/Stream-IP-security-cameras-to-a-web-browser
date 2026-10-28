export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly publicMessage: string;

  constructor(statusCode: number, code: string, publicMessage: string) {
    super(publicMessage);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}
