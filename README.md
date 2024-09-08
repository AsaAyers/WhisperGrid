# Whisper Grid

WhisperGrid is an off-the-grid compatible encrypted conversation manager.

At its core is a small client that can generate and secure a set of keys.
There is no central authentication, so any two clients can communicate directly.
Communication between clients uses JSON Web Tokens. JWTs (JSON Web Tokens) are
base64url-encoded data structures used to securely transmit information between
two parties The primary test in this project involves characters Alice and Bob
copying and pasting messages back and forth.

The web interface for WhisperGrid holds one of these clients and does all the
work inside your browser. Your identity key is always encrypted at rest. When
you create your identity, you must provide a password, which is used to encrypt
your key. The encrypted key is stored locally in your browser, and you may also
have the option to send a copy to a WhisperGrid Relay.

In this document I'd like to provide enough technical detail to answer important
questions about how the system works. I aim to make the whole document
understandable even if you aren't familiar with the specifics of how some pieces
work.

# Why off-the-grid compatible?

Off-the-grid compatible is a more fitting description than federated protocol,
as it emphasizes the system’s independence from central authorities. Most
secure chat systems today have a central company managing the keys for you. This
also means that your communication can be monitored or shut off by a central
authority at any time. While these entities are generally considered
trustworthy, central control still raises concerns, especially regarding
political identity or ideology.

There are legitimate reasons people may need to communicate with additional
privacy. For instance, a domestic violence situation where your abuser tries to
monitor all communication. Since WhisperGrid's core is separate from the
Progressive Web App, it can be customized for specific use cases A website to
help DV survivors can offer secure communication that isn't tied to your email
or phone number. These systems wouldn't be tied to email or phone numbers and
could be hosted in a way that draws less attention from abusers.

By keeping the keys local and by making the protocol open, my intention is to
create something that cannot be taken away from you. As long as you've
downloaded a backup of your key, you can run your own server and keep the same
keys.

# Identity

At account creation an Elliptic Curve Digital Signature Algorithm (ECDSA P-384)
`Identity Key` is created and will be used to sign all communications. The
thumbprints look like this `id-Bx1OEIG12LWSSKe47HmqCw4deowlEtIcvVxP0nBoLSQ`.
This is equivalent of a username in the system, and you'll be able to supply a
nickname for yourself to use in conversations.

Your password is used to encrypt a backup of your key. There is no "forgot
password" system here.

ECDSA keys can be used to sign things, but not encrypt. So an Elliptice Curve
Diffie Helman (ECDH P-384) `Storage Key` is also generated and encrypted under
the same password. Each conversation will get its own ECDH `Conversation Key`.
Backups of your `Conversation Key`s are encrypted using your `Storage Key`.

```
storedIdentity = AESEncrypt({
  identityBackup: ECDSAkey,
  storageBackup: ECDHKey
}, PBKDF2(chosenPassword))
```

Now that we’ve established how `Identity Keys` and `Storage Keys` work, let’s see
how communication begins with an `Invitation`.

# Invitation

Conversations start by creating an `Invitation`. This invitation is signed with
your `Identity Key` and holds the public portion of a new `Conversation Key`.
The private portion of your key is encrypted under your `Storage Key`. The
invite must contain your nickname, and may contain an optional note. To look
inside an invitation paste it into https://jwt.io/. Nothing in the invitation is
secret. You can use the same website to look at encrypted messages, but their
payload is encrypted, so you'll only be able to look at the headers.

Everything the core client produces is a JWT, so you can copy your invite and
send it to a friend. If you're using a WhisperGrid Relay, then the invite can be
posted to the relay and in return, you get a link you can send.

# Reply to invite

The first reply is special because it needs to do key negotiation. A
`ReplyToInvite` includes the public `Identity Key` in `header.jwk` and the
public `Conversation Key` in `payload.epk`. It also includes the user's nickname
inside `payload.nickname`. Following messages won't have any of these values,
and will instead just hold a `payload.message` and some conversation metadata.

- Once you receive the invite in your WhisperGrid client, whether pasted or
  downloaded from a link, you will:
  1. See the sender's nickname and possibly a note.
  2. Choose your own nickname.
  3. Write a message.

