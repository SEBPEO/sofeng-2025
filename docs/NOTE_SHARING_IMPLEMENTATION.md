# Consultation Notes Sharing Feature

## Overview
Doctors can now share consultation notes with other verified doctors with read-only permissions. Shared notes can be accessed by the recipient doctor and all sharing events are recorded in the audit log. Notes can be shared at any time, whether they're in DRAFT, APPROVED, or FINAL status.

## Database Schema

### New Model: `SharedConsultationNote`
```prisma
model SharedConsultationNote {
    share_id                Int         @id @default(autoincrement())
    consultation_id         Int
    shared_by_doctor_id     Int
    shared_with_doctor_id   Int
    permissions             String      @default("read") // "read" or "read_write"
    created_at              DateTime    @default(now())
    revoked_at              DateTime?

    consultation    Consultation   @relation(fields: [consultation_id], references: [consultation_id], onDelete: Cascade)
    shared_by       DoctorProfile  @relation("SharedBy", fields: [shared_by_doctor_id], references: [doctor_id], onDelete: Cascade)
    shared_with     DoctorProfile  @relation("SharedWith", fields: [shared_with_doctor_id], references: [doctor_id], onDelete: Cascade)

    @@unique([consultation_id, shared_by_doctor_id, shared_with_doctor_id])
    @@index([shared_with_doctor_id])
    @@index([consultation_id, shared_by_doctor_id])
}
```

### Updated Model: `Consultation`
Added relationship to SharedConsultationNote:
```prisma
sharedNotes SharedConsultationNote[]
```

### Updated Model: `DoctorProfile`
Added sharing relationships:
```prisma
sharedNotesBy   SharedConsultationNote[] @relation("SharedBy")
sharedNotesWith SharedConsultationNote[] @relation("SharedWith")
```

## Backend Implementation

### Service Methods (ConsultationsService)

#### `shareNotes(userId, consultationId, sharedWithDoctorId, permissions)`
- **Purpose**: Share a consultation's notes with another doctor
- **Validation**:
  - Only doctors can share notes
  - Cannot share with self
  - Cannot share the same consultation with same doctor twice
  - Target doctor must exist
  - Source doctor must own the consultation
- **Returns**: `{ success: boolean; shareId: number }`
- **Audit Logging**: `SHARE` action with doctor details

#### `getSharedNotes(userId)`
- **Purpose**: Get all notes shared with the current doctor
- **Includes**: Full consultation data, appointment details, patient/doctor info
- **Filter**: Only non-revoked shares (`revoked_at IS NULL`)
- **Returns**: Array of `SharedConsultationNote` with nested consultation data

#### `getConsultationShares(userId, consultationId)`
- **Purpose**: Get all active shares for a specific consultation
- **Validation**: Only the consultation's doctor can view shares
- **Returns**: Array of `SharedConsultationNote` with recipient doctor info

#### `revokeShare(userId, shareId)`
- **Purpose**: Revoke a share (soft delete with `revoked_at` timestamp)
- **Validation**: Only the sharing doctor can revoke
- **Returns**: `{ success: boolean }`
- **Audit Logging**: `SHARE` action (revocation) with doctor details

### REST Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/consultations/:consultationId/share` | Share notes with another doctor |
| `GET` | `/consultations/shared-with-me` | Get notes shared with current doctor |
| `GET` | `/consultations/:consultationId/shares` | Get list of doctors this consultation is shared with |
| `DELETE` | `/consultations/shares/:shareId` | Revoke a share |

### Audit Logging
All sharing actions are logged with:
- **Action**: `SHARE` (for both share and revoke operations)
- **Resource Type**: `Consultation`
- **Resource ID**: Consultation ID
- **Details**: Doctor names and operation (share/revoke)

## Frontend Implementation

### Types (frontend/src/features/consultations/api.ts)

```typescript
interface SharedConsultationNote {
  share_id: number;
  consultation_id: number;
  shared_by_doctor_id: number;
  shared_with_doctor_id: number;
  permissions: string;
  created_at: string;
  revoked_at?: string | null;
  consultation?: Consultation;
  shared_by?: { doctor_id: number; user: {...} };
  shared_with?: { doctor_id: number; user: {...} };
}
```

### API Functions

