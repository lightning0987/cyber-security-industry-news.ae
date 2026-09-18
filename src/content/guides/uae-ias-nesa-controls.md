---
title: "UAE IAS v2 Controls: 188 Requirements and 39 Priorities"
h1: "UAE Information Assurance Standard v2 Explained"
description: "UAE IAS v2 sets 188 controls, 60 management and 128 technical, with 39 Priority One controls mandatory for everything in scope."
summary: "The UAE Information Assurance Standard, version 2, sets 188 controls for critical national infrastructure operators and government entities across all emirates. It is issued federally and it names 39 Priority One controls that are mandatory for everything inside its scope."
standard: "UAE IAS v2"
order: 2
image: "substation"
updated: "2026-09-17"
keyFacts:
  - label: "Issuing body"
    value: "Signals Intelligence Agency, successor to NESA"
  - label: "Current version"
    value: "Version 2, published 2025"
  - label: "Total controls"
    value: "188, split into 60 management and 128 technical"
  - label: "Mandatory subset"
    value: "39 Priority One controls, no risk-based tailoring"
  - label: "Jurisdiction"
    value: "Federal, all seven emirates"
faq:
  - q: "What are the 39 Priority One controls in UAE IAS v2?"
    a: "Priority One controls are the subset of the 188 controls that are mandatory for everything inside the scope of the standard, without the risk-based tailoring that applies elsewhere. They are the correct first work package because they are unavoidable, finite, and establish the baseline against which the remaining controls are assessed."
  - q: "Who counts as critical national infrastructure under UAE IAS v2?"
    a: "The category is defined by the consequence of disruption rather than by industry label. Energy, water, telecommunications, transport and parts of finance and health can all fall inside it depending on what a given operator runs. The designation belongs to the authority that makes it, so confirm it with them rather than inferring it from your sector."
  - q: "Does UAE IAS v2 replace DESC ISR v3?"
    a: "No. UAE IAS v2 is federal and applies across all emirates to critical national infrastructure and government entities. DESC ISR v3 is an emirate-level regulation applying in Dubai with its own 13 control domains. An organisation in Dubai can fall under both, and meeting one does not discharge the other."
  - q: "How does penetration testing map to UAE IAS v2 controls?"
    a: "Testing produces evidence for the technical control families specifically: network security, access control and system hardening. A scoped test generates dated findings that map to those controls, and a retest generates the record that a finding was closed. It produces no evidence for management controls such as supplier assessment or continuity exercises, which need their own artefacts."
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

> **Start here.** Of 188 controls, 39 are not negotiable. Work spent on them is never wasted by
> a later risk decision. That is not true of the controls outside the subset.

## Who falls inside the scope

IAS v2 applies to two categories.

1. Operators of critical national infrastructure.
2. Government entities, across all seven emirates.

Unlike DESC ISR v3, which is an emirate-level regulation applying in Dubai, IAS v2 is federal.
An organisation in Dubai can therefore fall under both, and meeting one does not discharge the
other.

Critical national infrastructure is the harder category to self-assess. It is defined by the consequence of disruption rather
than by industry label. Energy, water, telecommunications, transport and parts of finance and
health can all fall inside it, depending on what a given operator runs.

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

Programmes usually underestimate the technical half. Technical controls outnumber management
controls by more than two to one, and they drift. A management control stays
satisfied until policy changes. A technical control stops being satisfied the moment a
configuration changes, which can happen without anyone deciding anything.

> **The drift problem.** An annual assessment tells you a technical control was satisfied on one
> day of the year. Continuous verification tells you whether it still is. The gap between those
> two statements is where most incidents happen.

## Start with the 39 Priority One controls

The standard resolves the sequencing question itself. Priority One controls are mandatory for
everything in scope, so they are not subject to the same risk-based tailoring as the rest.

That makes them the correct first work package for three reasons. They are unavoidable, so
effort spent there is never wasted. They are finite, so the work has a defined end. And they
establish the baseline against which the remaining controls are assessed.

Treat everything outside that subset as the second phase, scoped by risk. Plan the technical
portion separately from the management portion, because they need different people and
different evidence.

