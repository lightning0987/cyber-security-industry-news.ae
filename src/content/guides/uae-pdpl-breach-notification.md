---
title: "UAE PDPL Breach Notification: What Controllers Must Do"
h1: "UAE PDPL Breach Notification Requirements"
description: "The UAE Personal Data Protection Law requires controllers to notify the UAE Data Office of a personal data breach. What the law actually says."
summary: "Federal Decree-Law No. 45 of 2021 governs personal data across the United Arab Emirates and requires controllers to notify the UAE Data Office of a breach that risks the rights of data subjects. The precise deadline sits in the Executive Regulations, and that is the detail most summaries get wrong."
standard: "UAE PDPL"
order: 3
image: "abu-dhabi"
updated: "2026-09-17"
keyFacts:
  - label: "Instrument"
    value: "Federal Decree-Law No. 45 of 2021"
  - label: "Enacted"
    value: "26 September 2021"
  - label: "Supervisor"
    value: "UAE Data Office"
  - label: "Scope"
    value: "Federal, excluding the DIFC and ADGM free zones"
  - label: "Breach duty"
    value: "Controller notifies the Office; processor notifies the controller"
faq:
  - q: "How long do I have to report a breach under the UAE PDPL?"
    a: "The decree-law requires notification immediately on becoming aware, within a period specified in the Executive Regulations. Many published summaries state a flat 72 hours by analogy with the European GDPR. Confirm the operative figure against the published regulation text rather than a secondary summary. In practice an organisation that cannot assemble the required content within three days will miss any deadline in this range."
  - q: "Does the UAE PDPL apply to companies in the DIFC or ADGM?"
    a: "No. The Dubai International Financial Centre applies DIFC Data Protection Law No. 5 of 2020 and Abu Dhabi Global Market applies the ADGM Data Protection Regulations 2021. Each has its own supervisor. Registration determines which regime applies, not physical location and not where customers are. A group spanning a free zone and the mainland answers to both, separately."
  - q: "What must a UAE PDPL breach notification contain?"
    a: "The nature and form of the breach, its causes, the approximate number of records affected, the Data Protection Officer's details, the expected effects, and the measures taken to address the breach and limit its consequences. That list is effectively the specification for your incident response, because you cannot notify without being able to produce each item."
  - q: "Who notifies the regulator, the controller or the processor?"
    a: "The controller notifies the UAE Data Office. A processor that becomes aware of a breach must notify the controller immediately. The chain runs processor to controller to regulator, which means a processor that tells you late makes you late. Flow the timing obligation into processor contracts explicitly."
---

## What the UAE PDPL is

Federal Decree-Law No. 45 of 2021 is the United Arab Emirates Personal Data Protection Law. It
was enacted on 26 September 2021 and applies federally to organisations processing the personal
data of individuals in the UAE.

The law establishes the UAE Data Office as the supervisory authority. It sets out lawful bases
for processing, rights for data subjects, obligations for controllers and processors, and duties
that arise when personal data is breached.

The PDPL applies regardless of sector. A manufacturer, a school and a logistics operator all sit
inside it, because the trigger is personal data rather than industry.

## The free zone carve-out

Two financial free zones operate their own data protection regimes rather than the federal one.

The Dubai International Financial Centre applies DIFC Data Protection Law No. 5 of 2020,
supervised by the DIFC Commissioner of Data Protection. Abu Dhabi Global Market applies the ADGM
Data Protection Regulations 2021, supervised by its Office of Data Protection.

An organisation registered in one of those free zones answers to that zone's regime. An
organisation outside them answers to the federal PDPL. A group operating both inside and outside
a free zone answers to both, separately.

## What the law requires when a breach happens

The PDPL requires a controller that becomes aware of a personal data breach to notify the UAE
Data Office. The duty arises where the breach poses a risk to the privacy, confidentiality or
security of a data subject's data. Where that risk is material, the controller must notify the
individual as well.

A processor that becomes aware of a breach must notify the controller immediately. The chain
runs processor to controller to regulator, and it is the controller who carries the obligation
to the Data Office.

The notification itself is prescriptive. It must describe the nature and form of the breach, its
causes, and the approximate number of records affected. It must also give the Data Protection
Officer's details, the expected effects, and the measures taken to limit the consequences.

### The deadline question, stated honestly

The text of the decree-law requires notification immediately on becoming aware, within a period
specified in the Executive Regulations. Published summaries commonly state a flat 72 hours,
by analogy with the European General Data Protection Regulation.

