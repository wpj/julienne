declare module '@polka/send-type' {
  import { ServerResponse, OutgoingHttpHeaders } from 'http';

  export default function send(
    res: ServerResponse,
    statusCode: number,
    data: string | Buffer | ReadableStream | any,
    headers?: OutgoingHttpHeaders,
  ): void;
}
