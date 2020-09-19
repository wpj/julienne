declare module '@polka/send' {
  import { ServerResponse, OutgoingHttpHeaders } from 'http';

  export default function send(
    res: ServerResponse,
    statusCode: number,
    data: string,
    headers?: OutgoingHttpHeaders,
  ): void;
}