Treat that figure with caution. The operative deadline is whatever the Executive Regulations
set, and the regulations were issued years after the law itself. Confirm the current number
against the published regulation text rather than against a secondary summary, including this
one.

> **Why this matters more than it looks.** A guide that states a deadline it has not verified
> hands you a number you will plan against. If it is wrong, the plan is wrong. The honest answer
> is that the decree-law defers the figure and you must read the regulations.

The practical consequence is the same either way. An organisation that cannot assemble the
required notification content inside three days will miss any deadline in this range.

## What to prepare before an incident

The notification content list is the specification for your incident response. Work backwards
from it.

1. Identify who holds the controller role and who holds the processor role for each system,
   because the obligation follows that split.
2. Appoint and record a Data Protection Officer where one is required, since their details form
   part of the notification.
3. Maintain a record of processing that lets you state the approximate number of affected
   records without a forensic project.
4. Define who decides that a breach poses a risk to data subjects, because that judgement starts
   the clock.
5. Write the notification template in advance, since drafting under time pressure is where the
   required detail gets lost.
6. Contract processor notification duties explicitly, because a processor that tells you late
   makes you late.

### Who inside the organisation makes the call

The clock starts when the controller becomes aware. That makes awareness an organisational fact
rather than a technical one, and it needs a named owner.

Decide in advance who declares that an event is a personal data breach, and who decides whether
it poses a risk to data subjects. Without those two names, the first hours of an incident are
spent deciding who decides.

## Where security testing fits

The PDPL requires appropriate technical and organisational measures to protect personal data.
That obligation is continuous rather than event-driven.

Penetration testing produces dated evidence that measures protecting personal data were tested
and that findings were closed. That evidence has two uses: it supports the appropriateness of
measures before an incident, and it demonstrates diligence afterwards.

It does not discharge the notification duty, and no test result substitutes for the record of
processing that a notification requires.

## What the ransomware data adds

Personal data exposure is not confined to regulated sectors. On this tracker,
[Professional Services](/uae-ransomware-tracker/professional-services/) carries the most claimed
organisations at 24, followed by
[Government and Defense](/uae-ransomware-tracker/government-defense/) and
[Technology](/uae-ransomware-tracker/technology/) at 13 each.

Professional firms hold personal data belonging to their clients rather than to themselves. That
places them in the controller or processor chain for data they did not collect, which is exactly
the situation the PDPL's processor obligations address.

[Healthcare](/uae-ransomware-tracker/healthcare/) and
[Education](/uae-ransomware-tracker/education/) carry small counts on this tracker, at 6 and 2.
Both hold identity records for people who cannot easily choose another provider, which changes
what an incident costs the data subject rather than the organisation.

> **Small count, high consequence.** Ranking sectors by claim volume ranks them by attacker
> opportunity, not by what an incident costs the people whose records are held. Those are
> different questions and the data answers only the first.

### How much of the UAE record falls under a notification duty

The PDPL follows personal data rather than industry, so its reach across this tracker is close to
total. Sectors that process personal data as a matter of course account for 106 of the 108
attributed UAE claims. That is 98.1% of the published record.

| Most claimed sector | Claimed UAE organisations |
| --- | --- |
| Professional Services | 24 |
| Government and Defense | 13 |
| Technology | 13 |
| Financial Services | 11 |
| Retail and E-Commerce | 10 |

Eight further sectors carry the remainder. The practical reading is that a ransomware claim
against a UAE organisation almost always raises a personal data question at the same time.

That matters for sequencing. A notification assessment cannot start after the technical response
finishes, because the assessment needs facts that only the early hours of the response produce.
Which categories of data sat on the affected systems is a question for hour one, not for week two.

The 98.1% figure counts sectors rather than individual organisations. An organisation holding no
personal data sits outside the duty while remaining inside its sector row. Read the share as a
statement about how often the question arises, not about how often the duty is triggered.

## Practical sequence

1. Establish whether you sit under the federal PDPL or under a
   [free zone regime](/guides/difc-adgm-data-protection-comparison/), because the answer changes
   the regulator and the rules.
2. Confirm the current notification deadline against the Executive Regulations text, not a
   summary.
3. Map controller and processor roles across your systems before an incident forces the question.
4. Build the notification content list into your incident runbook.
5. Flow notification duties to processors through contract terms with explicit timing.
6. Keep dated evidence that protective measures were tested, since appropriateness is judged
   after the fact.

## Sources

Read the legislation from the official source before acting on any summary, including this one.

- UAE Legislation portal, official text of federal decree-laws
- Telecommunications and Digital Government Regulatory Authority, federal regulator
- UAE Cyber Security Council, federal cyber security body
