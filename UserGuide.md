# User Guide

## Anonymous Posting

### Using the Feature

1. Open a topic (for replies) or click **New Topic** (for a new post).
2. Compose your message.
3. Toggle **Post anonymously**:

   * **Quick Reply**: check the “Post anonymously” box below the input.
   * **Full Composer**: use the anonymous toggle (if your theme exposes it) or the page control provided by your deployment.
4. Submit your post.

### Post Behavior

* If a post is **anonymous**, non-owners and non-mods will see the author as **Anonymous** (uid `0`), **no** profile link, **no** avatar.
* The **owner** (the poster) and **moderators/admins** still see the real author.
* Masking applies consistently to:

  * **Topic list / category cards** (header author and teasers)
  * **Topic page** (main post and replies)
  * **Live socket events** to guests

### User Testing (Manual)

* Post an **anonymous reply** as User A, then view it as a **Guest/User B** → author should be **Anonymous** (no avatar/profile link).
* View the same reply as **User A** → your real username is visible.
* Create an **anonymous topic** as User A, then:

  * Check the **category list** → topic card shows **Anonymous** for Guest/User B.
  * Open the **topic page** → main post shows **Anonymous** for Guest/User B.
* Verify **non-anonymous** posts still show normal names/avatars.
* Verify **moderators/admins** always see real authors.

### Automated Tests

**Location:** `test/topics.js` (all tests for anonymization live in this file)

**What’s covered:**

* **Anonymous topic masking (topic page)**
  Creates an anonymous topic and verifies:

  * For **non-owners**: `posts[0].anonymous === true`, `user.uid === 0`, `user.username === 'Anonymous'`
  * For the **owner**: real username remains visible
* **Anonymous replies masking**
  Posts an anonymous reply and verifies (for guests):

  * Author is masked as **Anonymous**
  * `anonymous` is a **boolean** end-to-end
* **Category list masking**
  Fetches category topics and verifies:

  * **Guests** see the topic **header** author masked (uid `0`, username `Anonymous`, no `userslug`)
  * **Admins/Mods** see the real header author

**Why these tests are sufficient:**
They exercise the main read/render paths where identity could leak (category list, topic page, replies, and owner/mod vs non-owner views) and assert that `anonymous` is correctly typed as a boolean.

---

## Post Visibility
### Overview

This feature enables restricting posts and topics to specific user groups in NodeBB. Content can be visible to all users, specific groups, multiple groups, or registered users only.

### How to Use

#### Creating a Restricted Topic or Post

1. **Start creating a new topic or post** in any category
2. **Locate the "Visibility" dropdown** at the top of the composer
3. **Select the groups** that should be able to see your content:
   - Click on the dropdown to see available groups
   - Select one or more groups
   - Select "all" for public posts (default)
   - Select "registered-users" to restrict to logged-in users only
4. **Write your content** and submit

#### Visibility Options

- **Public (All)**: Everyone can see the content
- **Specific Groups**: Only members of selected groups can see it
- **Multiple Groups**: Members of any selected group can see it
- **Registered Users**: Only logged-in users can see it

#### Important Rules

- **Restricted Topics**: If the main post of a topic is restricted, all replies automatically inherit that restriction
- **Public Topics**: Replies can have custom visibility settings
- **Author Access**: You can always see your own posts, regardless of restrictions
- **Guest Access**: Guests can only see public posts

### How to Test

#### Test Setup

1. **Start NodeBB**

2. **Create test groups** (Admin Panel → Groups):
   - Create "TestGroup"
   - Create "TestGroup2"

3. **Create test users**:
   - Create "groupmember" and add to "TestGroup"
   - Create "multigroupmember" and add to both "TestGroup" and "TestGroup2"
   - Create "nonmember" without any group membership
   - Use guest access (not logged in)

#### Testing Scenario 1: Guests Can Only View Public Posts

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

#### Testing Scenario 2: Restricting to a Single Group

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

#### Testing Scenario 3: Restricting to Multiple Groups

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

### Automated Tests

#### Location
**File**: `test/posts/visibility.js`

#### Running Tests
```bash
npm test -- test/posts/visibility.js
```

### What Is Being Tested

The automated tests validate:

- **Core Functionality**: Group-based access control, public vs. restricted posts, author ownership
- **Security**: Guest restrictions, non-member blocking, group validation
- **Edge Cases**: Null/undefined data, invalid JSON, empty arrays, missing fields
- **Real-World Scenarios**: Batch operations, multiple group memberships, mixed visibility
- **Data Integrity**: JSON string vs. array formats, group name matching
- **Integration**: Works correctly with Topics, Posts, Groups, and User modules

### Why These Tests Are Sufficient

**All core features tested**: Group access control, public/private distinction, guest restrictions, author privileges, multiple groups
**Edge cases covered**: Handles malformed data, null values, invalid JSON, missing fields gracefully
**Real-world scenarios**: Batch filtering, multiple group memberships, complex user scenarios
**Security validated**: Enforces restrictions at the data layer, prevents unauthorized access

