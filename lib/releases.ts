export type ReleaseNoteSection = {
  title: string;
  items: string[];
};

export type ReleaseNote = {
  version: string;
  codename: string;
  status?: string;
  comparison: string;
  summary: string;
  sections: ReleaseNoteSection[];
};

export const releases: ReleaseNote[] = [
  {
    version: "v0.1.0-beta.4",
    codename: "Ivory Monolith",
    status: "Current beta",
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

export const currentRelease = releases[0];