- `shareConsultationNotes(consultationId, sharedWithDoctorId, permissions)`
- `getSharedNotesWithMe()` - Get notes shared with current doctor
- `getConsultationShares(consultationId)` - Get shares for a consultation
- `revokeConsultationShare(shareId)` - Revoke a share

### UI Components

#### ConsultationSession Component Updates

**New State Variables:**
```typescript
const [showShareModal, setShowShareModal] = useState(false);
const [sharedDoctors, setSharedDoctors] = useState<SharedConsultationNote[]>([]);
const [sharingDoctor, setSharingDoctor] = useState<number | null>(null);
const [sharingError, setSharingError] = useState<string | null>(null);
const [sharing, setSharing] = useState(false);
```

**New Handler Functions:**
- `handleLoadSharedDoctors()` - Fetch list of doctors this note is shared with
- `handleShareNotes()` - Share note with selected doctor
- `handleRevokeShare(shareId)` - Revoke a share
- `useEffect` - Auto-load shares when share modal opens

**UI Changes to Notes Modal:**
1. **Share Button** - Opens modal to share with another doctor (available when notes are unlocked)
2. **Shared With List** - Shows list of doctors this note is shared with and allows revocation
3. **Share Modal** - Allows selection of doctor to share with

## Usage Flow

### For Doctor Sharing Notes:
1. Open a consultation session
2. Generate or edit AI notes
3. Click "Share with Doctor" button in notes modal
4. Select target doctor from dropdown
5. Click "Share" button
6. Share event is logged in audit trail
7. Can view/revoke shares in the "Shared with:" section

### For Doctor Receiving Shared Notes:
1. Go to "Shared with me" section (to be implemented in future UI)
2. See all notes shared by other doctors
3. Access read-only view of shared notes
4. Sharing doctor can revoke access anytime

## Security Features

✅ **Authorization**:
- Only doctors can share notes
- Only the owning doctor can share their consultations
- Only the sharing doctor can revoke shares
- Recipients only get read-only access

✅ **Audit Trail**:
- All shares logged with doctor identities
- All revocations logged with timestamps
- Traceable via audit log system

✅ **Data Integrity**:
- Unique constraint prevents duplicate shares
- Soft deletes preserve audit trail
- Cascading deletes when consultation deleted

✅ **HIPAA Compliance**:
- Notes stay within doctor network
- Recipients must be verified doctors
- Sharing events fully audited
- Can revoke access anytime

## Future Enhancements

1. **Permission Levels**: Implement `read` vs `read_write` permissions
2. **Access Analytics**: Track who accessed shared notes and when
3. **Bulk Sharing**: Share with multiple doctors at once
4. **Auto-Expiration**: Set expiration dates on shares
5. **Shared Notes View**: Dedicated UI for viewing all notes shared with you
6. **Doctor Directory**: Integrate with verified doctor list for easy selection
7. **Notifications**: Notify recipient when notes are shared
8. **Collaborative Editing**: If `read_write` permission, allow edits

## Database Migration

Run these commands to apply schema changes:

```bash
# Option 1: Create and run migration
cd backend
npx prisma migrate dev --name add_shared_consultation_notes

# Option 2: Direct schema push (if no migration history sync needed)
npx prisma db push
```

Then regenerate Prisma client:
```bash
npx prisma generate
```

## Testing Checklist

- [ ] Doctor A shares notes with Doctor B
- [ ] Doctor B can view shared notes (when UI implemented)
- [ ] Audit log shows share event
- [ ] Doctor A can revoke share
- [ ] Share event is unique (prevent duplicate shares)
- [ ] Cannot share with self
- [ ] Cannot share if not consultation owner
- [ ] Can share locked (approved) notes
- [ ] Can share draft notes
- [ ] Shared notes reference in audit trail

## Files Modified

### Backend
- `backend/prisma/schema.prisma` - Added SharedConsultationNote model
- `backend/src/consultations/consultations.service.ts` - Added sharing methods
- `backend/src/consultations/consultations.controller.ts` - Added sharing endpoints

### Frontend
- `frontend/src/features/consultations/api.ts` - Added sharing types and API functions
- `frontend/src/features/consultations/pages/ConsultationSession.tsx` - Added sharing UI and handlers
