# Robotik-Challenge DPP Creator

This page documents the **Digital Product Passport (DPP) Creator** functionality developed as part of the [THLS Robotik-Challenge 2026 – Begleitforschungs- und Digitalisierungsmodul](https://www.leitungssatz-hub.de/robotik-challenge/robotik-challenge-2026/begleitforschungs-und-digitalisierungsmodul/).

The goal of this Mnestix fork is to demonstrate how Digital Product Passports can be automatically generated from existing cable-set engineering data formats (VEC and KBL), providing traceability and sustainability insights for cable harness engineers.

---

## Overview

Cable-set engineers today work with **VEC** (Vehicle Electric Container) and **KBL** (Kabelbaumliste / Cable Harness List) files to describe wiring harnesses, connectors, terminals, and wires. This project shows how that data can be automatically transformed into standardized **AAS (Asset Administration Shell)** submodels — forming a Digital Product Passport for each cable set.

The approach:

1. A user uploads a `.vec` or `.kbl` file in the Mnestix Browser
2. A custom XML parser extracts the data into a flat JSON structure
3. The **Mnestix AAS Generator** applies blueprint mapping rules to produce AAS submodel instances
4. Both dynamically mapped data (from the file) and static illustrative submodels are generated

---

## Data Sources: VEC and KBL

### KBL (Kabelbaumliste)

KBL is a standardized XML format (VDA/JAIF recommendation 4964) for describing cable harness designs. It contains structured data about:

- **Harness** — top-level element with manufacturer info (`Company_name`, `Part_number`, `Description`)
- **Connector_housing** — connector housings with part numbers, descriptions, and cavity layouts
- **General_terminal** — terminal/contact definitions
- **General_wire** — wire definitions with cross-section and color information

> **Reference**: [VDA Recommendation 4964](https://www.vda.de/en/news/publications/publication/vda-4964) — Kabelbaumliste (KBL)

### VEC (Vehicle Electric Container)

VEC is a comprehensive data model for vehicle electrical systems defined by the prostep ivip association. Key elements used in our mappings:

- **DocumentVersion** — document metadata including `CompanyName`, `DocumentNumber`, and `Description`
- **PartVersion** — individual parts with `PrimaryPartType` (Connector, Wire, Terminal, etc.), `PartNumber`, and `CompanyName`
- **Connection** — electrical connectivity between component ports

> **Reference**: [prostep ivip VEC Recommendation](https://ecad-wiki.prostep.org/specifications/vec/) — Vehicle Electric Container

---

## Architecture: XML Parsing → JSON → Blueprint Mapping

### Custom XML Parser

Unlike ETL-based approaches (e.g., Apache Camel), this fork includes a **built-in XML parser** (`src/lib/services/data-upload/fileHelper.ts`) that:

1. Parses the XML DOM into a JSON object
2. Detects the file type (VEC vs. KBL) by extension or content inspection
3. **For VEC files**: keeps only the newest `DocumentVersion` and flattens VEC `LocalizedString` objects into plain string values
4. **For KBL files**: extracts metadata from the `Harness` element

The resulting JSON is then passed directly to the AAS Generator along with the appropriate blueprint IDs.

### Blueprint Selection

Blueprint IDs are configured via environment variables:

| Variable                     | Description                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `FILE_UPLOAD_BLUEPRINTS_VEC` | JSON array of blueprint IDs to apply when a VEC file is uploaded |
| `FILE_UPLOAD_BLUEPRINTS_KBL` | JSON array of blueprint IDs to apply when a KBL file is uploaded |

The `scripts/setup-blueprints.js` script automates blueprint creation from the template files and writes the resulting IDs into `.env.development.local`.

---

## Blueprint Mapping Rules

Blueprints use **qualifier annotations** on AAS submodel elements to define how JSON data maps to each field. These qualifiers use [JSONata](https://jsonata.org/) expressions for data transformation. See the [Mnestix AAS Generator Data Ingest & Blueprints](Mnestix-AAS-Generator-Dataingest-and-Blueprints) documentation for a detailed guide on how this works.

### Nameplate (KBL)

Template: `nameplate-kbl-template.json`

| AAS Property                         | Qualifier       | JSONata Path / Expression | KBL Source Element            |
| ------------------------------------ | --------------- | ------------------------- | ----------------------------- |
| `ManufacturerName`                   | SMT/MappingInfo | `Harness.Company_name`    | `<Harness>.<Company_name>`    |
| `ManufacturerProductDesignation`     | SMT/MappingInfo | `Harness.Description`     | `<Harness>.<Description>`     |
| `ManufacturerProductType`            | SMT/MappingInfo | `Harness.Abbreviation`    | `<Harness>.<Abbreviation>`    |
| `OrderCodeOfManufacturer`            | SMT/MappingInfo | `Harness.Part_number`     | `<Harness>.<Part_number>`     |
| `ProductArticleNumberOfManufacturer` | SMT/MappingInfo | `Harness.Part_number`     | `<Harness>.<Part_number>`     |
| `DateOfManufacture`                  | SMT/MappingInfo | `CreationDate`            | `<CreationDate>` (root level) |
| `HardwareVersion`                    | SMT/MappingInfo | `Harness.Version`         | `<Harness>.<Version>`         |

### Nameplate (VEC)

Template: `nameplate-vec-template.json`

| AAS Property                     | Qualifier       | JSONata Path / Expression         | VEC Source Element                    |
| -------------------------------- | --------------- | --------------------------------- | ------------------------------------- |
| `ManufacturerName`               | SMT/MappingInfo | `DocumentVersion.CompanyName`     | `<DocumentVersion>.<CompanyName>`     |
| `ManufacturerProductDesignation` | SMT/MappingInfo | `DocumentVersion.Description`     | `<DocumentVersion>.<Description>`     |
| `ManufacturerProductType`        | SMT/MappingInfo | `DocumentVersion.Abbreviation`    | `<DocumentVersion>.<Abbreviation>`    |
| `DateOfManufacture`              | SMT/MappingInfo | `Creation.CreationDate`           | `<Creation>.<CreationDate>`           |
| `HardwareVersion`                | SMT/MappingInfo | `DocumentVersion.DocumentVersion` | `<DocumentVersion>.<DocumentVersion>` |

### HierarchicalStructures — Dynamic BOM (KBL)

Template: `hierarchical-structures-dynamic-kbl-template.json`

This blueprint generates a **Bill of Materials** by iterating over all components in a KBL file. The `SMT/CollectionMappingInfo` qualifier causes the generator to duplicate the element once per array item, creating one entity per physical component.

**Connector Housings** — iterates over `Connector_housing[*]`:

| Element                                  | Qualifier                     | JSONata Expression                                                                                                                    |
| ---------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ConnectorHousingPart` (Entity)          | SMT/CollectionMappingInfo     | `Connector_housing[*]`                                                                                                                |
| → idShort                                | SMT/MappingInfo/idShort       | `$replace(Connector_housing[*].Company_name, ' ', '_') & '_ConnectorHousing_' & $replace(Connector_housing[*].Part_number, ' ', '_')` |
| → globalAssetId                          | SMT/MappingInfo/globalAssetId | `'https://' & Connector_housing[*].Company_name & '/' & Connector_housing[*].Part_number`                                             |
| → displayName                            | SMT/MappingInfo/displayName   | `'ConnectorHousing - ' & Connector_housing[*].Part_number`                                                                            |
| `HasPartConnectorHousing` (Relationship) | SMT/CollectionMappingInfo     | `Connector_housing[*]`                                                                                                                |
| → second (reference target)              | SMT/MappingInfo/second        | Model reference pointing to the generated entity                                                                                      |

**Terminals** — iterates over `General_terminal[*]`:

| Element                          | Qualifier                     | JSONata Expression                                                                                                          |
| -------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `TerminalPart` (Entity)          | SMT/CollectionMappingInfo     | `General_terminal[*]`                                                                                                       |
| → idShort                        | SMT/MappingInfo/idShort       | `$replace(General_terminal[*].Company_name, ' ', '_') & '_Terminal_' & $replace(General_terminal[*].Part_number, ' ', '_')` |
| → globalAssetId                  | SMT/MappingInfo/globalAssetId | `'https://' & General_terminal[*].Company_name & '/' & General_terminal[*].Part_number`                                     |
| → displayName                    | SMT/MappingInfo/displayName   | `'Terminal - ' & General_terminal[*].Part_number`                                                                           |
| `HasPartTerminal` (Relationship) | SMT/CollectionMappingInfo     | `General_terminal[*]`                                                                                                       |
| → second (reference target)      | SMT/MappingInfo/second        | Model reference pointing to the generated entity                                                                            |

**Wires** — iterates over `General_wire[*]`:

| Element                      | Qualifier                     | JSONata Expression                                                                                              |
| ---------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `WirePart` (Entity)          | SMT/CollectionMappingInfo     | `General_wire[*]`                                                                                               |
| → idShort                    | SMT/MappingInfo/idShort       | `$replace(General_wire[*].Company_name, ' ', '_') & '_Wire_' & $replace(General_wire[*].Part_number, ' ', '_')` |
| → globalAssetId              | SMT/MappingInfo/globalAssetId | `'https://' & General_wire[*].Company_name & '/' & General_wire[*].Part_number`                                 |
| → displayName                | SMT/MappingInfo/displayName   | `'Wire - ' & General_wire[*].Part_number`                                                                       |
| `HasPartWire` (Relationship) | SMT/CollectionMappingInfo     | `General_wire[*]`                                                                                               |
| → second (reference target)  | SMT/MappingInfo/second        | Model reference pointing to the generated entity                                                                |

Each `HasPart` relationship links the parent `CableSet` entry node (first) to the generated child entity (second), establishing a proper hierarchical BOM structure per [IDTA 02011-1-1](https://industrialdigitaltwin.org/content-hub/submodels).

### HierarchicalStructures — Dynamic BOM (VEC)

Template: `hierarchical-structures-dynamic-vec-template.json`

The VEC variant uses a single `PartVersion[*]` array that contains all parts regardless of type. The `PrimaryPartType` field (Connector, Wire, Terminal, etc.) is included in the generated idShort for disambiguation.

| Element                     | Qualifier                     | JSONata Expression                                                                                                        |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Part` (Entity)             | SMT/CollectionMappingInfo     | `PartVersion[*]`                                                                                                          |
| → idShort                   | SMT/MappingInfo/idShort       | `$replace(PartVersion[*].CompanyName, ' ', '_') & '_' & PartVersion[*].PrimaryPartType & '_' & PartVersion[*].PartNumber` |
| → globalAssetId             | SMT/MappingInfo/globalAssetId | `'https://' & PartVersion[*].CompanyName & '/' & PartVersion[*].PartNumber`                                               |
| → displayName               | SMT/MappingInfo/displayName   | `PartVersion[*].PrimaryPartType & ' - ' & PartVersion[*].PartNumber`                                                      |
| `HasPart` (Relationship)    | SMT/CollectionMappingInfo     | `PartVersion[*]`                                                                                                          |
| → second (reference target) | SMT/MappingInfo/second        | Model reference pointing to the generated entity                                                                          |

### HandoverDocumentation (KBL)

Template: `handover-docs-kbl-template.json`

This submodel attaches metadata about the uploaded KBL file as a VDI 2770-compliant document reference.

| AAS Property (path)                              | Qualifier       | JSONata Path           | KBL Source Element         |
| ------------------------------------------------ | --------------- | ---------------------- | -------------------------- |
| `Document > DocumentVersion > OrganizationName`  | SMT/MappingInfo | `Harness.Company_name` | `<Harness>.<Company_name>` |
| `Document > DocumentVersion > DocumentVersionId` | SMT/MappingInfo | `Harness.Version`      | `<Harness>.<Version>`      |
| `Document > DocumentVersion > Summary`           | SMT/MappingInfo | `Harness.Description`  | `<Harness>.<Description>`  |

### HandoverDocumentation (VEC)

Template: `handover-docs-vec-template.json`

| AAS Property (path)                              | Qualifier       | JSONata Path                      | VEC Source Element                      |
| ------------------------------------------------ | --------------- | --------------------------------- | --------------------------------------- |
| `Document > DocumentVersion > OrganizationName`  | SMT/MappingInfo | `DocumentVersion.CompanyName`     | `<DocumentVersion>.<CompanyName>`       |
| `Document > DocumentVersion > DocumentVersionId` | SMT/MappingInfo | `DocumentVersion.DocumentVersion` | `<DocumentVersion>.<DocumentVersion>`   |
| `Document > DocumentVersion > StatusValue`       | SMT/MappingInfo | `DocumentVersion.Approval.status` | `<DocumentVersion>.<Approval>.<status>` |
| `Document > DocumentVersion > SubTitle`          | SMT/MappingInfo | `DocumentVersion.Description`     | `<DocumentVersion>.<Description>`       |
| `Document > DocumentVersion > Summary`           | SMT/MappingInfo | `DocumentVersion.Description`     | `<DocumentVersion>.<Description>`       |

---

## Generated Submodels

Each file upload produces the following submodels. Some are **dynamically mapped** from the file content, others are **static/illustrative** to demonstrate the full DPP vision.

### Dynamically Mapped Submodels (data extracted from VEC/KBL)

| Submodel                             | Semantic ID                                                       | IDTA Spec                                                                                                                                                                                     | Description                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Nameplate**                        | `https://admin-shell.io/zvei/nameplate/2/0/Nameplate`             | [IDTA 02006-2-0](https://industrialdigitaltwin.org/content-hub/submodels)                                                                                                                     | Manufacturer identification, product designation                                                        |
| **HierarchicalStructures** (dynamic) | `https://admin-shell.io/idta/HierarchicalStructures/1/1/Submodel` | [IDTA 02011-1-1](https://industrialdigitaltwin.org/content-hub/submodels)                                                                                                                     | Bill of Materials — lists all connectors, terminals, and wires as entities with `HasPart` relationships |
| **HandoverDocumentation**            | `https://admin-shell.io/vdi/2770/1/2/HandoverDocumentation`       | [VDI 2770](https://www.vdi.de/richtlinien/details/vdi-2770-blatt-1-betrieb-technischer-anlagen-mindestanforderungen-an-digitale-herstellerinformationen-fuer-die-prozessindustrie-grundlagen) | Document metadata for the uploaded engineering file                                                     |

### Static / Illustrative Submodels (demo data)

These submodels are generated with placeholder values to illustrate how a full DPP could support cable-set engineers in sustainability and end-of-life decisions:

| Submodel                            | Semantic ID                                                              | IDTA Spec                                                                 | Illustrates                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **HierarchicalStructures** (static) | `https://admin-shell.io/idta/HierarchicalStructures/1/1/Submodel`        | [IDTA 02011-1-1](https://industrialdigitaltwin.org/content-hub/submodels) | A fixed BOM structure template                                                         |
| **CarbonFootprint**                 | `0173-1#01-AHE712#001`                                                   | [IDTA 02023-0-9](https://industrialdigitaltwin.org/content-hub/submodels) | Product carbon footprint (PCF) per lifecycle stage, calculation method, CO₂eq values   |
| **MaterialComposition**             | `https://admin-shell.io/idta/MaterialComposition/1/0/Submodel`           | [IDTA 02034-1-0](https://industrialdigitaltwin.org/content-hub/submodels) | Material declarations, product mass, hazardous substance flags, critical raw materials |
| **Circularity**                     | `urn:samm:io.admin-shell.idta.batterypass.circularity:1.0.0#Circularity` | Derived from [Battery Pass](https://thebatterypass.eu/)                   | Dismantling instructions, recycling information, spare part sources                    |

> [!NOTE]
> The static submodels use placeholder data and are meant to showcase the **potential** of DPPs for cable-set lifecycle management. In a production environment, these would be populated from real sustainability databases and manufacturer data systems.

---

## How It Helps Cable-Set Engineers

| Use Case                      | Enabled By                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Component traceability**    | Dynamic Bill of Materials from VEC/KBL, linking each connector, terminal, and wire to a resolvable asset ID |
| **Supplier identification**   | Nameplate submodel with manufacturer data extracted directly from engineering files                         |
| **Sustainability assessment** | Carbon Footprint submodel illustrating how PCF data can be attached to each harness                         |
| **End-of-life planning**      | Circularity submodel showing dismantling sequences and recyclability scores                                 |
| **Material compliance**       | Material Composition submodel demonstrating REACH/RoHS-relevant substance tracking                          |
| **Documentation handover**    | Handover Documentation linking the original VEC/KBL file as a digital twin artifact                         |

---

## Setup & Usage

### Monorepo-Setup

- The Blueprints, Type-AASs and created DPPs are stored in the same Basyx-Repo.
- Running Mnestix infrastructure (see [Getting Started](Getting-started-with-developing))
- Add the same URL to the following environment:
  - For Mnestix Browser: `DISCOVERY_API_URL`, `AAS_REPO_API_URL`, `SUBMODEL_REPO_API_URL`, `CONCEPT_DESCRIPTION_REPO_API_URL`, `SERIALIZATION_API_URL`, `MNESTIX_AAS_GENERATOR_API_URL`
  - For Mnestix AAS Generator: `serverUrls`

### Two-Repo Setup

See **[Two-Repo Setup (Arena-RC Project)](Two-Repo-Setup)**

### Register Blueprints

```bash
node scripts/setup-blueprints.js
```

This creates all blueprints on the AAS Generator and writes the IDs to `.env.development.local`.

### Upload a File

1. Open the Mnestix Browser
2. Navigate to the file upload section
3. Upload a `.vec` or `.kbl` file
4. The system automatically:
    - Parses the XML to JSON
    - Selects the correct blueprint set (VEC or KBL)
    - Calls the AAS Generator to create the AAS with all submodels
    - Uploads the original file as an attachment to the HandoverDocumentation submodel

---

## References

- [THLS Robotik-Challenge 2026 — Digitalisierungsmodul](https://www.leitungssatz-hub.de/robotik-challenge/robotik-challenge-2026/begleitforschungs-und-digitalisierungsmodul/)
- [IDTA Submodel Template Specifications](https://industrialdigitaltwin.org/content-hub/submodels)
- [VDA 4964 — KBL (Kabelbaumliste)](https://www.vda.de/en/news/publications/publication/vda-4964)
- [prostep ivip — VEC (Vehicle Electric Container)](https://ecad-wiki.prostep.org/specifications/vec/)
- [Eclipse Mnestix Browser](https://github.com/eclipse-mnestix/mnestix-browser)
- [Mnestix AAS Generator — Data Ingest & Blueprints](Mnestix-AAS-Generator-Dataingest-and-Blueprints)
- [JSONata Expression Language](https://jsonata.org/)
- [EU Digital Product Passport Regulation](https://environment.ec.europa.eu/topics/circular-economy/digital-product-passport_en)
