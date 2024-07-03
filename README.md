Experimental decentralized communication using JWS

- Experimental - I'm not an expert, I may be doing things wrong
  - Project description and technical details at: https://gist.github.com/AsaAyers/2cce4de71d4e1eb972d3dc01715ab3a7
- Decentralized - I'm using the WebCrypto standard that's (probably) in the browser you're using.
  - There is no central authority. Generate a key in your browser and use it.
  - You can right-click and "Save As" on the app to save a local `.html` file. Opening that file will act like a new server, independent of asaayers.github.io/WhisperGrid
- Communication using JWS - The data passed back and forth is a signed JSON Web Token
  - You can copy/paste things from WhisperGrid into https://jwt.io to inspect what's inside.

There is no automated mechanism for sending a message to someone. The core
premise here is that I think there are times where we need communication and you
need to be in control of the keys. The easiest way to play with this is using 2
browsers. On one browser you generate an `invite`, then copy/paste it into the
other browser. In the other borwser, you choose a nickname and type a response.
That gets saved as a `reply` that you can copy and paste into the original
browser to decode. From there either side can write messages to copy back and
forth.

Here is a video from one of the automated tests.

https://github.com/AsaAyers/WhisperGrid/assets/324999/0ebeb15e-6016-4f55-b84a-2a7909840787

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
