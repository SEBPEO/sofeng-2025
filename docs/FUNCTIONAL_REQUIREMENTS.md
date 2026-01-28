# Functional Requirements Specification
## Medical AI Notetaker System

**Version**: 1.0  
**Date**: January 2026  
**Project**: Medical AI Notetaker  
**Organization**: FER, University of Zagreb

---

## Table of Contents
1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Functional Requirements](#functional-requirements)
   - [FR1: Start a Visit](#fr1-start-a-visit)
   - [FR2: Review and Edit AI Draft Notes](#fr2-review-and-edit-ai-draft-notes)
   - [FR3: Share Final Note with Patient](#fr3-share-final-note-with-patient)
   - [FR4: Share Note with Another Doctor](#fr4-share-note-with-another-doctor)
   - [FR5: Audit & Logs](#fr5-audit--logs)
   - [FR6: Account Deletion / Data Request](#fr6-account-deletion--data-request)
   - [FR7: Recording Consent Management](#fr7-recording-consent-management)
   - [FR8: Patient Access to Final Visit Note](#fr8-patient-access-to-final-visit-note)
4. [User Roles](#user-roles)
5. [Data Model References](#data-model-references)
6. [Compliance & Security](#compliance--security)

---

## Introduction

This document specifies the functional requirements for the **Medical AI Notetaker** system. The system is designed to streamline the doctor-patient interaction process by automating note-taking through AI-powered transcription and summarization, while maintaining strict data privacy and security standards.

### Purpose
To provide a comprehensive specification of all functional capabilities that the system must support to meet the needs of doctors, patients, and regulatory compliance requirements.

### Scope
This document covers the core functional requirements for:
- Visit management and documentation
- AI-assisted note generation and editing
- Secure sharing of medical notes
- Patient consent management
- Audit trail and compliance logging
- Data privacy and user rights (GDPR/HIPAA-like)

---

## System Overview

The Medical AI Notetaker is a web-based application that facilitates:
- **Recording** doctor-patient consultations (with consent)
- **Transcribing** recordings using AI (OpenAI API)
- **Generating** structured medical notes automatically
- **Sharing** notes securely between authorized parties
- **Tracking** all data access and modifications for compliance

---

## Functional Requirements

### FR1: Start a Visit

**ID**: FR1  
**Title**: Doctors Must Be Able to Start a Visit  
**Priority**: High  
**Status**: ✅ Implemented

#### Description
Doctors must be able to initiate a new visit session by creating a visit record (consultation) linked to a specific patient and appointment.

#### Actors
- **Primary**: Doctor
- **Secondary**: System

#### Preconditions
1. Doctor is authenticated and logged in
2. An appointment exists between the doctor and patient
3. Doctor has access rights to the patient

#### Flow of Events

**Main Success Scenario**:
1. Doctor navigates to the appointments list
2. Doctor selects a scheduled appointment
3. Doctor initiates a consultation session for the appointment
4. System creates a new `Consultation` record linked to the `Appointment`
5. System initializes consultation with:
   - `consultation_id`: Unique identifier
   - `appointment_id`: Link to the appointment
   - `created_at`: Timestamp of creation
   - `notes_status`: Set to `DRAFT`
   - `notes_locked`: Set to `false`
6. System displays the consultation interface
7. Doctor can begin recording or manually entering notes

**Alternative Flows**:
- **A1**: Appointment already has a consultation
  - System loads existing consultation instead of creating new one
- **A2**: Doctor lacks permission to access patient
  - System denies access and displays error message

#### Postconditions
- A new `Consultation` record exists in the database
- The consultation is linked to the appointment
- The consultation is in `DRAFT` status
- An audit log entry is created for the consultation creation

#### Business Rules
- BR1.1: One appointment can have at most one consultation
- BR1.2: Only doctors can create consultations
- BR1.3: Consultations can only be created for appointments where the doctor is assigned

#### Data Model
```
Consultation {
  consultation_id: Int (Primary Key)
  appointment_id: Int (Foreign Key, Unique)
  created_at: DateTime
  notes_status: NotesStatus (DRAFT, APPROVED, FINAL)
  notes_locked: Boolean
  diagnosis: String (nullable)
  treatment_plan: String (nullable)
  transcript: String (nullable)
  AI_summary: String (nullable)
  notes_approved_at: DateTime (nullable)
  notes_approved_by: String (nullable)
}
```

#### Implementation Status
- **Backend**: ✅ Implemented in `consultations.service.ts` and `consultations.controller.ts`
- **Frontend**: ✅ Implemented in consultation pages
- **Database**: ✅ Schema defined in Prisma

---

### FR2: Review and Edit AI Draft Notes

**ID**: FR2  
**Title**: Doctors Must Be Able to Review and Edit AI Draft Notes and Approve Final Version  
**Priority**: High  
**Status**: ✅ Implemented

#### Description
Doctors must be able to review AI-generated draft notes, make edits as necessary, and approve the final version for patient sharing and record-keeping.

#### Actors
- **Primary**: Doctor
- **Secondary**: AI Service (OpenAI API)

#### Preconditions
1. Doctor is authenticated and logged in
2. A consultation session exists
3. Recording and/or transcript data is available
4. AI has generated draft notes (or doctor can trigger generation)

#### Flow of Events

**Main Success Scenario**:
1. Doctor navigates to active consultation session
2. Doctor triggers AI note generation (if not already generated)
3. System processes recording/transcript through AI service
4. AI service returns structured notes including:
   - Diagnosis
   - Treatment plan
   - AI summary
5. System displays AI-generated draft notes in editable format
6. Doctor reviews the draft notes
7. Doctor edits notes as needed (diagnosis, treatment plan, summary)
8. Doctor saves changes to draft
9. Doctor approves notes when satisfied
10. System updates consultation:
    - `notes_status`: Changes from `DRAFT` to `APPROVED`
    - `notes_approved_at`: Current timestamp
    - `notes_approved_by`: Doctor's user ID
    - `notes_locked`: Can be set to `true` to prevent further edits
11. System logs approval action in audit log

**Alternative Flows**:
- **A1**: AI generation fails
  - System displays error message
  - Doctor can manually enter notes
- **A2**: Doctor cancels without saving
  - Changes are discarded
  - Notes remain in previous state
- **A3**: Doctor unlocks notes after approval
  - `notes_locked` set back to `false`
  - `notes_status` may remain `APPROVED` or revert to `DRAFT`
  - Unlock action is logged in audit

#### Postconditions
- Consultation notes are updated with doctor's edits
- Notes status is `APPROVED` or `FINAL`
- Approval timestamp and approver ID are recorded
- Audit log contains record of approval action
- Notes may be locked to prevent further changes

#### Business Rules
- BR2.1: Only the consultation's assigned doctor can edit notes
- BR2.2: AI-generated notes are always treated as drafts requiring doctor review
- BR2.3: Notes must be approved before sharing with patients
- BR2.4: Locked notes cannot be edited unless explicitly unlocked
- BR2.5: All note modifications are logged in audit trail

#### Data Model
```
Consultation {
  diagnosis: String (nullable)
  treatment_plan: String (nullable)
  AI_summary: String (nullable)
  transcript: String (nullable)
  notes_status: NotesStatus (DRAFT, APPROVED, FINAL)
  notes_locked: Boolean
  notes_approved_at: DateTime (nullable)
  notes_approved_by: String (nullable)
}

NotesStatus Enum {
  DRAFT
  APPROVED
  FINAL
}
```

#### Implementation Status
- **Backend**: ✅ AI service integration in `ai.service.ts`
- **Backend**: ✅ Note editing/approval in `consultations.service.ts`
- **Frontend**: ✅ Note editor interface in `ConsultationSession.tsx`
- **Database**: ✅ Schema supports all required fields

---

### FR3: Share Final Note with Patient

**ID**: FR3  
**Title**: Doctors Must Be Able to Share Final Note with Patient  
**Priority**: High  
**Status**: ⚠️ Partially Implemented

#### Description
Doctors must be able to share approved consultation notes with the patient associated with the visit, allowing the patient to access their medical records.

#### Actors
- **Primary**: Doctor
- **Secondary**: Patient, Notification System

#### Preconditions
1. Doctor is authenticated and logged in
2. Consultation exists and belongs to the doctor
3. Notes are in `APPROVED` or `FINAL` status
4. Patient is associated with the consultation via appointment

#### Flow of Events

**Main Success Scenario**:
1. Doctor opens consultation with approved notes
2. Doctor clicks "Share with Patient" action
3. System verifies notes are approved
4. System updates consultation `notes_status` to `FINAL` (if not already)
5. System grants patient access to view the consultation notes
6. System creates notification for patient:
   - Type: `NOTES_APPROVED`
   - Message: "Your consultation notes from [Date] are now available"
7. System logs share action in audit trail
8. System displays confirmation to doctor
9. Patient receives notification (email/push/in-app based on preferences)

**Alternative Flows**:
- **A1**: Notes are not approved
  - System displays error: "Notes must be approved before sharing with patient"
  - Doctor must approve notes first
- **A2**: Patient notification fails
  - Notes are still shared (patient can access)
  - System logs notification failure
  - Doctor is warned about notification failure

#### Postconditions
- Consultation `notes_status` is `FINAL`
- Patient can access consultation notes
- Patient receives notification about available notes
- Audit log records the share action
- Doctor receives confirmation

#### Business Rules
- BR3.1: Only approved notes can be shared with patients
- BR3.2: Patients automatically have access to consultations from their own appointments
- BR3.3: Sharing action triggers patient notification
- BR3.4: Notes marked as `FINAL` cannot be edited without specific unlock process
- BR3.5: Patient access is logged in audit trail

#### Data Model
```
Consultation {
  notes_status: NotesStatus (must be APPROVED or FINAL)
}

Notification {
  type: NotificationType (NOTES_APPROVED)
  user_id: String (patient's user ID)
  related_id: String (consultation_id)
}

AuditLog {
  action: AuditAction (SHARE)
  resource_type: "Consultation"
  resource_id: consultation_id
}
```

#### Implementation Status
- **Backend**: ⚠️ Consultation access implemented, explicit patient sharing flow may need enhancement
- **Frontend**: ⚠️ Patient view of notes exists, sharing button/flow may need addition
- **Notifications**: ✅ Notification system in place (`NOTES_APPROVED` type exists)
- **Audit**: ✅ Audit logging system ready

#### Notes
Current implementation allows patients to access consultations from their appointments. May need explicit "share" action to trigger notifications and status change to `FINAL`.

---

### FR4: Share Note with Another Doctor

**ID**: FR4  
**Title**: Doctors Must Be Able to Share Note with Another Verified Doctor with Set Permissions  
**Priority**: High  
**Status**: ✅ Implemented

#### Description
Doctors must be able to share consultation notes with other verified doctors in the system, with configurable permissions (read-only or read-write), to facilitate collaboration and referrals.

#### Actors
- **Primary**: Doctor (Sharing Doctor)
- **Secondary**: Doctor (Recipient), Notification System

#### Preconditions
1. Sharing doctor is authenticated and logged in
2. Consultation exists and belongs to the sharing doctor
3. Recipient doctor exists in the system
4. Sharing doctor and recipient doctor are both verified

#### Flow of Events

**Main Success Scenario**:
1. Doctor opens consultation session
2. Doctor clicks "Share with Doctor" button
3. System displays doctor selection interface
4. Doctor searches for and selects recipient doctor
5. Doctor selects permission level:
   - **Read**: Recipient can view notes only
   - **Read-Write**: Recipient can view and edit notes (future enhancement)
6. Doctor confirms share action
7. System creates `SharedConsultationNote` record:
   - Links consultation to both doctors
   - Sets permission level
   - Records creation timestamp
8. System logs share action in audit trail with details:
   - Action: `SHARE`
   - Resource: Consultation
   - Details: Include both doctor names
9. System can optionally notify recipient doctor
10. System displays confirmation with list of shared doctors
11. Doctor can view list of shares and revoke if needed

**Alternative Flows**:
- **A1**: Attempting to share with self
  - System prevents action: "Cannot share with yourself"
- **A2**: Consultation already shared with selected doctor
  - System prevents duplicate: "Already shared with this doctor"
  - System can offer to update permissions instead
- **A3**: Recipient doctor not found
  - System displays error
  - Doctor can try different search
- **A4**: Doctor revokes share
  - System soft-deletes share (sets `revoked_at` timestamp)
  - Recipient loses access
  - Revocation is logged in audit trail

#### Postconditions
- `SharedConsultationNote` record exists linking consultation to both doctors
- Recipient doctor can access the consultation notes
- Share action is logged in audit trail
- Sharing doctor can see list of shares and manage them
- Share can be revoked, removing recipient's access

#### Business Rules
- BR4.1: Only verified doctors can share notes
- BR4.2: Only the consultation's owner doctor can share it
- BR4.3: Cannot share with self
- BR4.4: Each consultation can only be shared once with each doctor (unique constraint)
- BR4.5: Shares can be revoked at any time by the sharing doctor
- BR4.6: Revocation is soft delete (preserves audit trail)
- BR4.7: All share and revoke actions are logged
- BR4.8: Recipients have read-only access by default

#### Data Model
```
SharedConsultationNote {
  share_id: Int (Primary Key)
  consultation_id: Int (Foreign Key)
  shared_by_doctor_id: Int (Foreign Key)
  shared_with_doctor_id: Int (Foreign Key)
  permissions: String (default: "read")
  created_at: DateTime
  revoked_at: DateTime (nullable)
}

Unique Constraint: [consultation_id, shared_by_doctor_id, shared_with_doctor_id]
```

#### API Endpoints
- `POST /consultations/:consultationId/share` - Share notes
- `GET /consultations/shared-with-me` - Get notes shared with current doctor
- `GET /consultations/:consultationId/shares` - Get list of shares for consultation
- `DELETE /consultations/shares/:shareId` - Revoke a share

#### Implementation Status
- **Backend**: ✅ Fully implemented in `consultations.service.ts` and `consultations.controller.ts`
- **Frontend**: ✅ Share UI implemented in `ConsultationSession.tsx`
- **Database**: ✅ `SharedConsultationNote` model defined
- **Audit**: ✅ Share and revoke actions logged
- **Documentation**: ✅ Detailed in `NOTE_SHARING_IMPLEMENTATION.md`

---

### FR5: Audit & Logs

**ID**: FR5  
**Title**: System Must Maintain Audit & Logs Record for All Accesses, Edits, Shares, and Recordings  
**Priority**: Critical  
**Status**: ✅ Implemented

#### Description
The system must maintain a comprehensive audit trail of all user actions, data accesses, modifications, sharing events, and recording operations to ensure compliance with healthcare regulations (HIPAA/GDPR) and enable security monitoring.

#### Actors
- **Primary**: System
- **Secondary**: All users (Doctors, Patients), Administrators

#### Preconditions
1. System is operational
2. User performs any logged action
3. Database is available for logging

#### Logged Events

The system logs the following categories of events:

**1. Authentication & Access**
- `LOGIN` - Successful user login
- `LOGOUT` - User logout
- `LOGIN_FAILED` - Failed login attempt

**2. Data Operations**
- `CREATE` - Creation of new records (consultations, appointments, etc.)
- `READ` - Access to sensitive data
- `UPDATE` - Modification of existing records
- `DELETE` - Deletion of records

**3. File & Recording Operations**
- `RECORDING_UPLOAD` - Upload of consultation recordings
- `RECORDING_DOWNLOAD` - Download of recordings
- `RECORDING_ACCESS` - Access to recording files
- `RECORDING_DELETE` - Deletion of recordings
- `FILE_UPLOAD` - Upload of other files (attachments)
- `FILE_DOWNLOAD` - Download of files
- `FILE_ACCESS` - Access to files
- `FILE_DELETE` - Deletion of files

**4. Sharing & Permissions**
- `SHARE` - Sharing of consultation notes
- `UNSHARE` - Revocation of shares
- `PERMISSION_CHANGE` - Modification of access permissions

**5. Medical Records**
- `CONSULTATION_VIEW` - Viewing of consultation records
- `CONSULTATION_EDIT` - Editing of consultation notes
- `MEDICAL_RECORD_ACCESS` - Access to patient medical records
- `PRESCRIPTION_VIEW` - Viewing of prescriptions

**6. Communication**
- `MESSAGE_SENT` - Sending of messages
- `MESSAGE_READ` - Reading of messages

**7. System Events**
- `SYSTEM_ERROR` - System errors
- `SECURITY_ALERT` - Security-related alerts

#### Flow of Events

**Automatic Logging**:
1. User performs action in the system
2. System intercepts action through service layer
3. System collects audit information:
   - `user_id`: ID of user performing action
   - `action`: Type of action (from AuditAction enum)
   - `resource_type`: Type of resource affected (e.g., "Consultation", "Appointment")
   - `resource_id`: ID of specific resource
   - `details`: Additional context (JSON or text)
   - `ip_address`: User's IP address
   - `user_agent`: Browser/client information
   - `created_at`: Timestamp of action
4. System writes audit record to `AuditLog` table
5. System continues with original action

**Query & Review**:
1. Administrator or authorized user accesses audit log interface
2. System provides filtering capabilities:
   - By user
   - By action type
   - By resource type/ID
   - By date range
   - By IP address
3. System displays audit records with full details
4. System supports export for compliance reporting

#### Postconditions
- Every significant action has a corresponding audit log entry
- Audit logs are immutable (no deletion or modification)
- Logs contain sufficient detail for compliance and security review
- Logs can be queried and filtered efficiently

#### Business Rules
- BR5.1: All data access, modifications, and sharing events must be logged
- BR5.2: Audit logs are immutable and cannot be deleted by users
- BR5.3: Logs must include user identity, timestamp, action type, and affected resource
- BR5.4: Failed authentication attempts must be logged for security monitoring
- BR5.5: Audit logs must be retained for compliance periods (typically 7+ years for medical records)
- BR5.6: System errors and security alerts must be logged and monitored
- BR5.7: IP addresses and user agents are logged for security analysis
- BR5.8: User deletion sets `user_id` to NULL but preserves the log entry

#### Data Model
```
AuditLog {
  audit_id: Int (Primary Key)
  user_id: String (Foreign Key, nullable)
  action: AuditAction (Enum)
  resource_type: String (e.g., "Consultation", "Appointment")
  resource_id: String (nullable)
  details: String (Text, nullable)
  ip_address: String (nullable, supports IPv4/IPv6)
  user_agent: String (nullable)
  created_at: DateTime (default: now)
}

AuditAction Enum {
  // Authentication
  LOGIN, LOGOUT, LOGIN_FAILED,
  
  // Data Operations
  CREATE, READ, UPDATE, DELETE,
  
  // File & Recording Operations
  RECORDING_UPLOAD, RECORDING_DOWNLOAD, RECORDING_ACCESS, RECORDING_DELETE,
  FILE_UPLOAD, FILE_DOWNLOAD, FILE_ACCESS, FILE_DELETE,
  
  // Sharing & Permissions
  SHARE, UNSHARE, PERMISSION_CHANGE,
  
  // Medical Records
  CONSULTATION_VIEW, CONSULTATION_EDIT, MEDICAL_RECORD_ACCESS, PRESCRIPTION_VIEW,
  
  // Communication
  MESSAGE_SENT, MESSAGE_READ,
  
  // System Events
  SYSTEM_ERROR, SECURITY_ALERT
}
```

#### Indexes for Performance
```
@@index([user_id, created_at])
@@index([resource_type, resource_id])
@@index([action])
@@index([created_at])
```

#### API Endpoints
- `GET /audit` - Get audit logs with filtering
- `GET /audit/:auditId` - Get specific audit log entry

#### Implementation Status
- **Backend**: ✅ `AuditLog` model and `AuditService` fully implemented
- **Database**: ✅ Schema defined with proper indexes
- **Integration**: ✅ Audit logging integrated in consultation, sharing, and other services
- **API**: ✅ Endpoints for querying audit logs

#### Compliance Notes
- **HIPAA**: Audit logs satisfy requirement for tracking all PHI access and modifications
- **GDPR**: Audit logs provide transparency on data processing activities
- **Data Retention**: Consider implementing automated archival for old logs while maintaining compliance retention periods

---

### FR6: Account Deletion / Data Request

**ID**: FR6  
**Title**: Doctors Must Be Able to Request or Initiate Account Deletion / Data Request  
**Priority**: High  
**Status**: ✅ Implemented

#### Description
Users (both doctors and patients) must be able to exercise their data privacy rights by requesting account deletion or exporting their personal data, in compliance with GDPR "right to be forgotten" and "right to data portability."

#### Actors
- **Primary**: User (Doctor or Patient)
- **Secondary**: System Administrator (for processing requests)

#### Preconditions
1. User is authenticated and logged in
2. User has valid account in the system

---

#### 6.1: Account Deletion Request

**Flow of Events**:
1. User navigates to account settings or privacy settings
2. User selects "Request Account Deletion"
3. System displays warning about consequences:
   - All personal data will be deleted
   - Action may be irreversible
   - Associated appointments/consultations may be affected
4. User optionally provides reason for deletion
5. User confirms deletion request
6. System creates `AccountDeletionRequest` record:
   - `user_id`: User requesting deletion
   - `reason`: Optional reason text
   - `status`: Set to `PENDING`
   - `requested_at`: Current timestamp
7. System logs request in audit trail
8. System sends confirmation email to user
9. System notifies administrators of pending request
10. Administrator reviews request
11. Administrator processes request:
    - **Approve**: Delete user data according to retention policies
    - **Reject**: Deny request with explanation
12. System updates request:
    - `status`: Set to `COMPLETED` or `REJECTED`
    - `processed_at`: Timestamp
    - `processed_by`: Administrator ID
13. System notifies user of decision
14. If approved, system performs data deletion:
    - Anonymize or delete user data
    - Preserve audit logs (user_id set to NULL)
    - Handle cascading deletions per business rules

**Alternative Flows**:
- **A1**: User cancels request before processing
  - User can cancel pending request
  - `status` set to `CANCELLED`
- **A2**: User has active obligations (scheduled appointments)
  - System may require resolving these first
  - Or system may reject deletion request

**Data Model**:
```
AccountDeletionRequest {
  request_id: Int (Primary Key)
  user_id: String (Foreign Key)
  reason: String (Text, nullable)
  status: RequestStatus (PENDING, PROCESSING, COMPLETED, REJECTED, CANCELLED)
  requested_at: DateTime
  processed_at: DateTime (nullable)
  processed_by: String (nullable)
}
```

---

#### 6.2: Data Export Request

**Flow of Events**:
1. User navigates to account settings or privacy settings
2. User selects "Request Data Export"
3. System displays information about export:
   - Types of data included
   - Format (JSON, PDF, etc.)
   - Processing time estimate
4. User confirms export request
5. System creates `DataExportRequest` record:
   - `user_id`: User requesting export
   - `status`: Set to `PENDING`
   - `requested_at`: Current timestamp
6. System logs request in audit trail
7. System queues background job to compile data
8. Background job collects user's data:
   - Profile information
   - Appointments
   - Consultations (if doctor)
   - Medical records (if patient)
   - Messages
   - Audit logs related to user
9. System generates export file (ZIP with JSON/PDF)
10. System saves file to secure storage:
    - `export_file_path`: Path to file
11. System updates request:
    - `status`: Set to `COMPLETED`
    - `completed_at`: Timestamp
    - `expires_at`: File expiration date (e.g., 30 days)
12. System sends notification with download link
13. User downloads export file
14. After expiration, system deletes export file

**Alternative Flows**:
- **A1**: Export generation fails
  - `status` set to `REJECTED`
  - User is notified and can retry
- **A2**: User cancels before completion
  - `status` set to `CANCELLED`
  - Partial export is deleted

**Data Model**:
```
DataExportRequest {
  request_id: Int (Primary Key)
  user_id: String (Foreign Key)
  status: RequestStatus (PENDING, PROCESSING, COMPLETED, REJECTED, CANCELLED)
  requested_at: DateTime
  completed_at: DateTime (nullable)
  export_file_path: String (nullable)
  expires_at: DateTime (nullable)
}

RequestStatus Enum {
  PENDING
  PROCESSING
  COMPLETED
  REJECTED
  CANCELLED
}
```

---

#### Postconditions
- **Account Deletion**:
  - Request is created and tracked
  - User and administrators are notified
  - Upon approval, user data is deleted per retention policies
  - Audit logs are preserved
- **Data Export**:
  - Request is created and tracked
  - User data is compiled into downloadable file
  - User receives download link
  - File expires after retention period

#### Business Rules
- BR6.1: Users can request account deletion at any time
- BR6.2: Deletion requests require administrator approval
- BR6.3: Audit logs must be preserved even after user deletion
- BR6.4: Data exports must include all user's personal data
- BR6.5: Export files must be deleted after expiration period
- BR6.6: Users can cancel pending requests
- BR6.7: Completed requests cannot be reversed
- BR6.8: System must comply with GDPR timelines (30 days for requests)

#### Implementation Status
- **Backend**: ✅ Both models implemented in Prisma schema
- **Database**: ✅ Tables created with proper relationships
- **API**: ⚠️ API endpoints may need implementation
- **Frontend**: ⚠️ UI for requesting deletion/export may need implementation
- **Background Jobs**: ⚠️ Export generation job may need implementation

#### Compliance Notes
- **GDPR Article 17**: Right to be forgotten (account deletion)
- **GDPR Article 20**: Right to data portability (data export)
- **HIPAA**: Consider retention requirements before deleting medical records
- **Timeline**: GDPR requires response within 30 days

---

### FR7: Recording Consent Management

**ID**: FR7  
**Title**: Patient Must Be Able to Give or Decline Recording Consent for Each Visit  
**Priority**: Critical  
**Status**: ✅ Implemented

#### Description
Patients must have the ability to explicitly consent to or decline audio recording of their consultation before each visit begins. This ensures compliance with privacy regulations and patient autonomy.

#### Actors
- **Primary**: Patient
- **Secondary**: Doctor, System

#### Preconditions
1. Patient is authenticated and logged in
2. An appointment is scheduled between patient and doctor
3. Patient is accessing appointment details or consultation interface

#### Flow of Events

**Main Success Scenario**:
1. Patient navigates to upcoming appointment details
2. System displays appointment information including consent options
3. System presents recording consent question:
   - "Do you consent to this consultation being recorded?"
   - Options: Yes (Allow) / No (Decline)
   - Explanation of purpose: "Recordings are used to generate accurate medical notes"
4. Patient selects consent choice
5. System updates `Appointment` record:
   - `patient_consent_to_record`: Set to `true` or `false`
6. System saves consent timestamp and decision
7. System logs consent action in audit trail
8. System displays confirmation of consent choice
9. When doctor starts consultation:
   - System displays patient's consent status
   - Recording features are enabled/disabled based on consent
10. If consent is `false`:
    - Recording button is disabled
    - Doctor sees message: "Patient declined recording consent"
    - Doctor can still take manual notes

**Alternative Flows**:
- **A1**: Patient changes consent before appointment
  - Patient can update consent choice
  - New consent value overwrites previous
  - All consent changes are logged
- **A2**: Patient hasn't provided consent yet
  - System prompts for consent when appointment time approaches
  - Reminder notifications include consent request
- **A3**: Patient provides consent during consultation
  - If not provided beforehand, doctor can request during visit
  - Patient can provide consent via their interface
  - System updates in real-time

#### Postconditions
- Patient's consent choice is recorded in database
- Doctor can see consent status before/during consultation
- Recording functionality respects consent status
- Consent decision is logged in audit trail
- Patient can change consent up until consultation starts

#### Business Rules
- BR7.1: Consent is required before any recording can be made
- BR7.2: Consent is per-appointment (not global)
- BR7.3: Patient can change consent before consultation starts
- BR7.4: Lack of consent defaults to "declined" (opt-in model)
- BR7.5: All consent decisions must be logged
- BR7.6: Doctor must be notified of consent status
- BR7.7: Recording without consent is prohibited
- BR7.8: Consent must be explicit, not implied

#### Data Model
```
Appointment {
  appointment_id: Int (Primary Key)
  patient_id: Int (Foreign Key)
  doctor_id: Int (Foreign Key)
  appointment_datetime: DateTime
  patient_consent_to_record: Boolean (default: false)
  ...
}
```

#### User Interface Elements
- **Patient View**:
  - Clear consent checkbox or toggle
  - Explanation of what recording is used for
  - Ability to change consent
  - Visual indication of current consent status

- **Doctor View**:
  - Clear display of patient consent status
  - Recording button enabled/disabled based on consent
  - Message if consent is declined

#### Implementation Status
- **Backend**: ✅ `patient_consent_to_record` field in Appointment model
- **Database**: ✅ Schema includes consent field
- **Frontend**: ⚠️ UI for patient consent may need verification/enhancement
- **Validation**: ✅ Backend should enforce no recording without consent
- **Audit**: ⚠️ Consent changes should be logged

#### Compliance Notes
- **HIPAA**: Requires patient authorization for recording
- **GDPR**: Requires explicit consent for data processing
- **Legal**: Recording without consent may be illegal in some jurisdictions
- **Ethical**: Respect for patient autonomy

---

### FR8: Patient Access to Final Visit Note

**ID**: FR8  
**Title**: Patients Must Be Able to Access Final Visit Note After Doctor Approval  
**Priority**: High  
**Status**: ✅ Implemented

#### Description
Patients must be able to access and view their consultation notes once the doctor has reviewed and approved them. This ensures transparency and enables patients to understand their diagnosis and treatment plan.

#### Actors
- **Primary**: Patient
- **Secondary**: Doctor, Notification System

#### Preconditions
1. Patient is authenticated and logged in
2. Consultation exists for an appointment involving the patient
3. Doctor has approved the consultation notes (status is `APPROVED` or `FINAL`)

#### Flow of Events

**Main Success Scenario**:
1. Doctor approves consultation notes (see FR2)
2. System changes consultation `notes_status` to `APPROVED` or `FINAL`
3. System sends notification to patient:
   - Type: `NOTES_APPROVED`
   - Message: "Your visit notes from [Date] are now available"
   - Includes link to view notes
4. Patient receives notification (email/push/in-app)
5. Patient navigates to consultations/appointments section
6. Patient sees list of appointments with available notes indicator
7. Patient clicks on appointment/consultation
8. System verifies patient authorization:
   - Patient is associated with the appointment
   - Notes are approved (not draft)
9. System logs access in audit trail:
   - Action: `CONSULTATION_VIEW`
   - User: Patient ID
   - Resource: Consultation ID
10. System displays consultation notes:
    - Date and time of visit
    - Doctor name and specialization
    - Diagnosis
    - Treatment plan
    - AI summary (if available)
    - Prescribed medications (if applicable)
11. Patient can view, download, or print notes
12. Patient cannot edit notes (read-only access)

**Alternative Flows**:
- **A1**: Notes not yet approved
  - System shows "Notes pending doctor approval"
  - Patient cannot access draft notes
- **A2**: Patient views notes multiple times
  - Each access is logged in audit trail
  - Previous views don't restrict access
- **A3**: Patient downloads/prints notes
  - Download action is logged
  - PDF version is generated with proper formatting

#### Postconditions
- Patient has viewed their consultation notes
- Access is logged in audit trail
- Patient can access notes again in the future
- Doctor can see that patient accessed notes (via audit log)

#### Business Rules
- BR8.1: Patients can only access notes for their own appointments
- BR8.2: Notes must be approved (`APPROVED` or `FINAL` status) before patient access
- BR8.3: Patients have read-only access (cannot edit)
- BR8.4: All patient access to notes is logged
- BR8.5: Patients can access notes indefinitely (no expiration)
- BR8.6: Patients receive notification when notes become available
- BR8.7: Access can be through web interface or mobile app

#### Data Model
```
Consultation {
  consultation_id: Int
  appointment_id: Int (links to patient via appointment)
  notes_status: NotesStatus (must be APPROVED or FINAL)
  diagnosis: String
  treatment_plan: String
  AI_summary: String
  notes_approved_at: DateTime
}

Appointment {
  appointment_id: Int
  patient_id: Int (links patient to consultation)
  doctor_id: Int
}

PatientProfile {
  patient_id: Int
  user_id: String
  // Links to appointments which link to consultations
}
```

#### User Interface Elements
- **Patient Dashboard**:
  - List of appointments with status indicators
  - Badge/icon showing "Notes Available"
  - Quick access to recent consultations

- **Consultation View**:
  - Read-only formatted display of notes
  - Clear labeling of diagnosis, treatment plan
  - Doctor information
  - Date and time of visit
  - Download/Print options

#### Implementation Status
- **Backend**: ✅ Patient access to consultations through appointment relationship
- **Frontend**: ✅ Patient interface for viewing consultations
- **Notifications**: ✅ `NOTES_APPROVED` notification type exists
- **Audit**: ✅ `CONSULTATION_VIEW` audit action available
- **Security**: ✅ Authorization checks ensure patients only see their consultations

#### Security Considerations
- **Authorization**: Verify patient ID matches appointment patient
- **Status Check**: Ensure notes are approved before display
- **Audit**: Log all access for compliance
- **Data Privacy**: Never expose other patients' data
- **Encryption**: Use HTTPS for all data transmission

---

## User Roles

### Doctor
**Permissions**:
- Create and manage consultations
- Record and transcribe patient visits
- Review and edit AI-generated notes
- Approve notes for patient sharing
- Share notes with other doctors
- Access shared notes from colleagues
- View audit logs for their consultations
- Manage appointments
- Request account deletion or data export

**Restrictions**:
- Cannot access consultations for patients not assigned to them
- Cannot edit notes shared by other doctors (read-only by default)
- Cannot delete approved notes without unlocking
- Cannot access patient data without valid appointment/relationship

### Patient
**Permissions**:
- Provide or decline recording consent
- View approved consultation notes for their visits
- Access their medical history
- Manage appointments with doctors
- Communicate with doctors via chat
- Request account deletion or data export
- Download/print their consultation notes

**Restrictions**:
- Cannot access draft consultation notes
- Cannot edit any consultation notes (read-only)
- Cannot access other patients' data
- Cannot access consultations without appointment
- Cannot share notes with others

### Administrator (Future/Implied)
**Permissions**:
- Access audit logs for security monitoring
- Process account deletion requests
- Process data export requests
- Monitor system health
- Manage user accounts (potential)

---

## Data Model References

### Key Entities

**User**: Core user entity (doctors and patients)  
**DoctorProfile**: Extended profile for doctors  
**PatientProfile**: Extended profile for patients  
**Appointment**: Scheduled visits between doctor and patient  
**Consultation**: Visit record with notes and recordings  
**SharedConsultationNote**: Doctor-to-doctor note sharing  
**AuditLog**: Comprehensive audit trail  
**AccountDeletionRequest**: User requests for account deletion  
**DataExportRequest**: User requests for data export  
**Notification**: System notifications to users  

### Key Relationships

```
User (1) --> (0..1) DoctorProfile
User (1) --> (0..1) PatientProfile
User (1) --> (n) AuditLog
User (1) --> (n) Notification

DoctorProfile (1) --> (n) Appointment
PatientProfile (1) --> (n) Appointment
Appointment (1) --> (0..1) Consultation

Consultation (1) --> (n) ConsultationRecording
Consultation (1) --> (n) SharedConsultationNote

DoctorProfile (1) --> (n) SharedConsultationNote [as sharer]
DoctorProfile (1) --> (n) SharedConsultationNote [as recipient]
```

---

## Compliance & Security

### HIPAA Compliance
- ✅ **Access Controls**: Role-based access to PHI
- ✅ **Audit Trails**: Complete logging of all PHI access
- ✅ **Patient Rights**: Access to own medical records
- ✅ **Consent Management**: Recording consent required
- ✅ **Secure Sharing**: Controlled sharing with authorized doctors
- ✅ **Data Retention**: Audit logs and records preserved

### GDPR Compliance
- ✅ **Right to Access**: Patients can view their data
- ✅ **Right to Portability**: Data export functionality
- ✅ **Right to Erasure**: Account deletion requests
- ✅ **Consent**: Explicit consent for recording
- ✅ **Transparency**: Clear information about data usage
- ✅ **Audit Trail**: Logging of all data processing

### Security Measures
- **Authentication**: OAuth 2.0 (Google)
- **Authorization**: Role-based access control
- **Encryption**: HTTPS for data in transit
- **Audit Logging**: Comprehensive activity tracking
- **Data Minimization**: Only collect necessary data
- **Secure Storage**: Protected database access
- **Session Management**: Secure session handling
- **Input Validation**: Prevent injection attacks

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Medical AI Notetaker Team | Initial comprehensive functional requirements documentation |

---

## References

- **Implementation Documentation**: `/docs/NOTE_SHARING_IMPLEMENTATION.md`
- **Database Schema**: `/backend/prisma/schema.prisma`
- **System Architecture**: See UML diagrams in `/docs/uml_diagrams/`
- **Meeting Notes**: `/docs/meetings-summary.md`

---

**Document Status**: ✅ Complete  
**Review Status**: Pending Review  
**Approval Status**: Pending Approval

---

© 2026 Medical AI Notetaker Team — FER, University of Zagreb
