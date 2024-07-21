import React from "react";
import { useClient } from "./ClientProvider";
import { Button, Flex, Typography } from "antd";
import { useHref } from "react-router-dom";
import { PlusOutlined, SendOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";
import { CopyInvite } from "./DisplayInvite";
import { SignedInvitation } from "../client";
import { useResolved } from "./useResolved";

export function HomePage() {
  const client = useClient();
  const replyHref = useHref('/reply')
  const createHref = useHref('/create')
  const threads = useResolved(React.useMemo(() => client?.getThreads() ?? [], [client]))
  const threadHref = useHref('/thread/ABCDE')
  const settingsHref = useHref('/settings')

  const thumbprint = useResolved(React.useMemo(() => client?.getThumbprint(), [client]))

  return (
    <Flex vertical>
      <p>
        Whisper Grid is a decentralized messaging system.
      </p>
      <ul>
        <li>
          When you created your identity, you were given a thumbprint. This
          thumbprint is your identity on the grid.
          <Typography.Text
            copyable={{
              format: 'text/plain',
              onCopy() {
                window.cypressCopyText = thumbprint;
              }
            }}
            code
          >
            {thumbprint}
          </Typography.Text>
        </li>
        <li>
          This identity is stored in your machine&apos;s local storage. If you
          clear your local storage, you will lose your identity.  You can make a
          backup in <Typography.Link href={settingsHref}><SettingOutlined />
            Settings</Typography.Link>.
        </li>
      </ul>

      <Button href={createHref}><PlusOutlined /> Create Invitation</Button>
      <Typography.Text>
        Creating an invitation will give you a large block of text that you can
        send to someone else.  They&apos;ll need to paste it into the reply box
        on the <Typography.Link href={replyHref}>Reply</Typography.Link> page.
      </Typography.Text>

      <Button href={replyHref}><SendOutlined /> Reply to invite</Button>
      <Typography.Text>
        Replying to an invite will NOT send a message to the person who sent you
        the invite. It will allow you to sign a message that you can deliver to
        the person who sent you the invite. This is the decentralized part of
        Whisper Grid.
      </Typography.Text>

      <Typography.Text>
        Here is an example invite that you can use to test the system:
      </Typography.Text>
      <CopyInvite signedInvite={exampleInvite} />

      {threads && threads.length > 0 ? threads.map((key) => (
        <Button key={key} href={threadHref.replace('ABCDE', key)}>
          <UserOutlined /> thread {key}
        </Button>
      )) : (
        <Button disabled href={threadHref}>
          <UserOutlined /> thread ...
        </Button>
      )}

      <Typography.Text>
        After a conversation has been established through creating and replying
        to an invitation, a message may request to use a relay for convenience.
        If a Relay is active, then when you make a message it will be sent to
        the Relay.
      </Typography.Text>


    </Flex>
  );
}

const exampleInvite = "eyJhbGciOiJFUzM4NCIsImp3ayI6eyJjcnYiOiJQLTM4NCIsImV4dCI6dHJ1ZSwia2V5X29wcyI6WyJ2ZXJpZnkiXSwia3R5IjoiRUMiLCJ4IjoidFhtSFQ5aDJDMEg4dVlQVm1Fc3B3clhIOXQxNF9uMjBqcVF6dDVOcHczLWx2bmNmSXg4SU55d2xaNFo3dC1sQiIsInkiOiIwV0VmRmpzbGFPYXVjem1xbF84LWZiUTd6LXNlak9EM0U4WEY3UFJOX2kyYUxJOTk2elc4Y242Q0RaWkhOdktvIn0sImlhdCI6MTcyMDk2OTQwNiwic3ViIjoiZ3JpZC1pbnZpdGF0aW9uIn0.eyJtZXNzYWdlSWQiOiJhNzUyZWViZTBmMTA0IiwiZXBrIjp7ImNydiI6IlAtMzg0IiwiZXh0Ijp0cnVlLCJrZXlfb3BzIjpbXSwia3R5IjoiRUMiLCJ4IjoiSXk2THhmbGFWSkhnWnRlWFhCLS02elZscmhxdk1OLTJ4YndNQnpJTG96Rk13bUdmMEpsb1JHOGxvN05hTlhvcCIsInkiOiJuUndJNjdUbHB6WjBZLXNSMF8wa0NzcnRrRlNDM2lnaTBIbDhBZDNTbTBsZWlzUGdoZURfVWVZYnZpellIS0EtIn0sIm5vdGUiOiJFeGFtcGxlIEludml0ZSIsIm5pY2tuYW1lIjoiV2hpc3BlckdyaWQifQ.36ceJoFHgwqIR9mFWGW1O7PypxaHLqif4WgVw0yV1PxnAhNvAypLgn6XX57Y6qc9NY1rL899fxl5kaKOGUYr-gx9t2D_gpULaUw1Ha8zPV40G7085iJ9Zk6f6f3WKZx1" as SignedInvitation