"use client";

export type MidiNoteCallback = (note: string) => void;

let midiAccess: MIDIAccess | null = null;
let noteCallback: MidiNoteCallback | null = null;

// MIDI note number to note name
function midiNoteToName(midiNote: number): string {
  const noteNames = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  ];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

function handleMidiMessage(event: MIDIMessageEvent) {
  if (!event.data) return;
  const status = event.data[0];
  const note = event.data[1];
  const velocity = event.data[2];
  // Note On (0x90) with velocity > 0
  if ((status & 0xf0) === 0x90 && velocity > 0) {
    const noteName = midiNoteToName(note);
    noteCallback?.(noteName);
  }
}

export async function initMidi(onNote: MidiNoteCallback): Promise<boolean> {
  noteCallback = onNote;
  try {
    if (!navigator.requestMIDIAccess) return false;
    midiAccess = await navigator.requestMIDIAccess();
    midiAccess.inputs.forEach((input) => {
      input.onmidimessage = handleMidiMessage;
    });
    // Listen for new devices
    midiAccess.onstatechange = () => {
      midiAccess?.inputs.forEach((input) => {
        input.onmidimessage = handleMidiMessage;
      });
    };
    return true;
  } catch {
    return false;
  }
}

export function stopMidi() {
  if (midiAccess) {
    midiAccess.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
  }
  noteCallback = null;
}

export function isMidiSupported(): boolean {
  return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
}
