---
title: "UAE Ransomware Leaders Have Changed in Every Period"
h1: "UAE Ransomware Leadership Has Turned Over in Every Period Since 2023"
description: "LockBit 3.0 led 2023, Stormous led 2024, Everest led 2025 and DragonForce leads 2026. No group has led two consecutive periods on this tracker."
dek: "Four periods, four different leading groups, and none of them led twice. The pattern makes actor-specific defence a poor investment in the United Arab Emirates, because the actor changes faster than a security programme does."
category: "threat-intel"
tier: "T2"
image: "fibre-network"
published: "2026-09-16"
entities:
  sectors: ["professional-services", "government-defense"]
  groups: ["lockbit3", "stormous", "everest", "dragonforce", "thegentlemen"]
  periods: ["2023", "2024", "2025", "2026"]
sources:
  - label: "UAE ransomware tracker"
    href: "/uae-ransomware-tracker/"
  - label: "Ransomware groups targeting the UAE"
    href: "/ransomware-groups-targeting-uae/"
  - label: "Methodology and attribution rules"
    href: "/methodology/"
  - label: "ransomware.live, leak-site monitoring"
    href: "https://www.ransomware.live/"
---

## What happened

Four consecutive periods on this tracker have four different leading ransomware groups.
[LockBit 3.0](/ransomware-groups-targeting-uae/lockbit3/) led
[2023](/uae-ransomware-tracker/2023/) with 5 claimed UAE organisations.
[Stormous](/ransomware-groups-targeting-uae/stormous/) led
[2024](/uae-ransomware-tracker/2024/) with 5.
[Everest](/ransomware-groups-targeting-uae/everest/) led
[2025](/uae-ransomware-tracker/2025/) with 6.


[DragonForce](/ransomware-groups-targeting-uae/dragonforce/) leads
[2026](/uae-ransomware-tracker/2026/) with 4.

No group has led two consecutive periods.

## The turnover is faster than it looks

Leading a period is not the same as being present in the one before. Everest had claimed no UAE
organisation at all before May 2025, and led that year. DragonForce had no UAE record before
November 2025, and leads 2026.

The Gentlemen matches DragonForce at 4 claims in 2026. It had no UAE record before February of
that year. Two of the three most active groups of the current period did not exist on this
tracker eight months earlier.

Meanwhile LockBit 3.0 still ranks first of 46 groups by accumulated claims. It has published
nothing against a UAE organisation since 16 February 2024. An all-time ranking and a current
threat picture are not the same list.

## What persists instead

Sectors persist where groups do not.
[Professional Services](/uae-ransomware-tracker/professional-services/) has carried claims in
every period on record, and leads the whole dataset with 24 claimed organisations. It drew 3
claims across 2020 to 2022, then 4, then 7, then 5, then 5.

[Government and Defense](/uae-ransomware-tracker/government-defense/) is the exception that
proves the rule. It peaked at 6 claims in 2024 and has fallen in every period since, reaching 1
in 2026. Sector patterns change over years, not months.

That difference in timescale is the practical point.

A security programme is planned in quarters and delivered in years. The attacker population
here turns over inside one.

## What this does not mean

Group-level intelligence still has uses. Knowing which operations target your sector informs
tabletop exercises and helps interpret an incident once it starts.

The claim here is narrower. A control set built around the published methods of the leading
group protects against one actor. That actor will probably not lead the next period.

 The 39 Priority One controls in [UAE IAS v2](/guides/uae-ias-nesa-controls/) survive that
turnover. So do the 13 control domains of [DESC ISR v3](/guides/desc-isr-compliance-dubai/).

## What a defender can actually use

Group-level detail is most useful in two narrow places. It informs a tabletop exercise, because
a scenario needs a plausible adversary. And it helps interpret an incident once one has started,
because a named operation implies a known sequence.

Neither use requires predicting who leads next year. Both work with whoever is active at the
time, which is the only form of group intelligence this turnover rate supports.

## What the turnover does not explain

Leadership changing every period is a fact about published claims, not necessarily about who is
operating. Groups rebrand, affiliates move between operations, and a leak site going quiet does
not mean the people behind it stopped.

This dataset cannot separate a genuinely new operation from a renamed old one. It records the
name a claim was published under. The [methodology page](/methodology/) states that limitation,
and it is the main reason this site tracks sectors alongside groups rather than groups alone.

## What this means for UAE organisations

1. Stop planning around the most active group of last year, because none of the four leaders on
   this tracker repeated.
2. Prioritise the exposures common to every entrant: external remote access, unpatched edge
   devices and credential reuse.
3. Use sector pages rather than group pages when deciding where to spend, since sectors persist
   across periods.
4. Read all-time group rankings as accumulated history, not as current activity.
5. Keep dated evidence that technical controls were tested, since that requirement is
   independent of who is attacking.
6. Revisit this page as 2026 closes, because the current leader is named on partial-year data.

## Summary

Four periods on this tracker have four different leading ransomware groups, and none led twice.
Two of the three most active groups of 2026 had no UAE record eight months earlier. Sector
patterns move over years while attacker populations move within one. That is the argument for
planning at the control level rather than the actor level.
