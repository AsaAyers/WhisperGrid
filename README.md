Experimental decentralized communication using JWS

- Experimental - I'm not a security or crypto expert, I may be doing things wrong
- Decentralized - I'm using the WebCrypto standard that's (probably) in the browser you're using.
  - There is no central authority. Generate a key in your browser and use it.
  - You can right-click and "Save As" on the app to save a local `.html` file. Opening that file will act like a new server, independent of asaayers.github.io/WhisperGrid
  - `npx whispergrid` will give a command line interface to create and use a new identity
- Communication using JWS - The data passed back and forth is a signed JSON Web Token
  - You can copy/paste things from WhisperGrid into https://jwt.io to inspect what's inside.
  - Inside the encrypted message, you can establish a relay that messages are POST-ed to
    - This uses https://ntfy.sh/

The core premise here is that I think there are times where we need
communication and you need to be in control of the keys. The keys involved are
created on your machine, encrypted with your password, and stored locally.
Every message is encoded as a JWS, and either party's private key can verify and
decrypt the conversation.

Here is a video from one of the automated tests.

https://github.com/user-attachments/assets/5125c76e-a158-405a-b966-57c83a24898c

1. Alice creates a new identity protected with a password
2. Then creates an `invitation`, copies it, and expands it.
3. Alice logs out
4. Bob creates a new identity protected with a password
5. "Reply to invite" -> paste `invitation`, then fill in a nickname and message
   - I don't have "paste" working in the test, so the bot has to just type everything.
6. Copy the generated `reply` and logout
7. Alice logs in
8. On the invitation screen "Decrypt reply" -> paste `reply`
9. When the `reply` is verified, the UI changes into the chat-like view with the decrypted message

The test ends here, but Alice could type a reply and copy it. Then log in as Bob
and paste the reply into chat to decrypt it.

## Thread Setup

All threads start with an `invitation` that CAN NOT contain a Relay URL. It's a
signed JWT containing your `nickname`, optional `note`, a `messageId`, and your
public keys. For someone to reply to your message, they'll paste your invite to
verify and view it. Then they can write a message that MAY contain a Relay URL.
This message needs to be manually passed back to whoever created the invite.
This `replyToInvite` contains your `nickname`, `message`, optional `relay`, a
`messageId` ind your public keys.

`invitation` + `replyToInvitation` creates a secret key for encrypting messages.
Everything after that is a regular reply. The mechanics of re-keying the
conversation has not been implemented yet.

## src/client (target audience: Developers)

The `Client` generates or decrypts a set of keys using your password. It
manages your conversations through `invites` and `threads`. An `invite` declares
your nickname for the conversation, establishes a public key for sending a
message back to you, and then it signs the whole thing. When you reply to an
invite, you must set your nickname, and may set a relay along with your message.

This handles all of the conversation management, but does NOT transport messages
anywhere. It tracks the relays to use, but it doesn't actually send the
messages anywhere.

## src/browser (target audience: Anyone)

https://asaayers.github.io/WhisperGrid/

This is the React-based web-application demonstrationg the client. It doesn't
have any backend, your keys are stored in your browser's Local Storage. The
settings page also allows you to export a password-encrypted backup.

It uses the client to manage the conversation, and if a conversation lists a
relay, it will `HTTP POST` the message to the relay. The user interface only
allows selecting a random topic from ntfy.sh, but it should be able to work with
a private server.

## src/cli (target audience: Developers)

```
npx whispergrid
```

This is a command-line wrapper around the Client. It can do everything the web
app can. When you view a thread it fetches from the relay, but does not listen
for updates. Here is an example of the main menu:

```
? What would you like to do?
  1) Create Invitation
  2) View Invitation: id-VTa-Fi4vZE2msYCINxuTTs7RzfMFqlKphd3U07WtWFk
  3) Reply to Invitation
  4) View Thread: 604049393b6e3bd0c92f4f3567f8dd3c31e566c9c83473913bed0bc260911a8e
  5) Exit
```
