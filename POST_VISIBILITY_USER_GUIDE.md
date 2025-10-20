## Overview

This feature enables restricting posts and topics to specific user groups in NodeBB. Content can be visible to all users, specific groups, multiple groups, or registered users only.

---

## How to Use

### Creating a Restricted Topic or Post

1. **Start creating a new topic or post** in any category
2. **Locate the "Visibility" dropdown** at the top of the composer
3. **Select the groups** that should be able to see your content:
   - Click on the dropdown to see available groups
   - Select one or more groups
   - Select "all" for public posts (default)
   - Select "registered-users" to restrict to logged-in users only
4. **Write your content** and submit

### Visibility Options

- **Public (All)**: Everyone can see the content
- **Specific Groups**: Only members of selected groups can see it
- **Multiple Groups**: Members of any selected group can see it
- **Registered Users**: Only logged-in users can see it

### Important Rules

- **Restricted Topics**: If the main post of a topic is restricted, all replies automatically inherit that restriction
- **Public Topics**: Replies can have custom visibility settings
- **Author Access**: You can always see your own posts, regardless of restrictions
- **Guest Access**: Guests can only see public posts

---

## How to Test

### Test Setup

1. **Start NodeBB**

2. **Create test groups** (Admin Panel → Groups):
   - Create "TestGroup"
   - Create "TestGroup2"

3. **Create test users**:
   - Create "groupmember" and add to "TestGroup"
   - Create "multigroupmember" and add to both "TestGroup" and "TestGroup2"
   - Create "nonmember" without any group membership
   - Use guest access (not logged in)

---

### Testing Scenario 1: Guests Can Only View Public Posts

**Steps:**

1. **Create a public topic** (as any logged-in user):
   - Start creating a new topic
   - Open the "Visibility" dropdown
   - Select "all"
   - Write content and submit

2. **Create a restricted topic** (as any logged-in user):
   - Start creating a new topic
   - Open the "Visibility" dropdown
   - Select "TestGroup"
   - Write content and submit

3. **Test as guest**:
   - Log out (or open incognito window)
   - Browse the category
   - **Expected**: Public topic is visible
   - **Expected**: Restricted topic is NOT visible

4. **Test as logged-in user**:
   - Log in as "nonmember"
   - Browse the category
   - **Expected**: Public topic is visible
   - **Expected**: Restricted topic is NOT visible

---

### Testing Scenario 2: Restricting to a Single Group

**Steps:**

1. **Create a topic restricted to TestGroup**:
   - Log in as any user
   - Start creating a new topic
   - Open the "Visibility" dropdown
   - Select "TestGroup" (only this group)
   - Write content: "This is restricted to TestGroup only"
   - Submit

2. **Test as group member**:
   - Log in as "groupmember"
   - Browse the category
   - **Expected**: Topic is visible
   - Click on the topic
   - **Expected**: Can read the content

3. **Test as non-member**:
   - Log in as "nonmember"
   - Browse the category
   - **Expected**: Topic is NOT visible in the list
   - Try accessing directly via URL
   - **Expected**: Access denied or not found

4. **Test as guest**:
   - Log out
   - Browse the category
   - **Expected**: Topic is NOT visible

5. **Test as author (special case)**:
   - Log in as the user who created the topic
   - Browse the category
   - **Expected**: Topic is visible (authors always see their own posts)

---

### Testing Scenario 3: Restricting to Multiple Groups

**Steps:**

1. **Create a topic restricted to multiple groups**:
   - Log in as any user
   - Start creating a new topic
   - Open the "Visibility" dropdown
   - Select both "TestGroup" AND "TestGroup2"
   - Write content: "This is visible to TestGroup OR TestGroup2"
   - Submit

2. **Test as member of first group only**:
   - Log in as "groupmember" (in TestGroup only)
   - Browse the category
   - **Expected**: Topic is visible
   - Click on the topic
   - **Expected**: Can read the content

3. **Test as member of second group only**:
   - Create a new user "group2member" and add to "TestGroup2" only
   - Log in as "group2member"
   - Browse the category
   - **Expected**: Topic is visible
   - Click on the topic
   - **Expected**: Can read the content

4. **Test as member of both groups**:
   - Log in as "multigroupmember"
   - Browse the category
   - **Expected**: Topic is visible
   - Click on the topic
   - **Expected**: Can read the content

5. **Test as non-member of any group**:
   - Log in as "nonmember"
   - Browse the category
   - **Expected**: Topic is NOT visible

6. **Test as guest**:
   - Log out
   - Browse the category
   - **Expected**: Topic is NOT visible

---

## Automated Tests

### Location
**File**: `test/posts/visibility.js`

### Running Tests
```bash
npm test -- test/posts/visibility.js
```

---

## What Is Being Tested

The automated tests validate:

- **Core Functionality**: Group-based access control, public vs. restricted posts, author ownership
- **Security**: Guest restrictions, non-member blocking, group validation
- **Edge Cases**: Null/undefined data, invalid JSON, empty arrays, missing fields
- **Real-World Scenarios**: Batch operations, multiple group memberships, mixed visibility
- **Data Integrity**: JSON string vs. array formats, group name matching
- **Integration**: Works correctly with Topics, Posts, Groups, and User modules

---

## Why These Tests Are Sufficient

**All core features tested**: Group access control, public/private distinction, guest restrictions, author privileges, multiple groups
**Edge cases covered**: Handles malformed data, null values, invalid JSON, missing fields gracefully
**Real-world scenarios**: Batch filtering, multiple group memberships, complex user scenarios
**Security validated**: Enforces restrictions at the data layer, prevents unauthorized access