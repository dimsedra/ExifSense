import piexif from 'piexifjs';
import {
  SanitizerOptions,
  SanitizerPreset,
  PrivacyRiskItem,
  PrivacyScoreResult,
  BatchSanitizerEntry
} from './types';

const PRESET_DEFINITIONS: Record<SanitizerPreset, SanitizerOptions> = {
  'max-privacy': {
    gps: true,
    device: true,
    camera: true,
    date: true
  },
  'photo-share': {
    gps: true,
    device: false,
    camera: false,
    date: true
  },
  'location-only': {
    gps: true,
    device: false,
    camera: false,
    date: false
  }
};

/**
 * Returns a cloned SanitizerOptions configuration for a given preset identifier (REQ-SAN-001).
 * Clones the returned object to preserve internal immutability.
 */
export function getPresetOptions(preset: SanitizerPreset): SanitizerOptions {
  const selected = PRESET_DEFINITIONS[preset] ?? PRESET_DEFINITIONS['max-privacy'];
  return { ...selected };
}

/**
 * Evaluates active EXIF metadata against target sanitization toggle options (REQ-SAN-002).
 * Returns individual risk items per category and an overall privacy score status.
 */
export function evaluatePrivacyRisk(
  exifData: Record<string, unknown>,
  options: SanitizerOptions
): PrivacyScoreResult {
  const hasGps = exifData.latitude !== undefined && exifData.longitude !== undefined;
  const hasDevice = Boolean(exifData.Make || exifData.Model);
  const hasCamera = Boolean(
    exifData.ApertureValue !== undefined ||
      exifData.FNumber !== undefined ||
      exifData.ISO !== undefined ||
      exifData.ExposureTime !== undefined ||
      exifData.FocalLength !== undefined ||
      exifData.LensModel
  );
  const hasDate = Boolean(
    exifData.DateTimeOriginal || exifData.DateTimeDigitized || exifData.DateTime
  );

  const items: PrivacyRiskItem[] = [
    {
      category: 'gps',
      hasData: hasGps,
      isRemoving: options.gps,
      isAtRisk: hasGps && !options.gps
    },
    {
      category: 'date',
      hasData: hasDate,
      isRemoving: options.date,
      isAtRisk: hasDate && !options.date
    },
    {
      category: 'device',
      hasData: hasDevice,
      isRemoving: options.device,
      isAtRisk: hasDevice && !options.device
    },
    {
      category: 'camera',
      hasData: hasCamera,
      isRemoving: options.camera,
      isAtRisk: hasCamera && !options.camera
    }
  ];

  const isSafe = !items.some((item) => item.isAtRisk);

  return {
    isSafe,
    scoreStatus: isSafe ? 'safe' : 'risk',
    items
  };
}

/**
 * Strips all metadata completely via Canvas 2D re-rasterization (REQ-SAN-004).
 */
export async function stripAllMetadata(file: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to acquire 2D canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob conversion returned null'));
            }
          },
          file.type || 'image/jpeg'
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}

function uint8ArrayToBinary(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunkSize) as unknown as number[]
    );
  }
  return binary;
}

