/* eslint-disable @typescript-eslint/no-explicit-any */
import fastify from "fastify";
import fstatic from "@fastify/static";
import fsocket from "@fastify/websocket";
import path from "path";
import fs from "fs/promises";
import { Client, GridStorage } from "../client";
import { invariant } from "../browser/invariant";
import debounce from "lodash.debounce";
import { SignedBackup } from "client/types";

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
          let ctx: Client | null;
          if (!client) {
            invariant(data.method === "login", "Invalid method");

            ctx = null;
            method = async (username: string, password: string) => {
              const filename = path.join(process.cwd(), username + ".jws.txt");
              try {
                await fs.access(filename);
                const backup = (
                  await fs.readFile(filename, "utf-8")
                ).trim() as SignedBackup;

                const c = await Client.loadFromBackup(
                  new GridStorage(),
                  backup,
                  password,
                );
                c.subscribe(
                  debounce(async () => {
                    const backup = await c.makeBackup(password);
                    await fs.writeFile(filename, backup);
                  }, 500),
                );
                client = c;
                return c;
              } catch (e) {
                console.error("Error loading backup", e);
                throw new Error("Invalid username or password");
              }
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
                JSON.stringify({ requestId: data.requestId, result }),
              );
            } catch (e: any) {
              socket.send(
                JSON.stringify({
                  requestId: data.requestId,
                  error: e?.message,
                }),
              );
            }
          }
        }
      });
      socket.send(
        JSON.stringify({ requestId: "init", result: client != null }),
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
