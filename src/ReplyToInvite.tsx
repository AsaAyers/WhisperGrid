import React from "react";
import { Alert, Button, Card, Descriptions, Flex, Form, FormProps, Input, List, Space, Typography } from "antd";
import { Thumbprint, getJWKthumbprint, parseJWS } from "./client/utils";
import { Invitation, SignedInvitation, SignedReply } from "./client/types";
import TextArea from "antd/es/input/TextArea";
import { useClient } from "./ClientProvider";
import { SendOutlined } from "@ant-design/icons";
import { MessageCard } from "./ThreadView";

export function ReplyToInvite(): React.ReactNode {
  const client = useClient();
  const [form] = Form.useForm<FieldType>();
  type FieldType = {
    invitationString?: SignedInvitation;
    nickname?: string;
    message?: string;
  };
  const invitationString = Form.useWatch('invitationString', form);
  const [invitation, setInvitation] = React.useState<Invitation | null>(null);
  const [thumbprint, setThumbprint] = React.useState<Thumbprint | null>(null);
  React.useMemo(() => {
    if (invitationString) {
      parseJWS<Invitation>(invitationString).catch(() => {
        // Ignore parsing errors and reset the object
        return null;
      }).then(async (i) => {
        const thumbprint = i ? await getJWKthumbprint(i.payload.epk) : null;
        setThumbprint(thumbprint)
        setInvitation(i)
      });
    }
  }, [invitationString]);

  const [reply, setReply] = React.useState<SignedReply | null>(null);
  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    const reply = await client.replyToInvitation(values.invitationString!, values.message!, values.nickname!);
    setReply(reply);
  };
  return (
    <Form
      form={form}
      name="reply-to-invite"
      // labelCol={{ span: 8 }}
      disabled={reply != null}
      // wrapperCol={{ span: 16 }}
      // style={{ maxWidth: 600 }}
      initialValues={{}}
      onFinish={onFinish}
      // onFinishFailed={onFinishFailed}
      autoComplete="off"
    >
      <Flex vertical gap="small" style={{ maxWidth: 600 }}>
        <List
          size="small"
          header={<Typography.Title>
            Reply to invitation
          </Typography.Title>}
          bordered
          dataSource={['invitation']}
          renderItem={() => (
            <Card
              size="small"
              title="Invitation"
            >
              <Form.Item<FieldType>
                name="invitationString"
                rules={[{ required: true, message: 'Please paste an invitation generated by Whisper Grid' }]}
              >
                <TextArea cols={600} rows={10} />
              </Form.Item>
              {invitation && (
                <Descriptions title="Invitation Data" layout="vertical" items={[
                  { label: 'Public Key', children: thumbprint, key: '' },
                  { label: 'Nickname', children: invitation.payload.nickname, key: 'nickname' },
                  { label: 'Note', children: invitation.payload.note, key: 'note' },
                ]} />
              )}
            </Card>

          )} />

        {reply && thumbprint && (
          <>
            <MessageCard message={reply} thumbprint={thumbprint} decrypt={false} />
            <Alert message="Message encrypted, copy it from above" type="success" />
          </>
        )}
        <Card>
          <Form.Item<FieldType>
            label="Nickname"
            name="nickname"
            rules={[{ required: true, message: 'What nickname would like to use in your conversation?' }]}
          >
            <Input disabled={invitation == null || reply != null} />
          </Form.Item>
          <Form.Item<FieldType>
            name="message"
            label="Message"
            rules={[{ required: true }]}
          >
            <Space.Compact block>
              <Input defaultValue=""
                disabled={invitation == null || reply != null} />
              <Button type="primary" htmlType="submit"
                disabled={invitation == null || reply != null} >
                <SendOutlined />
              </Button>
            </Space.Compact>
          </Form.Item>
        </Card>
      </Flex>
    </Form>
  );
}
