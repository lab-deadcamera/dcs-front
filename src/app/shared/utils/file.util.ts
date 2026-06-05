/**
 * Download a video file
 * @param url video url
 * @param filename video filename
 */
export const DOWNLOAD_VIDEO = async (url: string, filename: string = '') => {
  try {
    const response = await fetch(url);
    const blob = await response.blob(); // Convert to binary data

    if (!filename) {
      filename = url.split('/').pop() || `video-${Date.now()}.mp4`;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    document.body.appendChild(link);
    link.click(); // Trigger native browser download
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Download failed for:', url, error);
  }
};
