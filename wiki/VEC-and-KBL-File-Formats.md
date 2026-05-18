# VEC and KBL File Formats

This page documents the VEC (Vehicle Electric Container) and KBL (Kabelbaumliste / Cable Harness List) file formats as used in the Mnestix cable set DPP (Digital Product Passport) workflow, including lessons learned, structural details, and the blueprint mapping approach.

---

## Overview

VEC and KBL are XML-based standards from the ECAD-IF / prostep iViP association for describing wiring harness data in the automotive industry. Both formats serve as input data for the Mnestix AAS Generator to produce a Bill of Materials (BOM) as a `HierarchicalStructures` submodel.

| Format | Full Name                       | Schema Namespace                                                 | Typical Use Case                           |
| ------ | ------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| VEC    | Vehicle Electric Container      | `http://www.prostep.org/ecad-if/2011/vec`                        | Modern, comprehensive harness descriptions |
| KBL    | Kabelbaumliste (Cable Set List) | `http://www.prostep.org/Car_electric_container/KBL2.3/KBLSchema` | Legacy/simpler harness part lists          |

---

## The Core Problem: No Globally Unique Part Identifiers

The main challenge for creating Digital Product Passports in the cable set domain is that **neither VEC nor KBL use globally identifiable IDs for parts** that could be used to create and link Asset Administration Shells (AAS) in dataspaces.

- Part numbers are manufacturer-internal (e.g. `2-2310137-1`, `28529`)
- There is no standard URI or globally unique identifier for a part
- Without a global identifier, AAS cannot reference each other across organizational boundaries

### Workaround: Combining Company Name and Part Number

Our workaround constructs a pseudo-global asset ID by combining the company's domain with the part number:

```
https://{CompanyName}/{PartNumber}
```

For example:

- `https://asset.te.com/TE_ConnectorHousing_2_2310137_1`
- `https://helukabel.com/28529`

This requires authors of VEC/KBL files to use a **domain-style company name** (like `asset.te.com`) in the `CompanyName` / `Company_name` field rather than a short abbreviation. This convention makes the generated `globalAssetId` resolvable and unique enough for dataspace use.

> **Important:** This is a convention, not a standard. All parties in a dataspace must agree on the company name format for cross-referencing to work.

---

## VEC File Structure

A VEC file is wrapped in a `<vec:VecContent>` root element containing a `<DocumentVersion>` with multiple `<Specification>` blocks.

### Key Concepts

| VEC Concept                  | German Term        | Description                                                                                               |
| ---------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| **PartVersion**              | Teil (Part)        | A catalog entry describing a type of part (connector, wire, etc.)                                         |
| **PartOccurrence**           | Verwendung (Usage) | A specific usage/instance of a part within the harness                                                    |
| **Specification**            | Spezifikation      | Technical details (e.g. `ConnectorHousingSpecification`, `WireSpecification`, `EEComponentSpecification`) |
| **CompositionSpecification** | Zusammensetzung    | Defines which PartOccurrences make up the harness                                                         |
| **Role**                     | Rolle              | Links a PartOccurrence to its specification and topology nodes                                            |

### PartVersion (Part Catalog Entry)

PartVersions define the "what" — the types of parts available:

```xml
<PartVersion id="Na504fba199e67b6e1276416X...ConnectorHousing">
  <CompanyName>asset.te.com</CompanyName>
  <PartNumber>TE_ConnectorHousing_2_2310137_1</PartNumber>
  <PrimaryPartType>ConnectorHousing</PrimaryPartType>
</PartVersion>
```

### PartOccurrence (Part Usage)

PartOccurrences define the "where" — how parts are used in the harness. Each occurrence **must** reference its PartVersion via a `<Part>` element:

