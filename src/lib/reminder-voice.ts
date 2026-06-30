export function normalizeVoiceTranscript(transcript: string): string {
  return transcript.replace(/\s+/g, " ").trim();
}

export function appendVoiceTranscript(current: string, transcript: string): string {
  const clean = normalizeVoiceTranscript(transcript);
  if (!clean) return current;

  const normalized = clean.charAt(0).toUpperCase() + clean.slice(1);
  const trimmedCurrent = current.trimEnd();
  if (!trimmedCurrent) return normalized;

  const separator = /[.!?;:]$/.test(trimmedCurrent) ? " " : ". ";
  return `${trimmedCurrent}${separator}${normalized}`;
}
