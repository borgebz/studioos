# Feature — Studios & Modalities

Studios are the physical rooms where classes happen. StudioOS has 8 of them. Each has a name, a maximum capacity, and a set of modalities it supports. Not every modality fits every studio — a small room might not be suitable for ensemble classes, and a mirrored studio might be required for ballet. This compatibility is managed through the `StudioModality` link, which is the gate the system uses when assigning a studio to a coaching session.

Modalities represent the dance disciplines offered by the school — Ballet Clássico, Hip-Hop, Dança Contemporânea, Acrodance, and so on. There are currently 21 modalities. Each modality can have age constraints (expressed in months for precision) and a maximum capacity per session. These constraints are used at enrollment to validate eligibility and at coaching booking to enforce capacity.

The system ships with all 21 modalities pre-seeded from the StudioOS enrollment form. They can be created and edited, but the seed exists so the team always starts from a consistent baseline.

When a studio is deleted, all its modality links are soft-deleted too. This cascade happens explicitly in the service layer — Django's built-in cascade would bypass the soft-delete logic and lose the audit trail.

The studio–modality link is soft-delete aware: if a link is removed and then later re-added, the system restores the existing record instead of creating a duplicate. This avoids unique constraint violations while preserving history.