## What evidence assessors expect

The evidentiary standard is the same as elsewhere in UAE regulation: demonstration rather than
description. An assessor accepts a dated artefact showing a control operated, not a policy
stating that it should.

For the technical controls, that means configuration exports, log samples, access review
outputs and test results, each carrying a date and a defined scope.

Penetration testing produces evidence for the technical control families specifically. A scoped test against network security, access
control and system hardening generates dated findings mapped to those controls. A retest
generates the record that a finding was closed. That is
what testing contributes to an IAS programme, and it is the whole of what it contributes.

Management controls need their own artefacts. No test result demonstrates that a supplier was
assessed or that a continuity plan was exercised.

### Why the split matters for sequencing

Management controls can be written once and reviewed annually. Technical controls have to be
verified on a cadence, because a configuration change silently withdraws them. A programme that
treats both halves the same way will pass its first assessment and fail its second.

## Where IAS sits among the other regimes

IAS v2 is federal and applies across all emirates. DESC ISR v3 is emirate-level and applies in
Dubai, with 13 control domains of its own. The two overlap substantially in subject matter while
remaining separate obligations.

The UAE Personal Data Protection Law governs personal data federally and is separate from both.
Meeting IAS does not satisfy it.

Firms authorised in the Dubai International Financial Centre also sit under DFSA Technology and
Risk Management rules and the DIFC data protection regime.

## What the ransomware data adds

[Energy and Utilities](/uae-ransomware-tracker/energy-utilities/) and
[Transportation](/uae-ransomware-tracker/transportation/) are the two sectors on this tracker
most likely to sit inside critical national infrastructure. Neither carries a large count.
Energy and Utilities holds 4 claimed organisations and Transportation holds 6, against a
[site total](/uae-ransomware-tracker/) of 108.

Those small numbers are the point. A sector with few claims can still carry the heaviest
regulatory exposure per incident, because consequence rather than frequency defines critical
national infrastructure. Reading claim counts as a proxy for risk fails precisely here.

### Re-verification is part of the control

Treat each technical control as having two states: implemented and verified. Implementation is a
one-time act. Verification has a date, and that date ages. An assessment asks for the second
state, not the first.

### How much of the UAE record sits inside IAS territory

Three sectors on this tracker correspond to the critical national infrastructure categories that
IAS most often reaches. Those three hold 23 of the 108 attributed UAE claims, which is 21.3% of
the published record.

| Sector usually in IAS scope | Claimed UAE organisations |
| --- | --- |
| Government and Defense | 13 |
| Transportation | 6 |
| Energy and Utilities | 4 |

That share is smaller than the share sitting in DESC ISR territory, and the contrast is the useful
part. IAS covers a narrower set of organisations under a heavier standard. An organisation inside
it carries 188 controls against a claim record that is thinner than the national average.

Do not read the smaller number as a smaller risk. Consequence, not frequency, is what put these
sectors inside the standard. A single successful intrusion against a water utility or an airport
operator has a national effect that 24 claims against professional services firms do not.

The designating authority decides scope, so treat the table as an indication of where IAS
obligations cluster rather than as a scoping test.

## Practical sequence

1. Confirm your designation with the authority that made it, rather than inferring it from your
   industry.
2. Complete the 39 Priority One controls first, because the standard makes them mandatory
   without tailoring.
3. Split the remaining work into management and technical streams, since 128 of the 188 controls
   are technical.
4. Produce dated evidence for technical controls and retest after remediation.
5. Re-evaluate technical controls on a schedule, because configuration drifts without a decision.
6. Check whether [DESC ISR v3](/guides/desc-isr-compliance-dubai/) or the
   [UAE PDPL](/guides/uae-pdpl-breach-notification/) also apply, since each is a separate
   obligation.

## Sources

Read the standard from the issuing authority before acting on any summary, including this one.

- Signals Intelligence Agency, issuing authority for the UAE Information Assurance Standard
- UAE Cyber Security Council, federal cyber security body
- Telecommunications and Digital Government Regulatory Authority, federal regulator
