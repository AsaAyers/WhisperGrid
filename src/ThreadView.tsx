import React from "react";
import { Avatar, Button, Card, Flex, Form, FormProps, Input, Popover, Space, Timeline, Typography } from "antd";
import { DecryptedMessageType } from "./client";
import { MessageOutlined, SendOutlined, ShareAltOutlined, UserOutlined } from "@ant-design/icons";
import { invariant, parseJWSSync } from "./client/utils";
import { useParams, useSearchParams } from "react-router-dom";
import { useClient } from "./ClientProvider";
import { SignedReply, SignedTransport } from "./client/types";
import { ThreadID } from "./client/GridStorage";

const matchJWS = /^([a-zA-Z0-9-_]+)(\.[a-zA-Z0-9-_]+){2}$/;
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
  const [form] = Form.useForm()
  const client = useClient();
  const { threadId } = useParams<{ threadId: ThreadID; }>()
  invariant(threadId, `ThreadID is required`);
  const [searchParams, setSearachParams] = useSearchParams()
  const [threadInfo, setThreadInfo] = React.useState<{
    myNickname: string,
    theirNickname: string,
  } | null>(null);

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
  }, [refreshThread])

  type FieldType = {
    message: string;
  };


  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    let reply: SignedReply | void = undefined
    if (matchJWS.test(values.message)) {
      await client.appendThread(values.message as SignedReply, threadId).catch(e => {
        console.error(e)
      })
      reply = values.message as SignedReply
    }
    if (!reply) {
      reply = await client.replyToThread(threadId, values.message, { selfSign: false }).catch(
        e => console.error(e)
      )
    }
    if (reply) {
      const jws = parseJWSSync(reply)
      const msg = await client.decryptMessage(jws.header.re, reply)

      setSearachParams((search) => {
        search.set('expandMessage', msg.messageId)
        return search
      })
      form.resetFields()
      const originalMessages = client.getEncryptedThread(threadId) ?? []
      const m = originalMessages[originalMessages.length - 1]
      if (typeof m === 'string') {
        await client.decryptMessage(threadId, m)
        await refreshThread()
      }
    }
  }

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
              open={message.messageId === expandMessage}
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
          label: `${message.from} ${new Date(message.iat).toLocaleString()}`,
          color: message.from === threadInfo?.myNickname ? myColor : theirColor,
          children: message.message,
        }))}
      />

      <div style={{ flex: 1, flexGrow: 1 }}></div>
      <Card size="small" title={
        <Typography.Text>
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: myColor }}
            size="small" />
          {threadInfo?.myNickname ?? ""}
        </Typography.Text>
      }>
        <Form onFinish={onFinish} form={form} >
          <Form.Item<FieldType>
            name="message"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Space.Compact block>
              <Input defaultValue="" />
              <Button type="primary" htmlType="submit">
                <SendOutlined />
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Card>
    </Flex >
  );
}