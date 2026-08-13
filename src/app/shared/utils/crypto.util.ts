export const generateSHA256 = async (input: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};
