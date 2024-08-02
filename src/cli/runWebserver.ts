/* eslint-disable @typescript-eslint/no-explicit-any */
import fastify from "fastify";
import fstatic from "@fastify/static";
import fsocket from "@fastify/websocket";
import path from "path";
import fs from "fs/promises";
import { Client } from "../client";
import { invariant } from "../browser/invariant";

const host = "localhost";
let port = 3000 + Math.floor(Math.random() * 1000);

if (process.env.PORT) {
  port = Number(process.env.PORT);
}

export async function runWebserver(c: Client | null) {
  const app = fastify({
    logger: Boolean(process.env.LOG),
  });
  app.register(fsocket);
  app.register(async (fastify) => {
    fastify.get("/client-socket", { websocket: true }, async (socket) => {
      let client = c;
      socket.on("message", async (message) => {
        const data = JSON.parse(message.toString());
        if (data.requestId && data.method && Array.isArray(data.args)) {
          let method;
          let ctx: Client | typeof Client;
          if (!client) {
            const methodName:
              | "generateClient"
              | "loadFromBackup"
              | "loadClient" = data.method;
            invariant(
              ["generateClient", "loadFromBackup", "loadClient"].includes(
                methodName as keyof typeof Client
              ),
              `Invalid method: ${methodName}`
            );

            const fn = Client[methodName];
            ctx = Client;
            method = async (...args: Parameters<typeof fn>) => {
              // @ts-expect-error This complains about the number of parameters for some reason
              client = await fn.apply(ctx, args);
              return client;
            };
          } else {
            method = client[data.method as keyof Client];
            ctx = client;
          }

          if (typeof method === "function") {
            try {
              // @ts-expect-error I think TS can't verify that the args and return
              // value match the method
              const result = await method.apply(ctx, data.args);
              socket.send(
                JSON.stringify({ requestId: data.requestId, result })
              );
            } catch (e: any) {
              socket.send(
                JSON.stringify({ requestId: data.requestId, error: e?.message })
              );
            }
          }
        }
      });
      socket.send(
        JSON.stringify({ requestId: "init", result: client != null })
      );
    });
  });

  const root = path.join(__dirname, "../../dist/");
  invariant(fs.access(root), `${root} is not a directory: ${root}`);
  app.register(fstatic, { root, prefix: "/WhisperGrid/" });

  app.get("/WhisperGrid", async (request, reply) => {
    return reply.sendFile("index.html", root);
  });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/WhisperGrid")) {
      return reply.status(404).sendFile("404.html", root);
    }
    if (request.url.startsWith("/favicon.ico")) {
      return reply.status(404).send();
    }
    return reply.redirect(`/WhisperGrid/`);
  });

  app
    .listen({
      host,
      port,
    })
    .then((url) => {
      console.log(`Server running at ${url}`);
      console.log(`root: ${root}`);
    });

  return new Promise(() => {});
}
