import type { Server, ServerWebSocket } from "bun";
import { Hono, type Context, type Env } from "hono";
import { cors } from "hono/cors";
import { createFactory } from "hono/factory";
import { EventEmitter } from "node:events";
import { v4 as uuidv4 } from "uuid";
import { type WebSocket } from "ws";

export class DelegatedWebsocket extends EventEmitter {
  constructor(private underlyingSocket?: ServerWebSocket) {
    super();

    return new Proxy(this, {
      get: (obj, prop) => {
        if (
          ["on", "emit", "swapSocket", "once", "removeListener", "removeListeners", "off"].includes(prop.toString())
        ) {
          return (...args: any) => {
            return (this as any)[prop](...args);
          };
        }

        const underlyingSocket = this.underlyingSocket;

        if (!underlyingSocket) {
          throw new Error("called methods before the underlying was set");
        }
        if (typeof (underlyingSocket as any)[prop] === "function") {
          return (...args: any) => (underlyingSocket as any)[prop](...args);
        }

        return (underlyingSocket as any)[prop];
      },
    });
  }

  swapSocket(socket: ServerWebSocket<any>) {
    this.underlyingSocket = socket;
  }
}

type SocketWithId = ServerWebSocket<{ requestId: string }>;

export class HonoWithSockets {
  private server?: Server;
  readonly api;

  private sockets: Record<string, DelegatedWebsocket>;

  static factory = createFactory();

  constructor() {
    this.api = new Hono();
    this.api.use("*", cors());
    this.sockets = {};
  }

  ws(ctx: Context<Env>, data: Record<string, any>, cb: (ws: WebSocket) => void) {
    const requestId = uuidv4();

    const socket = new DelegatedWebsocket();
    this.sockets[requestId] = socket;
    cb(socket as unknown as WebSocket);

    const success = (ctx.env?.server as Server).upgrade(ctx.req.raw, {
      data: {
        ...data,
        requestId,
      },
    });

    if (!success) {
      delete this.sockets[requestId];
      return new Response("failed to upgrade", { status: 500 });
    }

    return new Response();
  }

  public stop() {
    this.server?.stop();
  }

  public listen(port: number, cb?: () => void) {
    const swapAndEmit = (ws: SocketWithId, event: string, ...args: any[]) => {
      const delegated = this.sockets[ws.data.requestId];
      delegated.swapSocket(ws);
      delegated.emit(event, ...args);
    };

    this.server = Bun.serve({
      port,
      fetch: (request, server) => {
        return this.api.fetch(request, {
          server,
        });
      },
      websocket: {
        message: (ws: SocketWithId, msg) => {
          swapAndEmit(ws, "message", msg);
        },

        open: (ws: SocketWithId) => {
          swapAndEmit(ws, "open");
        },

        close: (ws: SocketWithId, code: number, reason: string) => {
          swapAndEmit(ws, "close", code, reason);
          delete this.sockets[ws.data.requestId];
        },

        ping: (ws: SocketWithId, data: Buffer) => {
          swapAndEmit(ws, "ping", data);
        },

        pong: (ws: SocketWithId, data: Buffer) => {
          swapAndEmit(ws, "pong", data);
        },
      },
    });

    cb?.();

    return this.server;
  }
}

const hono = new HonoWithSockets();

hono.api.get("/ws-test", (ctx) => {
  return hono.ws(ctx, {}, (websocket) => {
    const wsEmitter = websocket as unknown as DelegatedWebsocket;
    wsEmitter.on("message", (msg) => {
      websocket.send("ACK: " + msg);
    });
  });
});

hono.listen(4000, () => console.log("Listening on port 4000"));
