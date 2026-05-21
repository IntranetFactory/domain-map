# APQC Process Classification Framework — License & Attribution

This repository's `domain_map` Semantius module loads APQC's Cross-Industry **Process Classification Framework® (PCF)** as the master `processes` catalog. APQC requires attribution; the verbatim notice from APQC's distribution is reproduced below.

## Loaded version

- **Cross-Industry PCF v8.0** (generated 2026-02-25 by APQC)
- Source workbook: `K016808_APQC Process Classification Framework (PCF) - Cross-Industry - Excel Version 8.0.xlsx` (repo root)
- Loaded into: `domain_map.processes` rows where `source_framework = 'apqc_pcf_cross_industry'`
- Mapping:
  - `process_code` ← Hierarchy ID (e.g. `1.1.1.4`)
  - `process_name` ← Name
  - `description` ← Element Description
  - `external_id` ← PCF ID (e.g. `19945`)
  - `hierarchy_level` ← derived from Hierarchy ID shape (1–5)
  - `parent_process_id` ← resolved from Hierarchy ID prefix

## Verbatim copyright and attribution notice

> **COPYRIGHT AND ATTRIBUTION**
>
> ©2026 APQC. ALL RIGHTS RESERVED. This Process Classification Framework® ("PCF") is the copyrighted intellectual property of APQC. APQC encourages the wide distribution, discussion, and use of the PCF for classifying and defining organizational processes. Accordingly, APQC hereby grants you a perpetual, worldwide, royalty-free license to use, copy, publish, modify, and create derivative works of the PCF, provided that all copies of the PCF and any derivative works contain a copy of this notice.

## About APQC (verbatim, from the source workbook)

> **ABOUT APQC**
>
> An internationally recognized resource for process and performance improvement, APQC helps organizations adapt to rapidly changing environments, build new and better ways to work, and succeed in a competitive marketplace. With a focus on productivity, knowledge management, benchmarking, and quality improvement initiatives, APQC works with its member organizations to identify best practices; discover effective methods of improvement; broadly disseminate findings; and connect individuals with one another and the knowledge, training, and tools they need to succeed. Founded in 1977, APQC is a member-based nonprofit serving organizations around the world in all sectors of business, education, and government. APQC is also a proud winner of the 2003, 2004, 2008, 2012, and 2013 North American Most Admired Knowledge Enterprises (MAKE) awards. This award is based on a study by Teleos, a European based research firm, and the KNOW network.

For more information about the PCF, see [www.apqc.org/pcf](https://www.apqc.org/pcf).
