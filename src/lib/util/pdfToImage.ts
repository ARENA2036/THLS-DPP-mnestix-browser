/**
 * Client-side utility function to convert PDF files to PNG images.
 * Uses pdfjs-dist in the browser environment where canvas is natively supported.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to local file (bundled in public/_static folder for security)
// The _static path is excluded from locale middleware routing
pdfjsLib.GlobalWorkerOptions.workerSrc = '/_static/pdf.worker.min.mjs';

/**
 * Converts a PDF file to a PNG image file (first page only)
 * @param pdfFile The PDF file to convert
 * @returns A Promise that resolves to a PNG File object
 */
export async function convertPdfToImageClient(pdfFile: File): Promise<File> {
    const bytes = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(bytes);

    // Load the PDF document
    const pdfDoc = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    // Get the first page
    const page = await pdfDoc.getPage(1);

    // Set up the viewport with a scale for good quality
    const scale = 2.0;
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
    // Using canvas parameter (required) and canvasContext for backwards compatibility
    await page.render({
        canvas: canvas,
        viewport: viewport,
    }).promise;

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert canvas to blob'));
                }
            },
            'image/png',
            0.9,
        );
    });

    // Generate a new filename with .png extension
    const originalName = pdfFile.name.replace(/\.pdf$/i, '');
    const newFileName = `${originalName}.png`;

    // Clean up
    await pdfDoc.destroy();

    // Create a new File object
    return new File([blob], newFileName, { type: 'image/png' });
}

/**
 * Checks if a file is a PDF based on its MIME type
 * @param file The file to check
 * @returns true if the file is a PDF
 */
export function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf';
}
