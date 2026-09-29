// Postgres wire-protocol server for PGlite (local development and tests;
// production talks to real Postgres through Hyperdrive).
//
// PGlite has exactly one database session. Clients reach it through this
// server, which runs their messages in chunks: everything up to a Sync or a
// simple Query, or up to a Flush when the client waits for an answer in the
// middle of an extended-protocol sequence. Chunks of different connections
// interleave only between sequences and outside transactions, so a statement
// never binds to another client's statement and a transaction never sees
// another client's half-done work.
//
// Before (serial proxy, until 2026-09-29) one client connection owned the
// session until it closed. A Worker step that kept its connection open while
// waiting several seconds for LiteAPI blocked every other connection, and the
// progress polls of the search page failed with CONNECT_TIMEOUT (Ben's test on
// 2026-09-29). Now an idle connection costs the others nothing.
//
// The Worker's queries use unnamed statements (postgres.js `unsafe`, which
// prepares nothing): Parse, Describe and Flush, then Bind, Execute and Sync.
// Between the two halves no other client may run, or its Parse would replace
// the statement (the mix-up pglite-socket had, HANDOFF drift 15).
//
// Not supported: COPY over the wire, LISTEN/NOTIFY across connections.
import { createServer, type Socket } from 'node:net';
import type { PGlite } from '@electric-sql/pglite';

const SSL_REQUEST = 80877103;
const GSSENC_REQUEST = 80877104;
const CANCEL_REQUEST = 80877102;

const SYNC = 0x53; // S
const QUERY = 0x51; // Q
const FLUSH = 0x48; // H
const TERMINATE = 0x58; // X

const syncMessage = () => Buffer.from([SYNC, 0, 0, 0, 4]);

/** Big-endian int32 (DataView: the Worker's type-check knows no Buffer.readInt32BE). */
const int32 = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(at);

function queryMessage(sql: string): Buffer {
  const text = Buffer.from(`${sql}\0`, 'utf8');
  const header = Buffer.alloc(5);
  header[0] = QUERY;
  new DataView(header.buffer, header.byteOffset, header.byteLength).setInt32(1, 4 + text.length);
  return Buffer.concat([header, text]);
}

interface Session {
  id: number;
  socket: Socket;
  started: boolean;
  buffer: Buffer;
  /** Complete messages of the chunk being collected. */
  pending: Buffer[];
  closed: boolean;
  cleanupQueued: boolean;
}

interface Chunk {
  session: Session;
  /** `client`: the client's messages; `cleanup`: end the transaction or sequence of a client that left while owning the session. */
  kind: 'client' | 'cleanup';
  bytes: Buffer;
  /** The client continues its extended-protocol sequence (the chunk ended with Flush). */
  continues: boolean;
}

export interface PgliteWireServer {
  port: number;
  close(): Promise<void>;
}

export async function startPgliteWireServer(
  pg: PGlite,
  options: { host: string; port: number; log?: (message: string) => void },
): Promise<PgliteWireServer> {
  const log = options.log ?? (() => {});
  const sessions = new Set<Session>();
  const queue: Chunk[] = [];
  /** The session whose sequence or transaction is open: only its chunks run until it ends. */
  let owner: Session | null = null;
  let running = false;
  let nextId = 1;

  const queueCleanup = (session: Session) => {
    if (session.cleanupQueued) return;
    session.cleanupQueued = true;
    queue.unshift({ session, kind: 'cleanup', bytes: Buffer.alloc(0), continues: false });
  };

  const execute = async (session: Session, bytes: Buffer) => {
    await pg.runExclusive(() =>
      pg.execProtocolRawStream(new Uint8Array(bytes), {
        // The data is a view into PGlite's buffer: copy before the socket keeps it.
        onRawData: (data) => {
          if (!session.closed && session.socket.writable) session.socket.write(Buffer.from(data));
        },
      }),
    );
  };

  const pump = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      for (;;) {
        const index = owner ? queue.findIndex((c) => c.session === owner) : 0;
        const chunk = index >= 0 ? queue.splice(index, 1)[0] : undefined;
        if (!chunk) break;
        const { session } = chunk;
        if (chunk.kind === 'cleanup') {
          // The client left in the middle of a transaction or sequence: end it for the next one.
          await execute(session, pg.isInTransaction() ? queryMessage('ROLLBACK') : syncMessage()).catch(() => {});
          owner = null;
          continue;
        }
        if (session.closed) continue;
        try {
          await execute(session, chunk.bytes);
        } catch (err) {
          log(`db wire: session ${session.id} failed: ${(err as Error).message}`);
          session.socket.destroy();
          session.closed = true;
        }
        owner = chunk.continues || pg.isInTransaction() ? session : null;
        if (owner?.closed) queueCleanup(owner);
      }
    } finally {
      running = false;
    }
  };

  const enqueue = (session: Session, bytes: Buffer, continues: boolean) => {
    queue.push({ session, kind: 'client', bytes, continues });
    void pump();
  };

  const onData = (session: Session, chunk: Buffer) => {
    session.buffer = session.buffer.length > 0 ? Buffer.concat([session.buffer, chunk]) : chunk;
    for (;;) {
      if (!session.started) {
        // Startup phase: length, code, parameters; no type byte.
        if (session.buffer.length < 8) return;
        const length = int32(session.buffer, 0);
        if (length < 8) throw new Error(`startup length ${length}`);
        if (session.buffer.length < length) return;
        const code = int32(session.buffer, 4);
        const message = Buffer.from(session.buffer.subarray(0, length));
        session.buffer = session.buffer.subarray(length);
        if (code === SSL_REQUEST || code === GSSENC_REQUEST) {
          session.socket.write('N');
          continue;
        }
        if (code === CANCEL_REQUEST) {
          session.socket.destroy();
          return;
        }
        session.started = true;
        // PGlite answers the startup itself (authentication ok … ready for query).
        enqueue(session, message, false);
        continue;
      }
      if (session.buffer.length < 5) return;
      const type = session.buffer[0] as number;
      const length = 1 + int32(session.buffer, 1);
      if (length < 5) throw new Error(`message length ${length}`);
      if (session.buffer.length < length) return;
      const message = Buffer.from(session.buffer.subarray(0, length));
      session.buffer = session.buffer.subarray(length);
      if (type === TERMINATE) {
        // Never reaches the shared session; the close handler cleans up.
        session.socket.end();
        return;
      }
      session.pending.push(message);
      if (type === SYNC || type === QUERY || type === FLUSH) {
        const bytes = Buffer.concat(session.pending);
        session.pending = [];
        enqueue(session, bytes, type === FLUSH);
      }
    }
  };

  const onClose = (session: Session) => {
    if (session.closed && !sessions.has(session)) return;
    session.closed = true;
    sessions.delete(session);
    for (let i = queue.length - 1; i >= 0; i -= 1) if (queue[i]?.session === session && queue[i]?.kind === 'client') queue.splice(i, 1);
    if (owner === session && !running) queueCleanup(session);
    void pump();
  };

  const server = createServer((socket) => {
    const session: Session = { id: nextId++, socket, started: false, buffer: Buffer.alloc(0), pending: [], closed: false, cleanupQueued: false };
    sessions.add(session);
    socket.setNoDelay(true);
    socket.on('data', (data: Buffer) => {
      try {
        onData(session, data);
      } catch (err) {
        log(`db wire: bad message from session ${session.id}: ${(err as Error).message}`);
        socket.destroy();
      }
    });
    socket.on('error', () => socket.destroy());
    socket.on('close', () => onClose(session));
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
        for (const s of sessions) s.socket.destroy();
        server.close(() => resolve());
      }),
  };
}
