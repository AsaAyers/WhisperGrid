import React from "react";
import { Alert, Avatar, Button, Card, Flex, Form, FormProps, Input, Popover, Space, Timeline, Typography } from "antd";
import { DecryptedMessageType } from "./client";
import { MessageOutlined, SendOutlined, ShareAltOutlined, UserOutlined } from "@ant-design/icons";
import { invariant } from "./client/utils";
import { useParams } from "react-router-dom";
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
  const threadId = useParams<{ thumbprint: ThreadID; }>().thumbprint
  invariant(threadId, "ThreadID is required");
  const [threadInfo, setThreadInfo] = React.useState<{
    myNickname: string,
    theirNickname: string,
  } | null>(null);

  const [thread, setThread] = React.useState<Array<ThreadMessage | MissingMessage>>([]);
  React.useEffect(() => {
    const originalMessages = client.getEncryptedThread(threadId) ?? []
    let cancel = false

    const promises = Promise.all(originalMessages.map(async (original): Promise<ThreadMessage | MissingMessage> => {
      invariant(!cancel, "Cancelled")
      if (typeof original === 'object') {
        return {
          ...original,
          iat: 0,
        }
      }
      const decrypted = await client.decryptMessage(threadId, original)
      return {
        ...decrypted,
        original
      }
    }))

    promises.then(async (decryptedMessages) => {
      const threadInfo = await client.getThreadInfo(threadId)
      if (!cancel) {
        setThreadInfo(threadInfo)
      }
      if (!cancel) {
        return setThread(decryptedMessages)
      }
    })

    return () => {
      cancel = true
    }
  }, [threadId])

  type FieldType = {
    message: string;
  };

  const [newReply, setNewReply] = React.useState<SignedReply | null>(null);

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
      if (reply) {
        setNewReply(reply)
      }
    }
    if (reply) {
      form.resetFields()
      const originalMessages = client.getEncryptedThread(threadId) ?? []
      const m = originalMessages[originalMessages.length - 1]
      if (typeof m === 'string') {
        const decrypted = await client.decryptMessage(threadId, m)
        setThread((thread) => thread.concat({
          ...decrypted,
          original: reply
        }))
      } else {

        setThread((thread) => thread.concat({
          iat: 0,
          message: '(missing)',
          fromThumbprint: '(missing)',
          messageId: m.messageId,
          type: 'missing'
        }))
      }
    }
  }

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
            <Popover title="Message Info"
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

      {newReply && (
        < >
          <Typography.Paragraph
            code
            copyable={{
              format: 'text/plain',
              onCopy: () => {
                window.cypressCopyText = newReply
                setNewReply(null)
              }
            }} >
            {newReply}
          </Typography.Paragraph>
          <Typography.Link
            ellipsis
            href={`web+grid:/invitation/${threadId}#${newReply}`}
          >
            {`web+grid:/invitation/${threadId}#${newReply}`}
          </Typography.Link>
          <Alert message="Message encrypted, copy it from above" type="success" />
        </>
      )}


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
export function MessageCard({ message, threadId, decrypt = true, onCopy }: {
  message: SignedTransport,
  threadId: ThreadID;
  decrypt?: boolean
  onCopy?: () => void
}): React.ReactNode {
  const client = useClient()
  const [decryptedMessage, setDecryptedMessage] = React.useState<DecryptedMessageType | null>(null);
  const [showDecrypted, setShowDecrypted] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (decrypt) {
      client.decryptMessage(threadId, message).then((decrypted) => {
        setDecryptedMessage(decrypted);
      });
    }
  }, [decrypt, threadId, message]);


  return (
    <Card
      size="small"
      title={
        <>
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: myColor }}
            size="small" />
          {decryptedMessage?.from}
        </>
      }
      extra={[
        <Typography.Link key="encrypted" onClick={() => setShowDecrypted((s) => !s)}>
          {showDecrypted && decryptedMessage ? 'Show' : 'Hide'} Encrypted
        </Typography.Link>,
        <Typography.Link href={`web+grid:/thread/`} key="web+grid">
          web+grid
        </Typography.Link>
      ]}>


      {showDecrypted && decryptedMessage ? (
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
          {decryptedMessage.message}
        </Typography.Paragraph>
      ) : (
        <>
          <Typography.Paragraph
            code
            copyable={{
              format: 'text/plain',
              onCopy: () => {
                window.cypressCopyText = message
                onCopy?.()
              }
            }}
            ellipsis={{
              expandable: true, rows: 3
            }}>
            {message}
          </Typography.Paragraph>
        </>
      )}
    </Card>);
}
