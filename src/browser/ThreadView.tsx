/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Alert, Avatar, Button, Card, Flex, Form, FormProps, Input, Popover, Space, Timeline, Typography, App } from "antd";
import { DecryptedMessageType } from "../client";
import { MessageOutlined, SendOutlined, ShareAltOutlined, UserOutlined } from "@ant-design/icons";
import { invariant, parseJWSSync } from "../client/utils";
import { useParams, useSearchParams } from "react-router-dom";
import { useClient } from "./ClientProvider";
import { SignedReply, SignedTransport } from "../client/types";
import { ThreadID } from "../client/GridStorage";
import { RelaySetupCascader } from "./ntfy-relay";

export const matchJWS = /^([a-zA-Z0-9-_]+)(\.[a-zA-Z0-9-_]+){2}$/;
const myColor = '#87d068';
const theirColor = '#108ee9';

type MissingMessage = {
  type: 'missing',
  messageId: string,
  original?: undefined,
  from?: undefined,
  iat: number,
  message?: string
  fromThumbprint?: string
}
type ThreadMessage = DecryptedMessageType & {
  original: SignedTransport
}

export function ThreadView(): React.ReactNode {
  const [form] = Form.useForm<FieldType>()
  const client = useClient();
  const { threadId } = useParams<{ threadId: ThreadID; }>()
  const app = App.useApp()
  invariant(threadId, `ThreadID is required`);
  const [searchParams, setSearachParams] = useSearchParams()
  const [threadInfo, setThreadInfo] = React.useState<
    | Awaited<ReturnType<typeof client.getThreadInfo>>
    | null>(null);

  const [thread, setThread] = React.useState<Array<ThreadMessage | MissingMessage>>([]);
  const refreshThread = React.useCallback(async () => {
    const originalMessages = client.getEncryptedThread(threadId) ?? []
    const decryptedMessages = await Promise.all(originalMessages.map(async (original): Promise<ThreadMessage | MissingMessage> => {
      const decrypted = await client.decryptMessage(threadId, original)
      return {
        ...decrypted,
        original
      }
    }))

    const threadInfo = await client.getThreadInfo(threadId)
    setThreadInfo(threadInfo)
    return setThread(decryptedMessages)

  }, [threadId])

  React.useEffect(() => {
    refreshThread()
    let t: ReturnType<typeof setTimeout>
    client.subscribe(() => {
      if (t) {
        clearTimeout(t)
      }
      t = setTimeout(() => {
        refreshThread()
      }, 1000)
    })
  }, [refreshThread])

  type FieldType = {
    message: string;
    relayUrl: string
  };

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    let reply: { reply: SignedReply, relay?: string } | void = undefined
    if (matchJWS.test(values.message)) {
      await client.appendThread(values.message as SignedReply, threadId).catch(e => {
        console.error(e)
      })
      reply = { reply: values.message as SignedReply }
    }
    if (!reply) {
      reply = await client.replyToThread(threadId, values.message, {
        selfSign: false,
        setMyRelay: values.relayUrl !== threadInfo?.myRelay
          ? values.relayUrl
          : undefined

      }).catch(
        e => console.error(e)
      )
    }
    if (reply) {
      const jws = parseJWSSync(reply.reply)
      const msg = await client.decryptMessage(jws.header.re, reply.reply)

      setSearachParams((search) => {
        search.set('expandMessage', msg.messageId)
        return search
      })
      form.resetFields()
      await refreshThread()
      if (reply.relay) {
        app.notification.info({
          message: 'Relay',
          description: `Sending message to relay: ${reply.relay}`
        })
        await fetch(reply.relay, {
          method: 'POST',
          body: reply.reply
        }).catch(console.error)
      }
    }
  }

  const newRelayUrl = Form.useWatch('relayUrl', form)
  const expandMessage = searchParams.get('expandMessage')
  return (
    <Flex
      vertical
      align="stretch"
      gap="small"
      style={{ width: '100%', height: '100%' }}>
      <Timeline
        mode="left"
        items={thread.map((message) => ({
          dot: (
            <Popover
              title="Message Info"
              trigger={message.messageId === expandMessage ? 'click' : 'hover'}
              open={message.messageId === expandMessage ? true : undefined}
              onOpenChange={(open) => {
                if (!open && message.messageId === expandMessage) {
                  setSearachParams(search => {
                    search.delete('expandMessage')
                    return search
                  })
                }
              }}
              content={(
                <Flex vertical gap="small" style={{ maxWidth: '90vw' }}>
                  <Typography.Text>
                    From {message.fromThumbprint}
                  </Typography.Text>

                  <Typography.Paragraph
                    code
                    copyable={{
                      format: 'text/plain',
                      onCopy: () => {
                        window.cypressCopyText = message.original
                      }
                    }}
                    ellipsis={{
                      expandable: true, rows: 3
                    }}>
                    {message.original}
                  </Typography.Paragraph>

                  {message.type === 'message' && message.relay && (
                    <Alert message="New Relay"
                      description={message.relay}
                      type="info" showIcon />
                  )}

                  <Typography.Link
                    ellipsis
                    href={`web+grid:/invitation/${threadId}#${message.original}`}
                  >
                    {`web+grid:/invitation/${threadId}#${message.original}`}
                  </Typography.Link>
                </Flex>
              )}
            >
              {message.type === 'invite' ? <ShareAltOutlined style={{ fontSize: '16px' }} /> : <MessageOutlined style={{ fontSize: '16px' }} />}
            </Popover>
          ),
          label: `${message.from} ${new Date(message.iat * 1000).toLocaleString()}`,
          color: message.from === threadInfo?.myNickname ? myColor : theirColor,
          children: message.message,
        }))}
      />

      <div style={{ flex: 1, flexGrow: 1 }}></div>
      {newRelayUrl && newRelayUrl !== threadInfo?.myRelay && (
        <Alert message="Updating Relay"
          description={`The next message will update your relay to ${newRelayUrl}`}
          type="info" showIcon />
      )}

      <Form onFinish={onFinish} form={form} >
        <Card
          size="small" title={
            <Typography.Text>
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: myColor }}
                size="small" />
              {threadInfo?.myNickname ?? ""}
            </Typography.Text>
          }>
          <Form.Item<FieldType>
            name="message"
            label='Message'
            rules={[{ required: true }]}
          >
            <Space.Compact block>
              <Input
                name="message"
                id="message"

                addonBefore={
                  <RelaySetupCascader relayUrl={threadInfo?.myRelay || ""} />
                }
                defaultValue="" />
              <Button type="primary" htmlType="submit">
                <SendOutlined />
              </Button>
            </Space.Compact>
          </Form.Item>
        </Card>
      </Form>
    </Flex >
  );
}