```xml
<Component id="..._PartOccurance" xsi:type="vec:PartOccurrence">
  <Identification>Stecker Modul_PartOcccurrence</Identification>
  <Part>EEComponent_SteckerModul</Part>  <!-- Reference to PartVersion id -->
  <RealizedUsageNode>..._UsageNode</RealizedUsageNode>
  <Role id="..." xsi:type="vec:EEComponentRole">
    <EEComponentSpecification>..._Spec</EEComponentSpecification>
    <ComponentNode>..._ComponentNode</ComponentNode>
  </Role>
</Component>
```

> **Critical lesson:** The `<Part>` element on PartOccurrence is **required** for correct BOM generation. Without it, occurrences cannot be counted per PartVersion. The VEC schema allows omitting it (schema-valid), but it is **semantically wrong** — every occurrence must reference its part type. Older export tools may omit this field; it must be added manually or via post-processing.

### Specification Types

| xsi:type                                | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `vec:ConnectorHousingSpecification`     | Describes connector housing geometry, cavities   |
| `vec:WireSpecification`                 | Describes wire properties (cross-section, color) |
| `vec:EEComponentSpecification`          | Describes electrical/electronic components       |
| `vec:CompositionSpecification`          | Lists PartOccurrences that compose the harness   |
| `vec:GeneralTechnicalPartSpecification` | General part properties (color, material)        |
| `vec:UsageNodeSpecification`            | Logical usage topology                           |
| `vec:ConnectionSpecification`           | Wiring connections between component ports       |
| `vec:NetSpecification`                  | Electrical net definitions                       |

### Linking: DescribedPart

Specifications link to their PartVersion via `<DescribedPart>`:

```xml
<Specification id="..._Spec" xsi:type="vec:EEComponentSpecification">
  <Identification>Stecker Modul_EEComponentSpec</Identification>
  <DescribedPart>EEComponent_SteckerModul</DescribedPart>  <!-- PartVersion id -->
</Specification>
```

---

## KBL File Structure

A KBL file uses a `<kbl:KBL_container>` root element with a flatter structure than VEC.

### Key Concepts

| KBL Concept                                       | Description                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| **Connector_housing**                             | Catalog entry for a connector housing (equivalent to PartVersion) |
| **General_terminal**                              | Catalog entry for a terminal/contact                              |
| **General_wire**                                  | Catalog entry for a wire type                                     |
| **Harness**                                       | Container for all occurrences (the actual harness composition)    |
| **Connector_occurrence**                          | A specific usage of a connector housing in the harness            |
| **Terminal_occurrence**                           | A specific usage of a terminal                                    |
| **Wire_occurrence** / **General_wire_occurrence** | A specific usage of a wire                                        |

### Part Catalog Entries

```xml
<Connector_housing id="Na504fba199e67b6e125634fX...">
  <Part_number>TE_ConnectorHousing_2_2310137_1</Part_number>
  <Company_name>asset.te.com</Company_name>
  <Description>TE_2-2310137-1_Minicoax_1Pol</Description>
</Connector_housing>
```

### Occurrences with Part Reference

In KBL, occurrences reference their catalog entry via a `Part` attribute:

```xml
<Harness>
  <Connector_occurrence id="...">
    <Id>X1</Id>
    <Part>Na504fba199e67b6e125634fX...</Part>  <!-- Reference to Connector_housing id -->
    <Installation_information>...</Installation_information>
  </Connector_occurrence>
</Harness>
```

---

## VEC vs KBL: Structural Comparison

| Aspect             | VEC                                                | KBL                                                     |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------- |
| Part catalog       | `PartVersion` elements                             | `Connector_housing`, `General_terminal`, `General_wire` |
| Part usages        | `PartOccurrence` inside `CompositionSpecification` | `*_occurrence` inside `Harness`                         |
| Part reference     | `<Part>` child element on PartOccurrence           | `Part` attribute on occurrence                          |
| Company name field | `CompanyName`                                      | `Company_name`                                          |
| Part number field  | `PartNumber`                                       | `Part_number`                                           |
| Part type          | `PrimaryPartType`                                  | Implicit from element name                              |
| Namespace          | `vec:`                                             | `kbl:`                                                  |
| Complexity         | Higher (multi-level specs, roles, topology)        | Lower (flat catalog + harness)                          |

