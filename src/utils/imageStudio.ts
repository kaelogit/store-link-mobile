import * as ImageManipulator from 'expo-image-manipulator';

/**
 * 🏰 IMAGE STUDIO v78.0
 * Purpose: Prepares photos for the app by resizing and compressing them.
 * Logic: Uses a 4:5 aspect ratio to make sure products look great in the feed.
 * Benefit: Reduces file size to speed up loading and save user data.
 */

/**
 * 🎨 MAIN IMAGE PROCESSOR
 * Resizes photos to the app standard (1080x1350) for high quality.
 */
export const processStudioImage = async (uri: string) => {
  try {
    // 🛡️ IMAGE SIZING: 1080x1350 is the standard for vertical photos
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
        compress: 0.8, // Balanced quality and speed
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );

    return result.uri;
  } catch (error) {
    console.warn("Processing failed. Using original image.");
    return uri;
  }
};

/**
 * 🎞️ THUMBNAIL GENERATOR
 * Creates smaller versions of photos for the store profile grid.
 */
export const generateVortexThumb = async (uri: string) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 400, height: 500 } }], // Smaller size for the grid
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    return uri;
  }
};