---
title: "DESC ISR v3 Compliance in Dubai: 13 Control Domains"
h1: "DESC ISR v3 Compliance Requirements in Dubai"
description: "DESC ISR v3 sets 13 control domains for Dubai government entities and their suppliers. Who falls in scope and what evidence assessors expect."
summary: "The Dubai Electronic Security Center issues the Information Security Regulation, now at version 3. It binds Dubai government entities, semi-government organisations, cloud providers serving Dubai government, and suppliers handling government data."
standard: "DESC ISR v3"
order: 1
image: "dubai-skyline"
updated: "2026-09-17"
keyFacts:
  - label: "Issuing body"
    value: "Dubai Electronic Security Center"
  - label: "Current version"
    value: "Version 3, published 2023"
  - label: "Structure"
    value: "13 control domains"
  - label: "Alignment"
    value: "Methodologically aligned with ISO 27001 and NIST CSF"
  - label: "Jurisdiction"
    value: "Emirate of Dubai"
faq:
  - q: "Does DESC ISR v3 apply to private companies in Dubai?"
    a: "Not directly. ISR v3 binds Dubai government entities, semi-government organisations and cloud providers serving the Dubai government. A private company falls in scope as a key supplier handling government data, and the obligation arrives through a contract clause rather than through the regulation itself. Check the security annex of any government contract you hold."
  - q: "Is DESC ISR v3 the same as ISO 27001?"
    a: "No. ISR v3 is methodologically aligned with ISO 27001 and the NIST Cybersecurity Framework, which means existing work maps across rather than starting again. It remains a separate regulation with its own 13 control domains and its own assessment process. Holding an ISO 27001 certificate does not demonstrate ISR compliance."
  - q: "What evidence does a DESC ISR v3 assessor accept?"
    a: "Dated artefacts showing a control operated, not documents describing that it should. For a technical domain that means configuration exports, log samples, access review outputs and test results, each carrying a date and a defined scope. A policy is not evidence that the policy is followed."
  - q: "Does meeting DESC ISR v3 satisfy the UAE PDPL?"
    a: "No. The UAE Personal Data Protection Law is a separate federal obligation governing personal data, and it is not discharged by meeting an emirate-level security regulation. An organisation can be inside the scope of ISR v3, the UAE Information Assurance Standard and the PDPL at the same time, and each requires its own evidence."
---

## What DESC ISR v3 is

The Dubai Electronic Security Center issues the Information Security Regulation, known as ISR.
Version 3 was published in 2023. DESC is the Dubai government body responsible for cyber
security across the emirate, and ISR is its baseline control set.

ISR v3 organises requirements into 13 control domains. Those domains cover information
classification, access management, cryptography, secure development, supplier security,
incident response, business continuity, security operations and cloud security.

ISR v3 is methodologically aligned with ISO 27001 and the NIST Cybersecurity Framework. That is a fact about how the
regulation is structured. It is useful in one practical way: work already done against either
framework maps across rather than starting again.

> **Alignment is not equivalence.** Holding an ISO 27001 certificate does not demonstrate ISR
> compliance. The alignment means the control language is familiar and the mapping exercise is
> shorter, not that one substitutes for the other.

## Who falls inside the scope

ISR v3 binds four groups.

1. Dubai government entities.
2. Semi-government organisations operating in the emirate.
3. Cloud providers serving the Dubai government.
4. Key suppliers that handle Dubai government data.

The fourth category is the one most private firms miss. A consultancy, a software vendor or a
managed service provider does not fall under ISR because of what it is. It falls under ISR
because of a contract clause that flows the obligation down from a government client.

That distinction matters for how you find out. Government entities know they are in scope.
Suppliers usually discover it when a contract renewal arrives with a security schedule
attached.

### How to establish whether ISR reaches you

Check whether any current contract names DESC or ISR in its security annex. Check whether you
store, process or transmit data belonging to a Dubai government entity. Check whether you
operate infrastructure that a Dubai government entity depends on. Any yes puts the question to
your client rather than to your own judgement.

## What the 13 control domains ask for

ISR v3 is a control set, not a management-system standard alone. The domains split roughly into
governance and technical obligations.

