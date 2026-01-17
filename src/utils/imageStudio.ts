import * as ImageManipulator from 'expo-image-manipulator';

/**
 * 🏰 IMAGE STUDIO ENGINE v76.1 (Pure Build)
 * Audited: Section II 4:5 Cinematic Ratio & Studio Protocol.
 */

/**
 * 🎨 STUDIO ASSET HANDSHAKE
 * Processes raw images into standardized 4:5 Cinematic Assets.
 */
export const processStudioImage = async (uri: string) => {
  try {
    // 🛡️ 1. GEOMETRIC ALIGNMENT (Manifest Section II: 1.25 Ratio)
    // Forces the 4:5 Theater Standard (1080w x 1350h)
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        { 
          resize: { 
            width: 1080,
            height: 1350 
          } 
        }
      ],
      { 
        compress: 0.7, 
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );

    return result.uri;
  } catch (error) {
    // 🔄 FALLBACK
    console.error("Studio processing failed. Reverting to original asset:", error);
    return uri;
  }
};

/**
 * 🎞️ THUMBNAIL GENERATOR
 * High-velocity low-res assets for grid previews and mini-vortex nodes.
 */
export const generateVortexThumb = async (uri: string) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 300, height: 375 } }], // Minified 4:5
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    return uri;
  }
};