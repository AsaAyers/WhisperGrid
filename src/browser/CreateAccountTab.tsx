import React from "react";
import {
  Alert,
  Button,
  Flex,
  Form,
  FormProps,
  Input,
  Switch,
} from "antd";
import { useClientSetup } from "./ClientProvider";
const unsupportedBrowser = !window?.crypto?.subtle;

export function CreateAccountTab({ challenge }: { challenge?: string }) {
  type CreateForm = {
    password: string;
    confirmPassword: string;
    backupToServer: boolean;
  }
  const [form] = Form.useForm<CreateForm>();
  const { generateClient } =
    useClientSetup();
  const onFinish: FormProps<CreateForm>["onFinish"] = async (values) => {
    console.log('CreateAccountTab', values)
    const client = await generateClient(values.password);
    const thumbprint = await client.getThumbprint();
    localStorage.setItem("thumbprint", thumbprint);
  };

  return (
    <Form
      form={form}
      name="login"
      disabled={unsupportedBrowser}
      onFinish={onFinish}
      // onFinishFailed={onFinishFailed}
      autoComplete="off"
    >

      <Flex vertical gap="small">
        <Alert type="info" message="Account Creation" description="Creating an account generates a private key, and then encrypts it using your chosen password." />


        <Form.Item<CreateForm>
          label="Password"
          name="password"
          rules={[{ required: true, message: "Please enter a password to protect your account" }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item<CreateForm>
          label="Confirm password"
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            {
              required: true,
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(
                    "The new password that you entered do not match!",
                  ),
                );
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>

        {challenge && (
          <Form.Item<CreateForm>
            name="backupToServer"
            label="Send password-protected backup to server"
            layout="horizontal"
          >
            <Switch />
          </Form.Item>
        )}

        <Form.Item<CreateForm>
          label="Store password-protected backup in localStorage in this browser"
          layout="horizontal"
        >
          <Switch defaultChecked disabled />
        </Form.Item>

        <Form.Item name="mode" >
          <Input type="hidden" value="create" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Create
        </Button>
      </Flex>
    </Form>
  )
}