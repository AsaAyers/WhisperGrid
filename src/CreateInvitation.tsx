import React from "react";
import { Button, Card, Form, FormProps, Input } from "antd";
import { Client } from "./client";
import { getJWKthumbprint, parseJWS } from "./client/utils";
import { Invitation } from "./client/types";

export function CreateInvitation({ client, newInvitationThumbprint }: CreateInvitationProps) {
  type FieldType = {
    note?: string;
    nickname: string;
  };
  const [form] = Form.useForm<FieldType>();

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    const signedInvite = await client.createInvitation({
      note: values.note,
      nickname: values.nickname
    });
    const invite = await parseJWS<Invitation>(signedInvite);
    newInvitationThumbprint(await getJWKthumbprint(invite.payload.epk));
  };
  return (
    <Form form={form}

      onFinish={onFinish}
    >
      <Card
        actions={[
          <Button type="primary" htmlType="submit">
            Create Invitation
          </Button>
        ]}
      >

        <Form.Item<FieldType>
          label="Nickname"
          name="nickname"
          rules={[{ required: true, message: 'Your nickname in this conversation' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item<FieldType>
          label="Public Note"
          name="note"
        >
          <Input />
        </Form.Item>

      </Card>
    </Form>
  );
}
type CreateInvitationProps = {
  client: Client;
  newInvitationThumbprint: (invitation: string) => void;
};
