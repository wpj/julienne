import HttpTerminator from 'http-terminator';

/** @param {import('express').Express} app */
export function startApp(app, port) {
  return new Promise((resolve) => {
    let server = app.listen(port, () => {
      const httpTerminator = HttpTerminator.createHttpTerminator({
        server,
      });

      async function stop() {
        await httpTerminator.terminate();
      }

      resolve(stop);
    });
  });
}
