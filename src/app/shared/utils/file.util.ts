/**
 * Download a video file, showing a save dialog when supported (Chrome, Edge, Opera).
 * Falls back to the standard blob download on Safari/Firefox where the picker is
 * unavailable — those browsers save to the default download folder automatically.
 * @param url video url
 * @param filename suggested filename
 */
export const DOWNLOAD_VIDEO = async (url: string, filename: string = '') => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    if (!filename) {
      filename = url.split('/').pop() || `video-${Date.now()}.mp4`;
    }

    // Use the File System Access API when available (Chromium-based browsers)
    // so the user can pick the target folder on every OS, including Mac.
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as unknown as Window & {
          showSaveFilePicker: (opts: {
            suggestedName?: string;
            types?: { description: string; accept: Record<string, string[]> }[];
          }) => Promise<FileSystemFileHandle>;
        }).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Video file',
              accept: { 'video/*': ['.mp4', '.mov', '.webm', '.avi', '.mkv'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch {
        // User cancelled the save dialog — do nothing
        return;
      }
    }

    // Fallback: standard anchor-click download (no folder picker on Mac/Safari)
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Download failed for:', url, error);
  }
};