Governance domains cover classification of information, ownership of risk, supplier assurance
and continuity planning. These are answered with documents, assigned roles and evidence that
decisions were made by someone with authority.

Technical domains cover access management, cryptography, secure development, security operations
and cloud security. These are answered with configuration, logging and test results.

The distinction matters because the two halves fail differently. Governance controls usually
fail in review, because a document exists but nobody owns it. Technical controls usually fail in
testing, because a setting drifted after the last audit.

## What evidence assessors expect

Assessors ask to be shown, not told. A policy that describes access review is not evidence that
access review happens. The artefact they want is the output: a dated review, the accounts it
covered, the accounts it removed, and who signed it.

For the technical domains, that principle produces a specific expectation. A control that claims
the external perimeter is hardened needs a test result behind it, dated, scoped and repeatable.

Penetration testing produces exactly that kind of evidence. A test against the external perimeter generates dated,
scoped findings that map onto the technical control domains of ISR v3. A retest generates the
record that a finding was closed. That is the evidentiary
role of testing in an ISR programme.

> **What an assessor asks for.** They ask to see the last test, its scope, its findings, and the
> retest that closed them. A programme that cannot produce those four artefacts has a control
> gap, whatever it spends on testing.

### Where testing does not help

Testing produces no evidence for a governance domain. No test result demonstrates that
information has been classified, that a supplier has been assessed, or that continuity plans
have been exercised. Those need their own artefacts.

### The order that saves the most work

Map before you build. ISR v3 shares structure with ISO 27001 and NIST CSF, so an organisation
with either already has most of the governance evidence. Starting a fresh programme instead of
mapping an existing one is the most common way ISR work doubles in cost.

## How ISR relates to the other UAE regimes

ISR v3 is an emirate-level regulation. It applies in Dubai. The UAE Information Assurance
Standard applies federally to critical national infrastructure and government entities across
all emirates, and an organisation can fall under both.

The UAE Personal Data Protection Law is separate again. It governs personal data at federal
level regardless of sector, and it is not satisfied by meeting ISR.

Firms authorised in the Dubai International Financial Centre sit under DFSA Technology and Risk
Management rules and the DIFC data protection regime. Both are distinct from ISR and from the
federal law.

## What the ransomware data adds

[Government and Defense](/uae-ransomware-tracker/government-defense/) is the second most
claimed UAE sector on this tracker, with 13 claimed organisations. Its claims peaked at 6 in
[2024](/uae-ransomware-tracker/2024/) and have declined since.
[Professional Services](/uae-ransomware-tracker/professional-services/), which supplies that
sector, is the most claimed sector of all at 24.

That pairing is the practical argument for the supplier-security domain. Attackers reach government data through the
organisations that hold it under contract. That is the route ISR v3 addresses by extending
obligations down the supply chain.

### A note on scope creep

ISR obligations that arrive through a contract cover the systems named in that contract. They do
not automatically cover the whole estate.

Establishing the boundary early keeps the programme proportionate. It also makes the evidence
easier to produce, because a narrower scope means fewer artefacts.

## Practical sequence

1. Establish whether ISR reaches you directly or through a contract, and get that answer from
   the contracting entity rather than assuming.
2. Map existing ISO 27001 or NIST CSF work onto the 13 domains before starting anything new,
   because the alignment is deliberate.
3. Separate governance gaps from technical gaps, since they need different artefacts and
   different people.
4. Produce dated evidence for the technical domains rather than descriptions of intent.
5. Retest after remediation, because the closing record is what an assessor accepts.
6. Check whether [UAE IAS v2](/guides/uae-ias-nesa-controls/) or the
   [UAE PDPL](/guides/uae-pdpl-breach-notification/) also apply to you, since meeting ISR does
   not discharge either.

## Sources

DESC publishes ISR and its supporting material. Read the regulation text from the issuing body
before acting on any summary, including this one.

- Dubai Electronic Security Center, the issuing authority for ISR
- Telecommunications and Digital Government Regulatory Authority, federal regulator
- UAE Cyber Security Council, federal cyber security body
