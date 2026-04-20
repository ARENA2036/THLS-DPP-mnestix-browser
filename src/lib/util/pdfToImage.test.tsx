import { convertPdfToImageClient, isPdfFile } from './pdfToImage';

// Mock pdfjs-dist
const mockRenderPromise = Promise.resolve();
const mockGetViewport = jest.fn((opts: { scale: number }) => ({
    width: 100 * opts.scale,
    height: 100 * opts.scale,
}));
const mockRender = jest.fn(() => ({ promise: mockRenderPromise }));
const mockGetPage = jest.fn(() =>
    Promise.resolve({
        getViewport: mockGetViewport,
        render: mockRender,
    }),
);
const mockDestroy = jest.fn(() => Promise.resolve());

jest.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: jest.fn(() => ({
        promise: Promise.resolve({
            getPage: mockGetPage,
            destroy: mockDestroy,
        }),
    })),
}));

// Helper to create a blob of a specific size
function createBlobOfSize(size: number): Blob {
    return new Blob([new Uint8Array(size)]);
}

// Spy on canvas.toBlob to control the blob size returned
let toBlobSize = 1000;
const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
    jest.clearAllMocks();
    toBlobSize = 1000;

    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'canvas') {
            (el as HTMLCanvasElement).toBlob = (callback, _mimeType, _quality) => {
                callback(createBlobOfSize(toBlobSize));
            };
        }
        return el;
    });
});

afterEach(() => {
    jest.restoreAllMocks();
});

function createPdfFile(name = 'test.pdf'): File {
    const content = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const file = new File([content], name, { type: 'application/pdf' });
    // jsdom File does not implement arrayBuffer(), so polyfill it
    if (!file.arrayBuffer) {
        file.arrayBuffer = () =>
            new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.readAsArrayBuffer(file);
            });
    }
    return file;
}

describe('convertPdfToImageClient', () => {
    it('should return a JPEG file with correct name and type', async () => {
        const result = await convertPdfToImageClient(createPdfFile('document.pdf'));

        expect(result.name).toBe('document.jpg');
        expect(result.type).toBe('image/jpeg');
    });

    it('should pick the first blob that fits within maxFileSizeBytes', async () => {
        // Return a blob that is 2000 bytes — fits in default 5MB limit
        toBlobSize = 2000;

        const result = await convertPdfToImageClient(createPdfFile());

        expect(result.size).toBe(2000);
        // Should have rendered at the first scale (2.0) and first quality (0.9)
        expect(mockGetViewport).toHaveBeenCalledWith({ scale: 2.0 });
    });

    it('should try lower qualities when blob exceeds limit', async () => {
        const maxSize = 500;
        let callCount = 0;

        jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            const el = originalCreateElement(tagName);
            if (tagName === 'canvas') {
                (el as HTMLCanvasElement).toBlob = (callback, _mimeType, _quality) => {
                    callCount++;
                    // First two calls return oversized blobs, third fits
                    const size = callCount <= 2 ? 1000 : 200;
                    callback(createBlobOfSize(size));
                };
            }
            return el;
        });

        const result = await convertPdfToImageClient(createPdfFile(), maxSize);

        expect(result.size).toBe(200);
        expect(callCount).toBe(3);
    });

    it('should try lower scales when all qualities exceed limit', async () => {
        const maxSize = 500;
        let callCount = 0;

        jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            const el = originalCreateElement(tagName);
            if (tagName === 'canvas') {
                (el as HTMLCanvasElement).toBlob = (callback, _mimeType, _quality) => {
                    callCount++;
                    // First 3 calls (scale=2.0, all qualities) are too big,
                    // 4th call (scale=1.5, quality=0.9) fits
                    const size = callCount <= 3 ? 1000 : 300;
                    callback(createBlobOfSize(size));
                };
            }
            return el;
        });

        const result = await convertPdfToImageClient(createPdfFile(), maxSize);

        expect(result.size).toBe(300);
        expect(callCount).toBe(4);
        // Second call to getViewport should be at scale 1.5
        expect(mockGetViewport).toHaveBeenCalledWith({ scale: 1.5 });
    });

    it('should fall back to lowest scale/quality when all combinations exceed limit', async () => {
        const maxSize = 100;

        jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            const el = originalCreateElement(tagName);
            if (tagName === 'canvas') {
                (el as HTMLCanvasElement).toBlob = (callback, _mimeType, _quality) => {
                    // All blobs exceed the limit
                    callback(createBlobOfSize(500));
                };
            }
            return el;
        });

        const result = await convertPdfToImageClient(createPdfFile(), maxSize);

        // Should still return a file (fallback path)
        expect(result.name).toBe('test.jpg');
        expect(result.type).toBe('image/jpeg');
        expect(mockGetViewport).toHaveBeenCalledWith({ scale: 0.5 });
    });

    it('should call pdfDoc.destroy() even when rendering throws', async () => {
        mockGetPage.mockRejectedValueOnce(new Error('render failed'));

        await expect(convertPdfToImageClient(createPdfFile())).rejects.toThrow('render failed');
        expect(mockDestroy).toHaveBeenCalled();
    });
});

describe('isPdfFile', () => {
    it('should return true for PDF files', () => {
        const file = new File([], 'doc.pdf', { type: 'application/pdf' });
        expect(isPdfFile(file)).toBe(true);
    });

    it('should return false for non-PDF files', () => {
        const file = new File([], 'image.png', { type: 'image/png' });
        expect(isPdfFile(file)).toBe(false);
    });
});
