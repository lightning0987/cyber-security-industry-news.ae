---
title: "Four in Ten UAE-Tagged Ransomware Claims Fail Verification"
h1: "Four in Ten Claims Tagged UAE Carry No UAE Evidence"
description: "Of 182 leak-site claims tagged for the UAE by the upstream feed, 74 carry no verifiable UAE link. That is 40.7% of the feed, discarded before publication."
dek: "Country tagging in public ransomware feeds is treated as fact across regional reporting. Applying a verification rule to one country's feed discards 74 of 182 records, and the discarded share is large enough to change any headline built on the raw count."
category: "threat-intel"
tier: "T2"
published: "2026-09-18"
entities:
  sectors: []
  groups: []
  periods: ["2026"]
image: "data-centre"
sources:
  - label: "Marsad Cyber methodology, attribution rules in full"
    href: "/methodology/"
  - label: "UAE ransomware tracker, snapshot of 16 September 2026"
    href: "/uae-ransomware-tracker/"
  - label: "Data sources and known limits"
    href: "/data-sources/"
  - label: "ransomware.live, leak-site monitoring"
    href: "https://www.ransomware.live/"
---

The upstream feed behind this tracker returned 182 leak-site claims tagged for the United Arab
Emirates. Applying a verification rule to those records leaves 108. The other 74 carry no
verifiable UAE link of any kind, which is 40.7% of the feed.

That figure is the most consequential number this site holds, and it is not a number about
ransomware. It is a number about how regional cyber statistics are produced.

## What the verification rule checks

A claim is treated as attributed to the UAE on one of two grounds. The first is a domain in the
.ae zone, which applies to 65 records. The second is a UAE location named in the text of the
record, such as Dubai, Abu Dhabi, Sharjah, DIFC or ADGM.

That second ground applies to a further 43 records. Together the two produce the 108 claims behind
every figure published here.

The remaining 74 records carry a country tag and nothing else. No emirate, no free zone, no .ae
domain, no UAE address in the description. The tag is the only evidence that the claim concerns
the UAE at all.

## Why a country tag is weak evidence

Leak-site claims are written by attackers, and the country field in an aggregation feed is derived
rather than declared. One record in this dataset describes a Bangladeshi non-profit and carries a
UAE tag. That is not a flaw in the feed so much as a limit of what a derived field can do.

The practical consequence is that a headline built on the raw count states something the data does
not support. A figure of 182 attacks on UAE organisations is not a stronger version of 108. It is
a different claim, and the difference is 74 records that nobody has checked.

## What this changes for anyone citing regional figures

Most published statistics on Gulf cyber incidents quote a source and a total. They rarely publish
the rule that decided which records counted, and they almost never publish what the rule threw
away.

1. Ask what share of the source was discarded before the total was reached.
2. Ask what evidence the country assignment rests on, and whether a tag alone was enough.
3. Ask whether an attacker claim was separated from a confirmed breach anywhere in the method.
4. Treat any figure without those three answers as an order of magnitude rather than a count.

This site publishes all three, which is why its headline is 108 and not 182. The rejected records
remain in the dataset and are counted separately, because deleting them would make the rejection
rate unverifiable.

## The discarded records are kept, not deleted

The 74 unverified claims stay in the published dataset with their confidence level attached. They
are excluded from every headline figure and from the sector, group and period breakdowns. They are
not excluded from the file.

Keeping them serves two purposes. A reader can recompute the rejection rate without trusting this
site. Anyone who disagrees with the rule can apply their own instead.

A tracker that deleted the records it rejected would be asking to be taken on faith. That is the
position this project exists to argue against.

The separation also matters for tracking change over time. Better country assignment upstream
would push the rejection rate down. That movement is visible only because both numbers are
published on every refresh.

## The limits of this method

A verification rule that demands evidence discards real UAE incidents along with the noise.
Consider an Emirati organisation on a .com domain, with no emirate named in the claim text. It
falls into the 74 and is not counted here. The rule is deliberately conservative, and it produces
an undercount rather than an overcount.

That trade is the right way round for a tracker whose figures are meant to be cited. An undercount
can be defended record by record. An overcount cannot be defended at all, because the evidence for
the extra records does not exist.

The full rule is published on the [methodology page](/methodology/), including the location terms
and the order in which fields are checked. Counts for each confidence level appear there too. The
underlying records are available as [JSON](/data/incidents.json) and [CSV](/data/incidents.csv),
so anyone can apply a different rule and see what it produces.
