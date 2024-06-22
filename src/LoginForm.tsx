import React from "react";
import { Button, Flex, Form, FormProps, Input, Radio } from "antd";
import { Client } from "./client";
import { LocalGridStorage } from "./browser";

type FieldType = {
  mode: 'open'
  thumbprint: string;
  password: string;
} | {
  mode: 'create',
  password: string,
  confirmPassword: string,
}

type Props = {
  initializedClient: (client: Client) => void;
}

export function LoginForm({ initializedClient }: Props) {
  const [form] = Form.useForm<FieldType>();
  const mode = Form.useWatch('mode', form);

  const [storage] = React.useState(() => new LocalGridStorage())

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    let client
    if (values.mode === 'create') {
      client = await Client.generateClient(storage, values.password)
      localStorage.setItem("thumbprint", client.thumbprint)
    } else {
      client = await Client.loadClient(storage, values.thumbprint, values.password)
    }
    initializedClient(client)
  };
  const initialValues = React.useMemo(() => {
    const thumbprint = localStorage.getItem("thumbprint")
    if (thumbprint) {
      return {
        mode: 'open',
        thumbprint,
      }
    }
    return {
      mode: 'create',
    }
  }, [])

  React.useEffect(() => {
    const password = localStorage.getItem("unprotected-password-for-testing")
    if (password) {
      const thumbprint = localStorage.getItem("thumbprint")
      if (thumbprint && password) {
        onFinish({
          mode: 'open',
          thumbprint,
          password
        })
      }
    }
  }, [])


  return (
    <Flex
      vertical
      style={{
        padding: 24,
        margin: "auto",
        maxWidth: 800,
      }}
      gap="small">

      <p>
        Whisper grid is an experimental system for decentralized, end-to-end
        encrypted messaging. This demo only stores data in your own browser (localStorage).
      </p>
      <p>
        You can create a new identity, or unlock an existing one from a previous session.
      </p>

      <Form
        form={form}
        name="login"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
        initialValues={initialValues}
        onFinish={onFinish}
        // onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item<FieldType> name="mode" label="Radio">
          <Radio.Group>
            <Radio value="create">Create Identity</Radio>
            <Radio value="open">Open locally stored identity</Radio>
          </Radio.Group>
        </Form.Item>

        {mode === 'open' && (
          <Form.Item<FieldType>
            label="Thumbprint"
            name="thumbprint"
            rules={[{ required: true, message: 'Please input the stored thrumbprint to unlock (id-...)' }]}
          >
            <Input />
          </Form.Item>
        )}

        <Form.Item<FieldType>
          label="Password"
          name="password"
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password />
        </Form.Item>

        {mode === 'create' && (
          <Form.Item<FieldType>
            label="Password"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              {
                required: true,
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The new password that you entered do not match!'));
                },
              }),
            ]}>
            <Input.Password />
          </Form.Item>
        )}

        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button type="primary" htmlType="submit">
            {mode === "create" ? "Create" : "Unlock"}
          </Button>
        </Form.Item>
      </Form>
    </Flex >
  );
}
