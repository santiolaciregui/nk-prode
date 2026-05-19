# Security Specification: Prode NK Mundial 2026

## Data Invariants
1. A user cannot activate their own account.
2. Predictions can only be made for valid match IDs.
3. Users can only read their own predictions or all predictions if他們 are an admin.
4. The admin is the only one who can update match results and user status.

## The "Dirty Dozen" Payloads (Red Team Audit)
1. **Self-Activation**: User sends `update` to `/users/{uid}` with `{status: "active"}`.
   - *Expected*: `PERMISSION_DENIED` (only admins can change status).
2. **Identity Spoofing**: User A sends `create` to `/predictions/` with `userId: "UserB"`.
   - *Expected*: `PERMISSION_DENIED` (`userId` must match `request.auth.uid`).
3. **Privilege Escalation**: User sends `update` to `/users/{uid}` with `{role: "admin"}`.
   - *Expected*: `PERMISSION_DENIED` (only admins can change role).
4. **ID Poisoning**: User sends `create` to `/matches/` with a 1MB string as ID.
   - *Expected*: `PERMISSION_DENIED` (only admins can write matches).
5. **Score Injection**: User sends `create` to `/predictions/` with `homeScore: 99999`.
   - *Expected*: `PERMISSION_DENIED` (score must be between 0 and 20).
6. **Bypassing Receipt**: User attempts to predict without being active.
   - *Check*: This is handled in the UI, but rules should restrict data access if possible. (Note: standard rules don't easily check for 'active' status in *another* collection without `get()` cost, but we can add it to `predictions` read rule).
7. **Deleting Matches**: User sends `delete` to `/matches/match1`.
   - *Expected*: `PERMISSION_DENIED`.
8. **Spoofing Admin**: User logs in with non-verified email but same address as admin.
   - *Expected*: `PERMISSION_DENIED` (if using token email, but my rule checks `auth.uid` in `admins` or hardcoded email string - should check `email_verified`).
9. **Tampering with Points**: User sends `update` to `/users/{uid}` with `{points: 100}`.
   - *Expected*: `PERMISSION_DENIED`.
10. **Orphaned Prediction**: User creates prediction for a non-existent match.
    - *Expected*: Managed by `isValidId` and existence check if implemented (currently just size check).
11. **PII Leak**: User B tries to `get` User A's `transferReceipt`.
    - *Expected*: `PERMISSION_DENIED` (only Owner or Admin can read profile).
12. **Recursive List Attack**: User B tries to list all users.
    - *Expected*: `PERMISSION_DENIED` (only Admin can list users).
