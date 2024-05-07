import type { Server } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";

class TestServer {
  private app: Hono;

  constructor() {
    this.app = new Hono();
    this.app.use("*", cors());

    Bun.serve({
      port: 4000,
      fetch: (request, server) => {
        return this.app.fetch(request, {
          server,
        });
      },
      websocket: {
        message(ws, message) {
          ws.send('ACK: "' + message + '"');
          ws.send("Hello, Client!");
        },
      },
    });

    this.configureRoutes();
  }

  private configureRoutes() {
    this.app.get("/ws-test", (ctx) => {
      const success = (ctx.env?.server as unknown as Server).upgrade(ctx.req.raw);

      if (!success) {
        return new Response("failed to upgrade", { status: 500 });
      }

      return new Response();
    });
  }
}

new TestServer();
