# Whisper Grid

I think we need a way to re-decentralize our communication. Everyone wants a "new TikTok", but I'm not sure that can be achieved in a single step. Lets start with a decentralized messaging and build on that. I think if we start with good solid principals, this can be built up into something quite nice. 

Please try not to "What about X" too early. This document aims to build everything from the ground up, so there are a lot of concepts to introduce and details to work out later. I'm going to skip over some details about encryption and JWT initially. I assume a general knowledge of the ideas around public/private key encryption, and we can think of JWT as a way to store the data that's easy to copy/paste. 

# Decentralization 

Whisper Grid defines a lightweight protocol that can be carried over HTTPS for instant delivery, but is also encoded as JWT tokens that can be transported manually. A conversation is secure at rest as a flat text file full of JWT tokens and can be read with one of the participant's keys. Metadata and conversation keys are encrypted to yourself so that everything can be re-opened with your key.

There is no centralized account authority. Your root identity is simply a public/private key pair. No one can spam you, because all conversations have to start with an invitation. The invitation is a JWT token signed by you, with directions on where/how you'd like responses to be delivered. 

You'll have a client that holds your keys, sends and receives messages. Relays generally need to be available from the internet and can hold messages for you. 

Because this is all based on keys, we can have public messages get signed and published to Relays. In that way, the relay becomes something of a social hub, but your identity can move with you. You're verifiably the same account, no matter which Relay on the internet you post to. 

# Alice and Bob


Alice wants to use Whisper Grid to chat with Bob. She will need (1) a whisper-grid client and (2) a whisper-grid relay. The client will generate and hold the keys where the relay can only hold JWT-encoded `invitations` and `messages`. Often these will be bundled together, but a `relay` needs to be able to be accessed remotely, it's your inbox. You won't have an email address, you'll invite someone to join your conversation at some specific URL.

Alice registers an account with whisper-grid.example where she has to complete an email loop to verify her identity. She can have it generate a new key, or sign a challenge with her private key. If she uses an existing key, then this service is NOT her client, but IS a relay. The client needs to have your private key in order to encrypt or decrypt your messages.

Bob also wants to use Whisper Grid, but he'd prefer to host things himself. He already owns bob.example, so he sets up web hosting on a server somewhere and runs an open source Client+Grid. It may be exactly the same software as whisper-grid.example, it's just hosted at whisper-grid.bob.example.


At this point Alice and Bob have generated keys out of nowhere and cannot yet communicate with each other. Alice creates an invitation, signed by her client with her relay's return address (optional). If it contains a return address, it also needs to include the identity of the Relay's key. `invitation: {fingerprint}, return: whisper-grid.example.com/{uuid}, jwk: {public key}, returnJwk: {public key}`.  It is then uploaded and becomes available at `whisper-grid.example.com/{uuid}`. Now Alice can either send Bob that link, or send him the file directly. 

When Bob pastes the link or invitation into his client, it will fetch or read the invitation. Trust is based on where he got the link from. The first time Bob accepts an invitation from Alice, the system employs a Trust On First Use (TOFU) mechanism, accepting Alice's public key as genuine. Since anyone can create an account claiming to be Alice, this initial acceptance is crucial for establishing a secure channel. If he chooses to respond, then it transitions to a chat interface where he can type a response. That first response is going to need to establish his identity key and an initial key for the conversation and is also encoded as a JWT. He may have his client HTTP POST it to the return address or shown to him, to transport back to Alice. If all relays are online and operational, this this acts like a chat interface. If a relay if offline, then the encrypted message is just held until it's able to be delivered. Bob's response will also include his relay address.

While having a conversation, you can choose to change which relay is being used. Maybe Alice decides that she wants a custom domain too. So she prepares whisper-grid.alice.example as a new relay. In her client, she can set that as one of her relays and can choose to add that relay to the conversation and/or remove the old relay. Your single client might pull messages from multiple relays, even within the same conversation. This helps with decentralization, because your identity is portable.

# Progressive Web App

A PWA can be "installed" like an app, but it doesn't have to go through an app store. It can even send receive push notifications. The base Whisper Grid client should be a PWA chat-app. It should use the Web Cryptography API, so your identity can be generated on-device and then backed up with a password. 

Invitations and messages are just JWTs, so conversations can be stored in a list. Each message will have a unique ID and will reference their parent message. Similar to git, this forms a block chain across the messages. It will also need to hold a counter so that if a message in the chain is missing, we know exactly where it belongs and can inject it into the right spot if it arrives out of order. The backend should send raw JWTs to the frontend and have them decrypted as locally as possible. To further enhance security transparently, the system includes automatic key rotation within ongoing conversations. This process is linked with the concept of message expiration; for instance, if messages are set to expire after 7 days, the corresponding keys will be rotated and old keys deleted accordingly. This ensures messages remain secure and private, adhering to user-defined retention policies without requiring manual action.




# Identity verification and key recovery

The client needs to follow modern best practices for holding on to your identity keys. Your keys should be encrypted at rest with a password, and the client may implement things like multi-factor authentication. You just have to trust your client to some degree, and todays alternatives we trust the host with everything. 




# Visual Identity Hash (addon/optional/maybe)

Separate from the communication protocol, I think it would be helpful to have a deterministic process for generating an image based on a string of characters. The core idea is to take the fingerprint from your public key and then consume it bit-by-bit as if it were a random number generator. This could be used as a base avatar and/or revealed when you hover over a chosen profile photo. Because the image is based on your identity's fingerprint, someone would have to generate a key whose fingerprint is similar enough to your to produce a similar enough image to fool someone. And since it's just a hash of a public key, it doesn't reveal anything about the user.

I think this can be broken down into choosing from a random set of colors, shapes, positions, sizes, etc. Whatever it generates may not look like anything in particular, but you should be able to easily distinguish between most of the output images at a glance. 

This seems potentially risky, because someone could set their profile photo to your generated image. It might also need to be a tool that you could paste someone's identifier into and verify. The main place you should see it is in your client, where we're trusting that it's hashing correctly. No one likes to verify long strings of random digits. 

If you change 1 bit of input on a cryptographically secure hash, then it should on average, change half the output bits. I'm looking for something similar so that even if someone generated identities over and over again to try to get a fingerprint collision, they shouldn't be able to produce a fingerprint that's close that also generates a similar image.