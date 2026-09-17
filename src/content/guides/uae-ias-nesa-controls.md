---
title: "UAE IAS v2 Controls: 188 Requirements and 39 Priorities"
h1: "UAE Information Assurance Standard v2 Explained"
description: "UAE IAS v2 sets 188 controls, 60 management and 128 technical, with 39 Priority One controls mandatory for everything in scope."
summary: "The UAE Information Assurance Standard, version 2, sets 188 controls for critical national infrastructure operators and government entities across all emirates. It is issued federally and it names 39 Priority One controls that are mandatory for everything inside its scope."
standard: "UAE IAS v2"
order: 2
updated: "2026-09-17"
---

## What UAE IAS v2 is

The UAE Information Assurance Standard is the federal control baseline for information
assurance. Version 2 was published in 2025. It is issued by the Signals Intelligence Agency,
which absorbed the functions of the former National Electronic Security Authority.

IAS v2 contains 188 controls in total. Those split into 60 management controls and 128 technical
controls. A further subset of 39 controls carries Priority One status.

The Priority One designation is the single most useful thing to understand about this standard.
Those 39 controls are mandatory for everything inside the scope of IAS v2, without the
risk-based tailoring that applies elsewhere in the standard.

## Who falls inside the scope

IAS v2 applies to two categories.

1. Operators of critical national infrastructure.
2. Government entities, across all seven emirates.

Unlike DESC ISR v3, which is an emirate-level regulation applying in Dubai, IAS v2 is federal.
An organisation in Dubai can therefore fall under both, and meeting one does not discharge the
other.

Critical national infrastructure is the harder category to self-assess. It is defined by the
consequence of disruption rather than by industry label, which means energy, water,
telecommunications, transport and parts of finance and health can all fall inside it depending
on what a given operator actually runs.

### How to establish whether IAS reaches you

Ask whether a sustained outage of your systems would have national rather than commercial
consequence. Ask whether a regulator has already designated you. Ask whether a government
contract names the standard. As with ISR, the answer belongs to the designating authority and
not to your own reading.

## Management controls and technical controls fail differently

The 60 management controls cover governance, risk, human resources security, asset management,
supplier relationships and continuity. They are satisfied with documented decisions, assigned
ownership and records that something was reviewed by someone accountable.

The 128 technical controls cover access control, cryptography, network security, system
acquisition and development, operations security, logging and incident handling. They are
satisfied with configuration, telemetry and test results.

Programmes usually underestimate the technical half. There are more than twice as many technical
controls as management controls, and technical controls drift. A management control stays
satisfied until policy changes. A technical control stops being satisfied the moment a
configuration changes, which can happen without anyone deciding anything.

## Start with the 39 Priority One controls

The standard resolves the sequencing question itself. Priority One controls are mandatory for
everything in scope, so they are not subject to the same risk-based tailoring as the rest.

That makes them the correct first work package for three reasons. They are unavoidable, so
effort spent there is never wasted. They are finite, so the work has a defined end. And they
establish the baseline against which the remaining controls are assessed.

Treat the other 149 controls as the second phase, scoped by risk, and plan the technical portion
separately from the management portion because they need different people and different
evidence.

## What evidence assessors expect

The evidentiary standard is the same as elsewhere in UAE regulation: demonstration rather than
description. An assessor accepts a dated artefact showing a control operated, not a policy
stating that it should.

For the technical controls, that means configuration exports, log samples, access review
outputs and test results, each carrying a date and a defined scope.

Penetration testing produces evidence for the technical control families specifically. A scoped
test against network security, access control and system hardening generates dated findings that
map to those controls, and a retest generates the record that a finding was closed. That is
what testing contributes to an IAS programme, and it is the whole of what it contributes.

Management controls need their own artefacts. No test result demonstrates that a supplier was
assessed or that a continuity plan was exercised.

## Where IAS sits among the other regimes

IAS v2 is federal and applies across all emirates. DESC ISR v3 is emirate-level and applies in
Dubai, with 13 control domains of its own. The two overlap substantially in subject matter while
remaining separate obligations.

The UAE Personal Data Protection Law governs personal data federally and is separate from both.
Meeting IAS does not satisfy it.

Firms authorised in the Dubai International Financial Centre also sit under DFSA Technology and
Risk Management rules and the DIFC data protection regime.

## What the ransomware data adds

Energy and Utilities and Transportation are the two sectors on this tracker most likely to sit
inside critical national infrastructure. Neither carries a large count. Energy and Utilities
holds 4 claimed organisations and Transportation holds 6.

Those small numbers are the point. A sector with few claims can still carry the heaviest
regulatory exposure per incident, because consequence rather than frequency defines critical
national infrastructure. Reading claim counts as a proxy for risk fails precisely here.

## Practical sequence

1. Confirm your designation with the authority that made it, rather than inferring it from your
   industry.
2. Complete the 39 Priority One controls first, because the standard makes them mandatory
   without tailoring.
3. Split the remaining work into management and technical streams, since 128 of the 188 controls
   are technical.
4. Produce dated evidence for technical controls and retest after remediation.
5. Re-evaluate technical controls on a schedule, because configuration drifts without a decision.
6. Check whether DESC ISR v3 or the UAE PDPL also apply, since each is a separate obligation.

## Sources

Read the standard from the issuing authority before acting on any summary, including this one.

- Signals Intelligence Agency, issuing authority for the UAE Information Assurance Standard
- UAE Cyber Security Council, federal cyber security body
- Telecommunications and Digital Government Regulatory Authority, federal regulator
