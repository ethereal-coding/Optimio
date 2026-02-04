/**
 * Token Encryption for IndexedDB Storage
 * Uses Web Crypto API for AES-GCM encryption
 * Stores encryption key in sessionStorage (cleared when tab closes)
 */

const STORAGE_KEY = 'optimio_key';

/**
 * Generate or retrieve encryption key
 * The key is stored in sessionStorage for security (cleared on tab close)
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // Check if we have a stored key material in sessionStorage
  let keyMaterial = sessionStorage.getItem(STORAGE_KEY);
  
  if (!keyMaterial) {
    // Generate new random key material
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    keyMaterial = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(STORAGE_KEY, keyMaterial);
  }
  
  // Convert hex string back to buffer
  const keyBuffer = new Uint8Array(
    keyMaterial.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
  );
  
  // Import as CryptoKey
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data
 */
export async function encrypt(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    
    // Convert from base64
    const dataBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes)
    const iv = dataBuffer.slice(0, 12);
    const encrypted = dataBuffer.slice(12);
    
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Clear encryption key (call on sign out)
 */
export function clearEncryptionKey(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
