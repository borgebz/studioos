# Feature — Events

**ADO PBI:** #241 — Models done; API layer in progress

Events is the school's communication channel for anything that happens beyond regular classes — end-of-year shows, recitals, open days, competitions, workshops. The module lets direction and coordination create and manage events, publish them to the community, post updates as the event approaches, and receive interest from students and parents.

An event has two independent states: its **visibility** (whether it's public or internal) and its **event state** (whether it's planned, has a date to be announced, was cancelled, or has already taken place). These are kept separate because an event can be published before the date is confirmed, or cancelled after it was published, and both pieces of information need to be tracked independently.

Events start as drafts — only staff with the right permission can see them. Direction or coordination publishes them when ready, at which point the school community can see the event detail, express interest, and read updates. Publication can also be scheduled ahead of time so it goes live automatically at a set date and time.

Attached to each event are several content types. **Files** are documents or images attached to the event — programmes, schedules, location maps. **Posts** are sub-updates published under the event, like "rehearsal schedule confirmed" or "reminder: doors open at 7pm". Posts have their own draft/publish workflow. **Comments** allow the community to ask questions or leave reactions, and they support threaded replies so conversations stay organised. **Interest** is a lightweight way for users to signal they plan to attend or want to follow an event without making it a full reservation.

There is no ticket selling in this module. Capacity management and payment are out of scope for now.
