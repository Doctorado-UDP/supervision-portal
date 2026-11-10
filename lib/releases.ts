export type ReleaseNoteSection = {
  title: string;
  items: string[];
};

// Exactly one entry is the "Current beta"; it is shown in the site footer.
export type ReleaseStatus = "Current beta" | "In development";

export type ReleaseNote = {
  version: string;
  codename?: string;
  status?: ReleaseStatus;
  releaseDate?: string;
  comparison: string;
  summary: string;
  sections: ReleaseNoteSection[];
};

export const releases: ReleaseNote[] = [
  {
    version: "v0.1.0-beta.8",
    status: "In development",
    comparison: "Ongoing development since beta.7",
    summary:
      "Beta.8 development has started. This release is still in progress, with further changes planned and its release date and codename to be confirmed.",
    sections: [
      {
        title: "Feedback",
        items: [
          "Fixed the layout of mathematical notation in feedback, such as the size of subscripts and superscripts.",
        ],
      },
      {
        title: "Security and platform",
        items: [
          "Updated the portal's framework and supporting packages to their latest compatible versions.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0-beta.7",
    codename: "Autumn Forge",
    status: "Current beta",
    releaseDate: "2026-11-03",
    comparison: "What changed since beta.6",
    summary:
      "Autumn Forge is a security-focused release: it updates the portal's framework to fix critical upstream vulnerabilities, tightens access controls and sign-in links, and lets meeting times be entered and read in both Santiago and Amsterdam time.",
    sections: [
      {
        title: "Security and platform",
        items: [
          "Updated Next.js to 16.4.5 to incorporate upstream security fixes, including two critical vulnerabilities and the November 2026 security release, while keeping the framework version pinned.",
          "Updated supporting packages so the portal's production dependencies report no high or critical security advisories.",
          "Added browser security protections to every page and asked search engines not to index the portal.",
          "Password-reset and invitation links now always return to the portal's own address.",
          "Tightened database and file-storage permissions, and recorded the portal's file access rules alongside its code.",
          "Uploaded documents are now limited to PDF and Word files at the storage level as well as in the upload form.",
        ],
      },
      {
        title: "Meetings and dates",
        items: [
          "Meeting times can be entered in Santiago or Amsterdam time, and every meeting is shown in both.",
          "Milestone completion dates now follow the Santiago calendar date and are no longer reset when a completed milestone is edited.",
        ],
      },
      {
        title: "Accounts and access",
        items: [
          "Fixed password recovery links that could report an error even though the link was valid.",
          "Cancelling or retrying an invitation can no longer remove an account that existed before the invitation.",
          "Error messages for passwords, uploads and edits are clearer, and edits that are not permitted now say so instead of appearing to succeed.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0-beta.6",
    codename: "Rustic Peak",
    releaseDate: "2026-09-24",
    comparison: "What changed since beta.5",
    summary:
      "Rustic Peak improves day-to-day supervision planning, makes account navigation more consistent, and strengthens the portal's Supabase Data API security defaults.",
    sections: [
      {
        title: "Planning and meetings",
        items: [
          "Milestones now prioritise upcoming target dates, with the nearest deadline first; overdue open milestones follow and completed milestones are kept at the bottom.",
          "Upcoming supervision meetings now appear nearest first, while past meetings are grouped below them with the most recent past meeting first.",
          "The same ordering is used in supervisor, staff and Student supervision views.",
        ],
      },
      {
        title: "Navigation and accounts",
        items: [
          "The Student Account link now uses the same bordered control styling as supervisor and staff accounts.",
          "Signing out now keeps users on the correct production or preview host instead of exposing a Netlify deployment-specific address.",
        ],
      },
      {
        title: "Security and platform",
        items: [
          "Adopted Supabase's safer Data API defaults ahead of the October 2026 platform change, so future database objects must be explicitly exposed to application roles.",
          "Existing table access was left unchanged, so the hardening does not disrupt the current portal.",
          "Removed unnecessary anonymous access to two internal supervision operations and verified that the corresponding Supabase security warnings were cleared.",
          "Updated Next.js to 16.3.6 to incorporate upstream security fixes while keeping the framework version pinned.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0-beta.5",
    codename: "Spring Quartz",
    releaseDate: "2026-08-27",
    comparison: "What changed since beta.4",
    summary:
      "Spring Quartz gives students more direct control over shared supervision planning and makes milestone ordering more consistent across the portal.",
    sections: [
      {
        title: "Student milestones",
        items: [
          "Students can now add shared milestones directly from their own supervision page.",
          "Students can edit milestone titles, descriptions, target dates and statuses for their supervision case.",
          "Students cannot delete milestones.",
        ],
      },
      {
        title: "Timetable",
        items: [
          "Timetable milestones are now ordered by target date with the most recent dates first, matching the milestone ordering used in supervision views.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0-beta.4",
    codename: "Ivory Monolith",
    releaseDate: "2026-08-26",
    comparison: "What changed since beta.3",
    summary:
      "Ivory Monolith makes account administration part of the portal itself, adds self-service account and password recovery tools, and makes release history easier to understand.",
    sections: [
      {
        title: "Access and invitations",
        items: [
          "Added a primary-supervisor-only Access area for viewing portal accounts and managing invitations.",
          "New Student and Staff invitations can be sent from inside the portal instead of requiring manual work in the Supabase dashboard.",
          "Pending invitations can be retried or cancelled before onboarding is completed.",
          "Accepted invitations are now recognised automatically when the invited user first signs in, so completed onboarding no longer remains marked as pending.",
          "The primary supervisor can delete unused accounts from Access, while accounts with supervision history, group supervision or Staff assignments are protected from accidental deletion.",
          "Invitation roles are recorded by the portal and applied securely when the invited account is created.",
          "Invited Student accounts now appear immediately in Students as setup-required entries until their supervision details are configured.",
        ],
      },
      {
        title: "Students and navigation",
        items: [
          "The Students area now separates account invitation from supervision setup: programme, dates and status are added only when the student is configured.",
          "The student setup form reuses the invited account name instead of asking for it a second time.",
          "Admin module navigation is right-aligned and uses button-style tabs with a clear active state, while UDP branding and the portal title remain on the left.",
        ],
      },
      {
        title: "Personal accounts",
        items: [
          "Added an Account page where signed-in users can update their display name, request an email-address change and change their password.",
          "The Account page uses the same UDP branding as the main portal header.",
          "Added password recovery from the sign-in page for users who can no longer access their account.",
          "Password recovery does not reveal whether a submitted email address belongs to a portal account.",
          "New and changed passwords continue to require at least 10 characters.",
        ],
      },
      {
        title: "Release information",
        items: [
          "Added a public Release notes page explaining each beta in user-friendly language.",
          "The version and codename in the footer now link directly to the release history and use the same bold link styling as the other footer links.",
          "Release metadata now has one shared source so the footer and release-notes page stay synchronised.",
        ],
      },
      {
        title: "Production housekeeping",
        items: [
          "Aligned the Supabase configuration with the deployed portal and Netlify preview URLs.",
          "Disabled seed loading by default and aligned the configured Storage limit with the portal's 25 MB submission limit.",
          "Removed unused starter SVG files left over from the original Next.js project scaffold.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0-beta.3",
    codename: "Brisk Forge",
    releaseDate: "2026-08-25",
    comparison: "What changed since beta.2",
    summary:
      "Brisk Forge improved the supervision record itself, making feedback richer and editable while keeping longer histories manageable.",
    sections: [
      {
        title: "Feedback",
        items: [
          "Feedback can be edited after posting while retaining both its original posting time and latest edit time.",
          "Feedback supports Markdown formatting and LaTeX-style mathematical notation.",
          "The primary supervisor can delete feedback, while assigned staff and students cannot.",
        ],
      },
      {
        title: "Submissions and history",
        items: [
          "The primary supervisor can delete a submission together with its uploaded file and associated feedback.",
          "Milestones, meetings, submissions and feedback histories show five items at a time with pagination.",
          "Newest milestones, meetings and submissions remain at the top of their histories.",
        ],
      },
      {
        title: "Release identity",
        items: [
          "Added the release version and codename to the README and portal footer.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0-beta.2",
    codename: "Lunar Maple",
    releaseDate: "2026-08-24",
    comparison: "What changed since beta.1",
    summary:
      "Lunar Maple expanded day-to-day supervision management by making planning records editable and giving submissions a clearer document date.",
    sections: [
      {
        title: "Milestones and meetings",
        items: [
          "Milestone titles, descriptions, target dates and statuses can be edited.",
          "Meeting dates, times and notes can be edited.",
          "Milestones and meetings are displayed newest first.",
        ],
      },
      {
        title: "Submissions",
        items: [
          "Added an Original date alongside the upload timestamp so a document can retain its substantive date even when uploaded later.",
          "Submissions are ordered by the newest Original date first.",
          "Only the primary supervisor can change submission dates.",
        ],
      },
      {
        title: "Production reliability",
        items: [
          "Pinned the application to Node.js 24 and tightened the invitation-only authentication configuration.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0-beta.1",
    codename: "Winter Fjord",
    releaseDate: "2026-08-21",
    comparison: "First beta release",
    summary:
      "Winter Fjord established the first production-ready Supervision Portal for students, supervision cases, planning, submissions and feedback.",
    sections: [
      {
        title: "Supervision workspace",
        items: [
          "Added individual and group supervision cases with students and assigned staff.",
          "Added milestones, meetings, submissions and feedback in one shared supervision record.",
          "Added a timetable and role-specific supervisor, staff and student views.",
        ],
      },
      {
        title: "Security and files",
        items: [
          "Added invitation-only Supabase authentication and first-time onboarding.",
          "Added case-scoped permissions so assigned staff see only the cases they work on.",
          "Added private Storage for supervision documents with authenticated downloads.",
        ],
      },
    ],
  },
];

// Falls back to the newest released entry, never one still in development.
export const currentRelease =
  releases.find((release) => release.status === "Current beta") ??
  releases.find((release) => release.releaseDate) ??
  releases[0];
