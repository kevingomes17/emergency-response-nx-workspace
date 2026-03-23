// Stub for react-native/Libraries/Utilities/binaryToBase64 (web build)
export default function binaryToBase64(data) {
  if (typeof btoa === 'function') {
    return btoa(String.fromCharCode(...new Uint8Array(data)));
  }
  return Buffer.from(data).toString('base64');
}
