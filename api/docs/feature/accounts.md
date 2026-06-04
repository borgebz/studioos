# Feature — Authentication & User Management

Users in StudioOS are not self-registered. The system is a closed community — every account is created intentionally, either through the enrollment process or via a staff invite. Authentication uses JWT tokens with short-lived access tokens and 7-day rotating refresh tokens. Logging out blacklists the refresh token.

Every user has a role (direction, coordination, staff, teacher_internal, teacher_external, parent, student) and a set of permissions. The role is a label; what a user can actually do is determined by their permissions. This distinction matters: a user with the role "student" can be granted `can_teach` and become eligible to teach — the system respects permissions, not role names, for capability checks.

When a user logs in, the frontend receives everything it needs in a single `/me/` call — user data, profile, role, and full permission list. This avoids multiple round-trips on app load.

Users have a profile with a display name, bio, and photo. Teachers have a public profile visible to parents and students when browsing availability. The photo upload path uses UUIDs on disk — the original filename is stored separately just for display.

The `parent_id` self-reference on the User model links a student to their guardian. This is how the system knows who can confirm attendance or cancel sessions on a student's behalf.

Modalities are linked to users via `UserModality`. A teacher can only be assigned a modality if they hold the `can_teach` permission. This gate exists because roles alone don't determine who can teach — a coordinator might be a part-time teacher, and a student might become a teacher's assistant. The permission is the source of truth.

Account deactivation sets `is_active=False`. Deactivated users lose access to the system immediately. Soft delete is preserved for audit purposes.