function binaryToUint8Array(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

/**
 * Surgically removes target metadata categories from a JPEG file without re-encoding pixels (REQ-SAN-003).
 * Operates directly on binary buffers in chunked operations to preserve event loop throughput and memory budget.
 */
export async function stripSpecificMetadata(
  file: File | Blob,
  options: SanitizerOptions
): Promise<Blob> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // If file is too short or not JPEG magic bytes (FF D8 FF), fallback to total canvas strip
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return stripAllMetadata(file);
    }

    const binary = uint8ArrayToBinary(bytes);
    const exifObj = piexif.load(binary);

    if (options.gps) {
      exifObj['GPS'] = {};
    }

    if (options.device) {
      if (exifObj['0th']) {
        delete exifObj['0th'][piexif.ImageIFD.Make];
        delete exifObj['0th'][piexif.ImageIFD.Model];
        delete exifObj['0th'][piexif.ImageIFD.Software];
      }
    }

    if (options.camera) {
      if (options.date) {
        exifObj['Exif'] = {};
      } else {
        const orig = exifObj['Exif']?.[piexif.ExifIFD.DateTimeOriginal];
        const dig = exifObj['Exif']?.[piexif.ExifIFD.DateTimeDigitized];
        const subSec = exifObj['Exif']?.[piexif.ExifIFD.SubSecTime];
        const subSecOrig = exifObj['Exif']?.[piexif.ExifIFD.SubSecTimeOriginal];
        const subSecDig = exifObj['Exif']?.[piexif.ExifIFD.SubSecTimeDigitized];
        const offset = exifObj['Exif']?.[0x9010];
        const offsetOrig = exifObj['Exif']?.[0x9011];
        const offsetDig = exifObj['Exif']?.[0x9012];

        exifObj['Exif'] = {};

        if (orig !== undefined) exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] = orig;
        if (dig !== undefined) exifObj['Exif'][piexif.ExifIFD.DateTimeDigitized] = dig;
        if (subSec !== undefined) exifObj['Exif'][piexif.ExifIFD.SubSecTime] = subSec;
        if (subSecOrig !== undefined) exifObj['Exif'][piexif.ExifIFD.SubSecTimeOriginal] = subSecOrig;
        if (subSecDig !== undefined) exifObj['Exif'][piexif.ExifIFD.SubSecTimeDigitized] = subSecDig;
        if (offset !== undefined) exifObj['Exif'][0x9010] = offset;
        if (offsetOrig !== undefined) exifObj['Exif'][0x9011] = offsetOrig;
        if (offsetDig !== undefined) exifObj['Exif'][0x9012] = offsetDig;
      }
    }

    if (options.date) {
      if (exifObj['0th']) {
        delete exifObj['0th'][piexif.ImageIFD.DateTime];
      }
      if (exifObj['Exif']) {
        delete exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal];
        delete exifObj['Exif'][piexif.ExifIFD.DateTimeDigitized];
        delete exifObj['Exif'][piexif.ExifIFD.SubSecTime];
        delete exifObj['Exif'][piexif.ExifIFD.SubSecTimeOriginal];
        delete exifObj['Exif'][piexif.ExifIFD.SubSecTimeDigitized];
        delete exifObj['Exif'][0x9010];
        delete exifObj['Exif'][0x9011];
        delete exifObj['Exif'][0x9012];
      }
    }

    const exifBytes = piexif.dump(exifObj);
    const newBinary = piexif.insert(exifBytes, binary);
    const outputBytes = binaryToUint8Array(newBinary);

    return new Blob([outputBytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
  } catch (_err) {
    // If piexif throws (e.g. corrupt markers), automatically fallback to canvas total strip
    return stripAllMetadata(file);
  }
}

/**
 * Sanitizes a batch of images with per-file overrides and a concurrency throttle of 3 (REQ-SAN-005).
 */
export async function sanitizeBatch(
  entries: BatchSanitizerEntry[],
  globalOptions: SanitizerOptions,
  onProgress?: (completed: number, total: number) => void
): Promise<Array<{ id: string; fileName: string; cleanedBlob: Blob }>> {
  if (!entries || entries.length === 0) {
    return [];
  }

  const results: Array<{ id: string; fileName: string; cleanedBlob: Blob }> = new Array(
    entries.length
  );
  const total = entries.length;
  let completed = 0;
  const concurrency = 3;

  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < total) {
      const index = currentIndex++;
      const entry = entries[index];
      const effectiveOptions: SanitizerOptions = {
        ...globalOptions,
        ...(entry.optionsOverride || {})
      };

      const isStripAll =
        effectiveOptions.gps &&
        effectiveOptions.device &&
        effectiveOptions.camera &&
        effectiveOptions.date;

      let cleanedBlob: Blob;
      if (isStripAll) {
        cleanedBlob = await stripAllMetadata(entry.file);
      } else {
        cleanedBlob = await stripSpecificMetadata(entry.file, effectiveOptions);
      }

      results[index] = {
        id: entry.id,
        fileName: `cleaned_${entry.fileName}`,
        cleanedBlob
      };

      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
    }
  }

  const workerCount = Math.min(concurrency, total);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

/**
 * Triggers a client-side download of a Blob file and safely revokes the Object URL after 150ms.
 */
export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 150);
}