---

## Topics Search
### How to Use
1. Select a category.

2. Enter your desired search term into the search bar.

3. Press “Enter” or click “Search”.

4. View your search results.

### Search Result Behavior

* If you have enabled pagination in your user settings, pagination will also be applied to search results.

* If you do not have permissions to view a specific post, it will not show up in your search results.

### How to Test
**Manual Tests**
Pagination of Search Results
1. Log in as any user.
2. Navigate to User Profile > Settings > Toggle on “Paginate topics and posts instead of using infinite scroll”.
3. Set the “Topics per Page” to 2 for easier testing.
4. Open the “General Discussion” category.
5. Create test topics.
    - Make sure there are more than 2 topics that share a common term (i.e., welcome).
6. Enter the common term (i.e., welcome) into the search bar and click “Search”.
7. Check that the results are paginated and you can navigate between pages to view all of the search results.

Search Results follow Visibility Permissions
1. Log in to the admin account.
2. Open the “General Discussion” category.
3. Create a post with the “Visibility” set to only “administrators” and including a specific term (i.e., welcome).
4. Log out and log in to another account.
5. Open the “General Discussion” category.
6. Enter the term (i.e., welcome) into the search bar and click “Search”.
7. Check that the post created with the admin account is not part of the search results.

Stress Test Inputs
1. Open any category.
2. Make random test topics and posts.
3. Try random terms, including ones with varying lengths (including no input) and ones that are only included inside the reply post for a topic or author usernames.
4. Check that the results are accurate.

**Automated Tests**
[`test/topics/search.js`](https://github.com/CMU-313/nodebb-fall-2025-null-terminators/blob/main/test/topics/search.js)
* testing `searchInCategory` backend function that performs the search filtering
    * find topic by search term in title
    * find topic by search term in title (case insensitive)
    * find topic by search term in post content
    * find topic by search term in post author username
    * results do not include unrelated topics
    * results do not include duplicates if multiple criteria matched
    * results sorted by most recent first
* testing endpoint route
    * JSON is returned with the correct search term when a search term is included
    * search term is returned as null when no search term is included

Run:
```bash
npm test -- test/topics/search.js
```

[`test/api.js`](https://github.com/CMU-313/nodebb-fall-2025-null-terminators/blob/main/test/api.js)
* checks that api routes are defined in the schema docs
* checks that the request and result parameters all match between the schema and the controller

**Why these tests are sufficient**
* The automated tests check that the search is working for all of the different ways a search term is matched to a topic: the topic’s title, the topic’s posts’ content, and the topic’s posts’ author usernames. They also check that the search function doesn’t return duplicates and is working correctly when there are no search results. The manual tests help supplement these by specifically checking for the two use cases that are difficult to automate, but were implemented: pagination and visibility permissions. The manual testing also shows that the frontend and backend are properly connected. Both the manual and automated tests cover checks that the endpoint routes are working as expected.

---

## Date Filtering (Feature In Progress: Integration between frontend and backend not complete)
### How to use
Enter a category and find the Date Filtering Button on the list of filters below the search bar

Click on the Date Filtering Button to open the list of inputs needed to search by date

Enter inputs into the 3 text boxes. For month, enter in MM format, for day enter in DD format, for year enter in YYYY format, all numerical. 

Click the submit button after all inputs are entered.

View your filtered topics

### How to test

link/description of where your added automated tests
**Automated Tests**
[`test/topics.js`](https://github.com/CMU-313/nodebb-fall-2025-null-terminators/blob/main/test/topics.js)
* testing `getTopicsByDate` backend function that performs the topic filtering
    * returns an empty array if no topics were posted on a specific date.
    * returns an array of all the tids in a specific timeframe if there are topics during that time.
    * returns an array of all the tids in a specific timeframe when creating a new category and posting in new category.

Run:
```bash
npm test -- test/topics.js
```

**Manual Tests**
Stress Testing Inputs
Open the general discussions category in your NodeBB with the Admin first post.
Make a post in that category. It will have a different date due to how old the original post by admin is. 
Filter by date to only see the admin post. 
Filter by date to only see the newest post.
Filter for a date where no posts are visible.
Filter with no inputs to see if that causes issues.


**Description of what is being tested**
    * These tests make sure that bad inputs will not break the feature.
    * These tests make sure that the topics are getting properly filtered by date. 
    * These tests make sure that the date filter functionality is working on new categories.


**Why you believe the tests are sufficient**
I believe that the tests are sufficient, as knowing that bad inputs won’t cause issues through testing with NodeBB, we can focus on making sure that the functionality of the date filtering is good. These tests check to see if the backend function is getting the topics correctly by date and not getting ones unrelated, which is the primary function of the date filter button. These tests also account for new categories to make sure that each category comes with a functioning date filtering button.
