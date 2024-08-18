import React from "react";
import { Button, Card, Form, FormProps, Input } from "antd";
import { getJWKthumbprint, parseJWS } from "../client/utils";
import { useClient } from "./ClientProvider";
import { useNavigate } from "react-router-dom";

export function CreateInvitation() {
  const client = useClient();
  const navigate = useNavigate();
  type FieldType = {
    note?: string;
    nickname: string;
  };
  const [form] = Form.useForm<FieldType>();

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    const signedInvite = await client.createInvitation({
      note: values.note,
      nickname: values.nickname,
    });
    const invite = await parseJWS(signedInvite);
    const thumbprint = await getJWKthumbprint(invite.payload.epk);
    navigate(`/invitation/${thumbprint}`);
  };
  return (
    <Form form={form} onFinish={onFinish}>
      <Card
        actions={[
          <Button key="create" type="primary" htmlType="submit">
            Create Invitation
          </Button>,
        ]}
      >
        <Form.Item<FieldType>
          label="Set My Nickname"
          name="nickname"
          rules={[
            { required: true, message: "Your nickname in this conversation" },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item<FieldType> label="Public Note" name="note">
          <Input />
        </Form.Item>
      </Card>
    </Form>
  );
}
