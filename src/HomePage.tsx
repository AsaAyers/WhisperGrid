import React from "react";
import { useClient } from "./ClientProvider";
import { Alert, Flex, Typography } from "antd";
import { Navigate, useSearchParams } from "react-router-dom";

export function HomePage() {
  const client = useClient();
  const [searchParams] = useSearchParams()
  const path = searchParams.get('path')
  return (
    <Flex vertical>
      <h1>Whisper Grid</h1>
      {path && (

        <Navigate to={path}
          replace
          relative="route"
        />
      )}
      <Typography.Text
        copyable={{
          format: 'text/plain',
          onCopy() {
            window.cypressCopyText = client.thumbprint;
          }
        }}
        code
      >
        {client.thumbprint}
      </Typography.Text>
      <Alert
        message="Warning"
        description="This is experimental and has not been evaluated for security. Do not use this for anything important."
        type="warning"
        showIcon />
      <p>
        Whisper Grid is a decentralized messaging system that uses a key stored
        in your browser to make sign and encrypt messages.
      </p>
    </Flex>
  );
}
