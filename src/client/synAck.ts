import { incMessageId } from "./index";

export type SynAckState = {
  syn: string | undefined;
  minAck: string | undefined;
  maxAck: string | undefined;
  missing: string[];
  windowSize: number;
};
export function synAck(
  id: { syn: string } | { ack: string },
  state: SynAckState
) {
  if ("syn" in id) {
    if (state.syn === undefined) {
      state.syn = id.syn;
    } else if (id.syn === incMessageId(state.syn)) {
      state.syn = id.syn;
    } else {
      throw new Error(
        `Syn out of order ${id.syn} - Expected: ${incMessageId(state.syn)}`
      );
    }
  } else {
    if (!state.minAck || !state.maxAck) {
      // initialize
      state.minAck = id.ack;
      state.maxAck = id.ack;
    } else if (id.ack === incMessageId(state.maxAck)) {
      // Next expected message (max)
      state.maxAck = id.ack;
      if (id.ack === incMessageId(state.minAck)) {
        // min/ax are in sync --- This is the ideal scenario
        state.minAck = id.ack;
      }
    } else if (id.ack === incMessageId(state.minAck)) {
      // Increment the minAck
      state.minAck = id.ack;
    } else if (id.ack <= state.minAck || id.ack === state.maxAck) {
      // Ignore duplicate
      return false;
    } else if (id.ack > state.maxAck) {
      const min = parseInt(state.minAck, 16);
      const ack = parseInt(id.ack, 16);

      if (ack - min >= state.windowSize) {
        throw new Error(
          `Missing ${ack - min} messages between ${state.minAck} and ${id.ack}`
        );
      }
      if (state.missing.length === 0) {
        for (let i = min + 1; i < ack; i++) {
          state.missing.push(i.toString(16));
        }
      }
      const i = state.missing.findIndex((m) => m === id.ack);
      if (i !== -1) {
        state.missing.splice(i, 1);
      }
      state.maxAck = id.ack;
    } else {
      throw new Error(
        `Ack out of order ${JSON.stringify(id)} ${JSON.stringify(state)}`
      );
    }
  }
  return true;
}
