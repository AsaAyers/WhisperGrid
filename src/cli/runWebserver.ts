/* eslint-disable @typescript-eslint/no-explicit-any */
import fastify from "fastify";
import fstatic from "@fastify/static";
import fsocket from "@fastify/websocket";
import path from "path";
import fs from "fs/promises";
import { Client } from "client";
import { invariant } from "../browser/invariant";

const host = "localhost";
const port = 3000 + Math.floor(Math.random() * 1000);

export async function runWebserver(client: Client) {
  const app = fastify({
    logger: false,
  });
  app.register(fsocket);
  app.register(async (fastify) => {
    fastify.get("/client-socket", { websocket: true }, async (socket) => {
      socket.on("message", async (message) => {
        const data = JSON.parse(message.toString());
        if (data.requestId && data.method && Array.isArray(data.args)) {
          const method = client[data.method as keyof Client];
          if (typeof method === "function") {
            try {
              // @ts-expect-error I think TS can't verify that the args and return
              // value match the method
              const result = await method.apply(client, data.args);
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