---

## Blueprint Mapping for BOM Generation

Both file formats are processed by the Mnestix AAS Generator using [blueprints](Mnestix-AAS-Generator-Dataingest-and-Blueprints) that map VEC/KBL data to the IDTA `HierarchicalStructures` submodel. The blueprints use `SMT/CollectionMappingInfo` to iterate over part catalog entries and `SMT/MappingInfo` with JSONata expressions for dynamic values like `idShort`, `globalAssetId`, and `BulkCount`.

### BulkCount JSONata: VEC

```jsonata
($pvId := PartVersion[*]._id;
 $count(DocumentVersion.Specification[
   $lookup($, '_xsi:type') = 'vec:CompositionSpecification'
 ].Component[
   $lookup($, '_xsi:type') = 'vec:PartOccurrence' and Part = $pvId
 ]))
```

**Explanation:**

- `PartVersion[*]._id` — The current PartVersion's XML `id` attribute (injected by CollectionMappingInfo iteration)
- `$lookup($, '_xsi:type')` — Required because `xsi:type` is a namespaced XML attribute; after XML-to-JSON conversion, it becomes `_xsi:type` and must be accessed via `$lookup()` to avoid JSONata parser issues with the colon
- `Part = $pvId` — Matches PartOccurrences that reference this PartVersion via their `<Part>` element

### BulkCount JSONata: KBL

```jsonata
($chId := Connector_housing[*]._id;
 $count(Harness.Connector_occurrence[Part = $chId]))
```

**Explanation:**

- Simpler because KBL has a flat structure: occurrences live directly under `Harness`
- `Part = $chId` — Direct reference match (same pattern as VEC)

### JSONata Tips for VEC/KBL Processing

- **Namespaced attributes** (`xsi:type`): Use `$lookup($, '_xsi:type')` instead of dot notation
- **Root context in nested predicates**: Use `$$` to anchor lookups against top-level collections when inside nested filter expressions
- **Collection iteration**: The `[*]` suffix in `PartVersion[*]` or `Connector_housing[*]` is the CollectionMappingInfo syntax — it tells the generator which item in the current iteration to use

---

## Parts Without Occurrences (BulkCount = 0)

Some PartVersions in a VEC file may not have any PartOccurrences referencing them. This happens when:

- Parts exist in the catalog but aren't used in the specific harness variant
- Terminals (contacts) are not tracked as occurrences in VEC (unlike KBL)
- Tapes, grommets, or other accessories lack occurrence data

These parts will get a BulkCount of 0. The Mnestix frontend handles this by hiding entities with a BulkCount ≤ 0 from the BOM display.

> **Note:** Server-side filtering via `SMT/FilterMappingInfo` does not work for this use case because FilterMappingInfo is evaluated **before** CollectionMappingInfo duplicates the elements. It cannot access per-item data.

---

## File Examples

This repository includes example files for testing:

- **`Example.vec`** — A VEC file with EEComponents, ConnectorHousings, and Wires, including proper `<Part>` references on all PartOccurrences
- **`Example.kbl`** — A KBL file with ConnectorHousings, Terminals, and Wires from TE Connectivity (using `asset.te.com` as company name)

### Blueprint Templates

- `templates/hierarchical-structures-dynamic-vec-template.json` — VEC → HierarchicalStructures
- `templates/hierarchical-structures-dynamic-kbl-template.json` — KBL → HierarchicalStructures

---

## References

- [VEC Standard (prostep iViP)](https://ecad-wiki.prostep.org/specifications/vec/)
- [KBL Standard (prostep iViP)](https://ecad-wiki.prostep.org/specifications/kbl/)
- [IDTA HierarchicalStructures Submodel](https://industrialdigitaltwin.org/content-hub/aasx-package-explorer/submodel-template/idta-02011-hierarchical-structures-enabling-bill-of-material)
- [Mnestix AAS Generator Blueprint Docs](Mnestix-AAS-Generator-Dataingest-and-Blueprints)