Once you have written your message, the client can generate a new `Conversation Key`.
Again, the private portion is encrypted under the `Storage Key`, and the public
portion is attached to the reply, similar to how it attaches to an `Invite`.
Both sides combine their `Conversation Key`s to derive the shared AES encryption
key for securing future messages.

```
replyToInvite = JWTEncrypt({
  header: {
    jwk: IdentityKey.public
    invite: Thumbprint<"ECDH">;
    epk: myKey.public
    ...
  },
  payload: AESEncrypt({
    nickname: string;
    message: string;
    ...
  }, deriveSharedSecret(myKey.private, theirKey.public))
})
```

This `ReplyToInvite` is an encrypted JSON Web Token, that you can copy/paste, or
post to a Relay if one is available.

# Reply

So far, we’ve discussed two types of messages: `Invites` and `ReplyToInvite`.
Both are self-signed, meaning the header contains a `jwk` key that holds the
public portion of your identity key. When you paste these into jwt.io, it can
verify the signature using `header.jwk`.

From here on, `Reply` messages are signed, but they are not self-signed. They're
smaller, because they don't contain the `jwk`, and now the receiving end has to
already have your public key in order to verify the signature.

Again, these are JSON Web Tokens that you can copy/paste, or post to a Relay if
one is available.

# Progressive Web App

The WhisperGrid PWA holds a copy of the client and implements the user interface
for you to interact with it. It can be deployed to a static website, and you can
even right click the site and download to an HTML file on your machine. This is
a bit more of the off-the-grid element, you can run the core client wherever you
want.

# WhisperGrid Relay

This is the most convenient way to use WhisperGrid. A Relay server holds a copy
of the Progressive Web App and an API for storing and sending messages through
the relay.

The server portion of this project uses an OpenAPI 3.0.0 schema to define its
capabilities. From this, a TypeScript client is generated for use in the
Progressive Web App. The Express server validates and implements the schema, and
documentation is automatically generated from the schema. This helps keep
everything in sync.

The Relay is necessary for the Progressive Web App to enable background
notifications. The PWA will use the Push API to get a subscription from your
browser. That subscription can be sent to the Relay and associated with your
conversations. When the Relay receives messages for you, it can send you a
notification. This is not possible in any other mode. You cannot get background
notifications if it's deployed to a static website or if you're running it from
a file locally.

Everything the core client produces is encrypted at rest and in transit. So the
Relay can see the thumbprint of all `Identity Key`s in any `Invitation` or
`Thread` it manages. Authentication is simply managed by signing a challenge the
server provides with your key.

The Relay isn't holding a username or a password for you. It doesn't even need a
record of what accounts do or don't exist, because an account is simply an ECDSA
key. Encrypted backups are not simply stored under the thumbprint of the key. I
think having such a simple direct map of thumbprint-to-encrypted-backup could
make it easier to brute force the backup. Now I'm less sure about that, but the
decision has already been made. When sending a backup to the server, you're also
asked for an Identifier for the key. Any identifier you type is hashed with your
password to produce a unique key, under which the backup will be stored. When
logging in, you provide the same identity password, they hash to the same value,
and that is used to retrieve the backup.

# Summary

- `Identity Key`
  - Its fingerprint is like a username
    - You can supply nicknames as part of an `Invitation` or `ReplyToInvitation`
  - Used to sign every `Invitation` and every message
- `Storage Key`
  - Is used to store `Conversation Key`s
- Your password
  - Is used to encrypt your `Identity Key` and `Storage Key`
- WhisperGrid Client
  - Manages the cryptography and conversations
  - Every message in a conversation has an ID, so this tracks if messages are out of order or missing.
- WhisperGrid PWA
  - A web application for interacting with a WhisperGrid client
- WhisperGrid Relay
  - Hosts a WhisperGrid PWA
  - Can hold invites and messages
  - Can send background notifications to PWA
    - This is not yet implemented at the time of this writing.

# Next Steps

The prototype can store messages on ntfy.sh, but they expire after 12 hours and
can't push messages to the PWA. It's a useful prototype, but the WhisperGrid
Relay needs to get implemented next.

I have a schema, but not everything is implemented yet. Authentication and
invites work, but not full conversations at the time of this writing. After I
get full conversations working and they won't expire, I'll add WebPush to the
Relay+PWA.
