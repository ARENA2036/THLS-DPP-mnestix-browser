/**
 * VDI 2770 Blatt 1:2020 Document Classification Constants
 * Based on IDTA 02004-1-2 Submodel Handover Documentation specification
 */

export const VDI2770_CLASSIFICATION_SYSTEM = 'VDI 2770 Blatt 1:2020';

export interface Vdi2770DocumentClass {
    classId: string;
    classNameEn: string;
    classNameDe: string;
}

/**
 * VDI 2770 document classifications according to VDI 2770 Blatt 1:2020
 */
export const VDI2770_DOCUMENT_CLASSES: readonly Vdi2770DocumentClass[] = [
    { classId: '01-01', classNameEn: 'Identification', classNameDe: 'Identifikation' },
    { classId: '02-01', classNameEn: 'Technical specification', classNameDe: 'Technische Spezifikation' },
    { classId: '02-02', classNameEn: 'Drawings, plans', classNameDe: 'Zeichnungen, Pläne' },
    { classId: '02-03', classNameEn: 'Assemblies', classNameDe: 'Bauteile' },
    {
        classId: '02-04',
        classNameEn: 'Certificates, declarations',
        classNameDe: 'Zeugnisse, Zertifikate, Bescheinigungen',
    },
    { classId: '03-01', classNameEn: 'Commissioning, de-commissioning', classNameDe: 'Montage, Demontage' },
    { classId: '03-02', classNameEn: 'Operation', classNameDe: 'Bedienung' },
    { classId: '03-03', classNameEn: 'General safety', classNameDe: 'Allgemeine Sicherheit' },
    { classId: '03-04', classNameEn: 'Inspection, maintenance, testing', classNameDe: 'Inspektion, Wartung, Prüfung' },
    { classId: '03-05', classNameEn: 'Repair', classNameDe: 'Instandsetzung' },
    { classId: '03-06', classNameEn: 'Spare parts', classNameDe: 'Ersatzteile' },
    { classId: '04-01', classNameEn: 'Contract documents', classNameDe: 'Vertragsunterlagen' },
] as const;

/**
 * Get the class name based on locale
 */
export function getVdi2770ClassName(classId: string, locale: string): string {
    const docClass = VDI2770_DOCUMENT_CLASSES.find((c) => c.classId === classId);
    if (!docClass) return classId;
    return locale === 'de' ? docClass.classNameDe : docClass.classNameEn;
}

/**
 * Get a document class by its ID
 */
export function getVdi2770DocumentClass(classId: string): Vdi2770DocumentClass | undefined {
    return VDI2770_DOCUMENT_CLASSES.find((c) => c.classId === classId);
}
