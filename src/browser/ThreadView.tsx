/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Flex,
  Form,
  FormProps,
  Input,
  Space,
  Typography,
  App,
  Switch,
} from "antd";
import {
  ThreadID,
  SignedReply,
  SignedTransport,
  DecryptedMessageType,
  Client,
} from "../client";
import { SendOutlined, UserOutlined } from "@ant-design/icons";
import { invariant, parseJWSSync } from "../client/utils";
import { useParams, useSearchParams } from "react-router-dom";
import { useClient } from "./ClientProvider";
import { RelaySetupCascader } from "./ntfy-relay";

export const matchJWS = /^([a-zA-Z0-9-_]+)(\.[a-zA-Z0-9-_]+){2}$/;
const myColor = "#87d068";
const theirColor = "#108ee9";

type MissingMessage = {
  type: "missing";
  messageId: string;
  original?: undefined;
  from?: undefined;
  iat: number;
  message?: string;
  fromThumbprint?: string;
};
type ThreadMessage = DecryptedMessageType & {
  original: SignedTransport;
};

type ThreadInfo = Awaited<ReturnType<Client["getThreadInfo"]>>;
export function ThreadView(): React.ReactNode {
  const [, setSearachParams] = useSearchParams();
  const [form] = Form.useForm<FieldType>();
  const client = useClient();
  const { threadId } = useParams<{ threadId: ThreadID }>();
  const app = App.useApp();
  invariant(threadId, `ThreadID is required`);

  const [threadInfo, setThreadInfo] = React.useState<ThreadInfo | null>(null);

  const [thread, setThread] = React.useState<
    Array<ThreadMessage | MissingMessage>
  >([]);
  const refreshThread = React.useCallback(async () => {
    const originalMessages = (await client.getEncryptedThread(threadId)) ?? [];
    const decryptedMessages = await Promise.all(
      originalMessages.map(
        async (original): Promise<ThreadMessage | MissingMessage> => {
          const decrypted = await client.decryptMessage(threadId, original);
          return {
            ...decrypted,
            original,
          };
        },
      ),
    );

    const threadInfo = await client.getThreadInfo(threadId);
    setThreadInfo(threadInfo);
    return setThread(decryptedMessages);
  }, [threadId]);

  React.useEffect(() => {
    refreshThread();
    let t: ReturnType<typeof setTimeout>;
    client.subscribe(() => {
      if (t) {
        clearTimeout(t);
      }
      t = setTimeout(() => {
        refreshThread();
      }, 1000);
    });
  }, [refreshThread]);

  type FieldType = {
    message: string;
    relayUrl: string;
  };

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    let reply: { reply: SignedReply; relay?: string } | void = undefined;
    if (matchJWS.test(values.message)) {
      await client
        .appendThread(values.message as SignedReply, threadId)
        .catch((e) => {
          console.error(e);
        });
      reply = { reply: values.message as SignedReply };
    }
    if (!reply) {
      reply = await client
        .replyToThread(threadId, values.message, {
          selfSign: false,
          setMyRelay:
            values.relayUrl !== threadInfo?.myRelay
              ? values.relayUrl
              : undefined,
        })
        .catch((e) => console.error(e));
    }
    if (reply) {
      const jws = parseJWSSync(reply.reply);
      const msg = await client.decryptMessage(jws.header.re, reply.reply);

      setSearachParams((search) => {
        search.set("expandMessage", msg.messageId);
        return search;
      });
      form.resetFields();
      await refreshThread();
      if (reply.relay) {
        app.notification.info({
          message: "Relay",
          description: `Sending message to relay: ${reply.relay}`,
        });
        await fetch(reply.relay, {
          method: "POST",
          body: reply.reply,
        }).catch(console.error);
      }
    }
  };

  const messageView = React.useRef<HTMLDivElement>(null);

  const numMessages = thread.length;
  React.useEffect(() => {
    // Scroll to the bottom on the first render, and when the number of messages changes.
    if (numMessages) {
      messageView.current?.scrollTo({
        top: messageView.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [numMessages]);

  const newRelayUrl = Form.useWatch("relayUrl", form);
  return (
    <Flex
      vertical
      align="stretch"
      gap="small"
      style={{ width: "100%", height: "100%" }}
    >
      <Flex
        vertical
        ref={messageView}
        align="stretch"
        gap="xsmall"
        style={{ width: "100%", height: "100%", overflowY: "auto" }}
      >
        {threadInfo &&
          thread.map((message) => (
            <MessageCard
              threadInfo={threadInfo}
              key={message.messageId}
              message={message}
            />
          ))}
      </Flex>

      <div style={{ flex: 1, flexGrow: 1 }}></div>
      {newRelayUrl && newRelayUrl !== threadInfo?.myRelay && (
        <Alert
          message="Updating Relay"
          description={`The next message will update your relay to ${newRelayUrl}`}
          type="info"
          showIcon
        />
      )}

      <Form onFinish={onFinish} form={form}>
        <Card
          size="small"
          title={
            <Typography.Text>
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: myColor }}
                size="small"
              />
              {threadInfo?.myNickname ?? ""}
            </Typography.Text>
          }
        >
          <Form.Item<FieldType>
            name="message"
            label="Message"
            rules={[{ required: true }]}
          >
            <Space.Compact block>
              <Input
                name="message"
                id="message"
                addonBefore={
                  <RelaySetupCascader relayUrl={threadInfo?.myRelay || ""} />
                }
                defaultValue=""
              />
              <Button type="primary" htmlType="submit">
                <SendOutlined />
              </Button>
            </Space.Compact>
          </Form.Item>
        </Card>
      </Form>
    </Flex>
  );
}

function MessageCard({
  message,
  threadInfo,
}: {
  message: ThreadMessage | MissingMessage;
  threadInfo: ThreadInfo;
}) {
  const [searchParams, setSearachParams] = useSearchParams();
  const expandMessage = searchParams.get("expandMessage") === message.messageId;
  const color = message.from === threadInfo?.myNickname ? myColor : theirColor;

  return (
    <Card
      key={message.messageId}
      title={
        <>
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: color }}
            size="small"
          />{" "}
          {expandMessage ? message.fromThumbprint : message.from}
        </>
      }
      extra={
        <>
          <label>
            <Switch
              checked={expandMessage}
              onChange={(v) =>
                setSearachParams((search) => {
                  if (v) {
                    search.set("expandMessage", message.messageId);
                  } else {
                    search.delete("expandMessage");
                  }
                  return search;
                })
              }
            />{" "}
            Show Details
          </label>
        </>
      }
      size="small"
    >
      {new Date(message.iat * 1000).toLocaleString()}:{" "}
      {!expandMessage && message.message}
      {expandMessage && (
        <Typography.Paragraph
          code
          copyable={{
            format: "text/plain",
            onCopy: () => {
              window.cypressCopyText = message.original;
            },
          }}
        >
          {message.original}
        </Typography.Paragraph>
      )}
      {expandMessage && message.original && (
        <Typography.Text code style={{ whiteSpace: "pre" }}>
          {JSON.stringify({ ...message, original: undefined }, null, 2)}
        </Typography.Text>
      )}
    </Card>
  );
}
