# Flows

`new-rental.flow.json` is the **New rental** flow from part 4 of the video
series — Customers, then Rentals (whose Customer is filled in from the
customer just saved), then the end — exported from the workflow database for
reference.

Flows are designed in Configure UI → Flows and kept in the workflow database
(`DB_WORKFLOW`); a fresh install does not load this file. To have it, make it
again in Configure UI → Flows: add the Customers screen, then Rentals; after
Customers, *Go to a screen* → Rentals; after Rentals, *Finish the journey*;
Publish flow.
