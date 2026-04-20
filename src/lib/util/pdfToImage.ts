/**
 * Client-side utility function to convert PDF files to PNG images.
 * Uses pdfjs-dist in the browser environment where canvas is natively supported.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to local file (bundled in public/_static folder for security)
// The _static path is excluded from locale middleware routing
pdfjsLib.GlobalWorkerOptions.workerSrc = '/_static/pdf.worker.min.mjs';

/**
 * Converts a PDF file to an image file (first page only).
 * Automatically scales down if the result exceeds maxFileSizeBytes.
 * @param pdfFile The PDF file to convert
 * @param maxFileSizeBytes Optional maximum file size in bytes (default: 5MB)
 * @returns A Promise that resolves to an image File object
 */
export async function convertPdfToImageClient(pdfFile: File, maxFileSizeBytes = 5 * 1024 * 1024): Promise<File> {
    const bytes = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(bytes);

    // Load the PDF document
    const pdfDoc = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    // Get the first page
    const page = await pdfDoc.getPage(1);

    const scales = [2.0, 1.5, 1.0, 0.75];
    const qualities = [0.9, 0.7, 0.5];

    let resultBlob: Blob | null = null;

    for (const scale of scales) {
        const viewport = page.getViewport({ scale });

        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Failed to get canvas context');
        }

        // Render the PDF page to the canvas
        await page.render({
            canvas: canvas,
            viewport: viewport,
        }).promise;

        for (const quality of qualities) {
            const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
            if (blob.size <= maxFileSizeBytes) {
                resultBlob = blob;
                break;
            }
        }

        if (resultBlob) break;
    }

    // If still no valid blob, use the lowest quality as fallback
    if (!resultBlob) {
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get canvas context');
        }
        await page.render({ canvas, viewport }).promise;
        resultBlob = await canvasToBlob(canvas, 'image/jpeg', 0.5);
    }

    // Generate a new filename with .jpg extension
    const originalName = pdfFile.name.replace(/\.pdf$/i, '');
    const newFileName = `${originalName}.jpg`;

    // Clean up
    await pdfDoc.destroy();

    // Create a new File object
    return new File([resultBlob], newFileName, { type: 'image/jpeg' });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert canvas to blob'));
                }
            },
            mimeType,
            quality,
        );
    });
}

/**
 * Checks if a file is a PDF based on its MIME type
 * @param file The file to check
 * @returns true if the file is a PDF
 */
export function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf';
}
