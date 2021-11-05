export declare interface ArcSocketResponse {
  status: number;
  statusText: string;
  headers: string;
  payload: Buffer;
}

export declare interface RequestStats {
  firstReceiveTime?: number;
  lastReceivedTime?: number;
  messageStart?: number;
  sentTime?: number;
  connectionTime?: number;
  lookupTime?: number;
  connectedTime?: number;
  secureStartTime?: number;
  secureConnectedTime?: number;
  startTime?: number;
  responseTime?: number;
  receivingTime?: number;
}

export declare interface ResponsePublishOptions {
  /**
   * If true the response will have information about redirects.
   */
  includeRedirects?: boolean;
  /**
   * An error object when the response error.
   */
  error?: Error;
}
