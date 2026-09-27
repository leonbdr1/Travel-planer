// PGlite has exactly one database session. pglite-socket feeds the protocol
// messages of all client connections into it, so concurrent connections
// interleave their extended-protocol messages (a Bind of one connection lands
// on another's statement). This proxy hands the socket to one client
// connection at a time; others wait (paused) until the active one closes.
// Local development and tests only; production talks to real Postgres.
import { createConnection, createServer, type Socket } from 'node:net';

export interface SerialProxy {
  port: number;
  close(): Promise<void>;
}

export async function startSerialProxy(options: { host: string; port: number; targetPort: number }): Promise<SerialProxy> {
  const waiting: Socket[] = [];
  const open = new Set<Socket>();
  let active = false;

  const next = (): void => {
    if (active) return;
    const client = waiting.shift();
    if (!client) return;
    if (client.destroyed) {
      next();
      return;
    }
    active = true;
    const upstream = createConnection({ host: options.host, port: options.targetPort });
    open.add(upstream);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      client.destroy();
      upstream.destroy();
      open.delete(upstream);
      active = false;
      setImmediate(next);
    };
    for (const s of [client, upstream]) {
      s.on('close', finish);
      s.on('error', finish);
    }
    client.pipe(upstream);
    upstream.pipe(client);
    client.resume();
  };

  const server = createServer({ pauseOnConnect: true }, (socket) => {
    open.add(socket);
    socket.on('close', () => {
      open.delete(socket);
      const i = waiting.indexOf(socket);
      if (i >= 0) waiting.splice(i, 1);
    });
    socket.on('error', () => socket.destroy());
    waiting.push(socket);
    next();
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, () => resolve());
  });
  const address = server.address();
  return {
    port: typeof address === 'object' && address ? address.port : options.port,
    close: () =>
      new Promise<void>((resolve) => {
        for (const s of open) s.destroy();
        server.close(() => resolve());
      }),
  };
}
