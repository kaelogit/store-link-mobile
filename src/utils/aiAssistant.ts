import { Alert } from 'react-native';

/**
 * 🏰 STORELINK AI ASSISTANT v1.2 (Pure Build)
 * Audited: Section II Asset Registry Enhancement & Lane Cycling.
 */

const AI_KEYS = [
  'gXKUgq9Wc55xBBPpGLy4KqjN', '5Kf8P1MsoiHZ8NqMesVhd71c', 'QGoei3ybgL6z51wGidcn2ACo',
  'uFLJSxzGnkYkst9LCZur5yw6', 'WK7pqX53JQYBNYX8iB4dB39C', 'mPWU1r1nxfLKKMMXP5yE7ULf',
  'heHqS6C4to2pX4rpMj8xkjti', 'pthq2buu4xFsiJa8k3AeMD23', '6zpYfzAbdN92izcKSM2Xj2Vt',
  'DKbeLTXEjpNbWte8hCjuVNCK', '5fv7KdZsbTxKwQffudo6CfsH'
];

/**
 * 🎨 BACKGROUND REMOVAL (Studio Logic)
 * Automatically strips backgrounds to create high-velocity showroom assets.
 */
export const removeBackgroundAI = async (imageUri: string): Promise<string | null> => {
  // 🔄 Cycle through 11 Processing Channels
  for (let i = 0; i < AI_KEYS.length; i++) {
    try {
      const formData = new FormData();
      
      // 🛡️ Asset Preparation
      // @ts-ignore
      formData.append('image_file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'drop_upload.jpg',
      });
      formData.append('size', 'auto');

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': AI_KEYS[i] },
        body: formData,
      });

      // ✅ SUCCESS: Process Blob
      if (response.status === 200) {
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data);
          };
          reader.onerror = (e) => reject(e);
        });
      }

      // ⚠️ LANE FULL: Move to next key
      if (response.status === 402 || response.status === 429) {
        console.warn(`Channel ${i + 1} exhausted. Re-routing...`);
        continue; 
      }

      // 🛑 FATAL: Log error but attempt next key
      const errorMsg = await response.text();
      console.error(`AI Channel ${i} Error:`, errorMsg);

    } catch (error) {
      console.error(`Network Error in AI Channel ${i}:`, error);
    }
  }

  // 🛡️ FAIL-SOFT: Revert to original asset if all channels are offline
  console.warn("StoreLink AI: All processing channels currently busy.");
  return null;
};