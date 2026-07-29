---
Name: QA Smoke Test Checklist
About: Use this checklist to verify critical flows before a major release.
Title: 'QA Smoke Test: Release v1.0'
Labels: 'qa, smoke-test'
Assignees: ''
---

> **Instructions:** Check off each item as you verify the flow in the staging or production environment. If any critical flow fails, please halt the release process and open a bug report.

## 🔐 1. Login and First-Time Setup
- [ ] User can successfully log in with valid credentials.
- [ ] First-time users are correctly redirected to the setup screen.
- [ ] User can successfully update their password and profile details during setup.
- [ ] User is correctly routed to their respective dashboard after setup completion.

## 👥 2. User Management (Superadmin)
- [ ] Superadmin can access the user management dashboard.
- [ ] Superadmin can successfully create a new user and assign a role.
- [ ] Superadmin can successfully edit/update an existing user's details.
- [ ] Superadmin can successfully deactivate or delete a user.

## ⏱️ 3. Time Tracking (DTR)
- [ ] User can successfully **Clock In** and the system records the correct timestamp.
- [ ] User can successfully **Take a Break** and **End Break**.
- [ ] User can successfully **Clock Out** at the end of the shift.

## 📝 4. Leave Request Submission
- [ ] User can navigate to the Leave Request form.
- [ ] User can fill out the required dates, leave type, and reason.
- [ ] User can successfully submit the form and see the request marked as **Pending**.

## ✅ 5. Leave Approval Workflow (Admin)
- [ ] Admin can view a list of pending leave requests.
- [ ] Admin can successfully **Approve** a leave request (status updates for both Admin and User).
- [ ] Admin can successfully **Reject** a leave request with a reason.

## 📋 6. Task Management (Admin)
- [ ] Admin can successfully create a new task.
- [ ] Admin can assign the task to a specific user.
- [ ] Admin can update the task details or change its status (e.g., **In Progress**, **Completed**).

## 🔔 7. Notifications
- [ ] System triggers a notification for a critical event (e.g., assigning a task or approving leave).
- [ ] The notification bell icon shows an unread indicator/badge.
- [ ] The user can click the bell or navigate to the notifications page to read the specific alert.