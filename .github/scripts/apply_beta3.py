from pathlib import Path
import re


def replace_once(path: str, old: str, new: str, label: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise RuntimeError(f"Missing pattern for {label} in {path}")
    target.write_text(text.replace(old, new, 1))


# Feedback update action
path = Path("app/admin/supervisions/[caseId]/actions.ts")
text = path.read_text()
if "export async function updateFeedback(" not in text:
    marker = (
        '  revalidateSupervisionPages(caseId);\n'
        '  return { error: null, success: "Feedback posted." };\n'
        '}\n\n'
        'export async function createMilestone('
    )
    insertion = '''  revalidateSupervisionPages(caseId);
  return { error: null, success: "Feedback posted." };
}

export async function updateFeedback(
  _previousState: FeedbackActionState,
  formData: FormData
): Promise<FeedbackActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const caseId = String(formData.get("case_id") ?? "").trim();
  const feedbackId = String(formData.get("feedback_id") ?? "").trim();
  const feedbackText = String(formData.get("feedback_text") ?? "").trim();

  if (!caseId || !feedbackId || !feedbackText) {
    return { error: "Feedback cannot be empty.", success: null };
  }

  const { data: feedbackItem, error: feedbackError } = await supabase
    .from("feedback")
    .select("id, submission_id")
    .eq("id", feedbackId)
    .maybeSingle();

  if (feedbackError || !feedbackItem) {
    console.error(feedbackError);
    return { error: "The feedback could not be found.", success: null };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id")
    .eq("id", feedbackItem.submission_id)
    .eq("case_id", caseId)
    .maybeSingle();

  if (submissionError || !submission) {
    console.error(submissionError);
    return {
      error: "The feedback does not belong to this supervision.",
      success: null,
    };
  }

  const { error } = await supabase
    .from("feedback")
    .update({
      feedback_text: feedbackText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  if (error) {
    console.error(error);
    return { error: "Unable to update feedback.", success: null };
  }

  revalidateSupervisionPages(caseId);
  return { error: null, success: "Feedback updated." };
}

export async function createMilestone('''
    if marker not in text:
        raise RuntimeError("Feedback action insertion marker not found")
    path.write_text(text.replace(marker, insertion, 1))


# Feedback form guidance
path = Path("components/admin/feedback-form.tsx")
text = path.read_text()
if "Markdown is supported." not in text:
    old = '''        <textarea
          id={`feedback-${submissionId}`}
          name="feedback_text"
          required
          rows={4}
          placeholder="General feedback on this submission"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>'''
    new = '''        <textarea
          id={`feedback-${submissionId}`}
          name="feedback_text"
          required
          rows={6}
          placeholder="General feedback on this submission"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-2 text-xs leading-5 text-gray-500">
          Markdown is supported. Use <code>$...$</code> for inline LaTeX maths
          and <code>$$...$$</code> for display equations.
        </p>
      </div>'''
    if old not in text:
        raise RuntimeError("Feedback form marker not found")
    path.write_text(text.replace(old, new, 1))


# Admin submissions / feedback
path = Path("components/admin/admin-submissions-section.tsx")
text = path.read_text()
if 'FeedbackEditForm from "@/components/admin/feedback-edit-form"' not in text:
    text = text.replace(
        'import FeedbackForm from "@/components/admin/feedback-form";\n',
        'import FeedbackEditForm from "@/components/admin/feedback-edit-form";\n'
        'import FeedbackForm from "@/components/admin/feedback-form";\n'
        'import RichFeedback from "@/components/feedback/rich-feedback";\n'
        'import PaginatedList from "@/components/shared/paginated-list";\n',
        1,
    )
if "updated_at: string;" not in text:
    text = text.replace("    created_at: string;\n", "    created_at: string;\n    updated_at: string;\n", 1)
text = text.replace(
    '.select("id, submission_id, author_id, feedback_text, created_at")',
    '.select("id, submission_id, author_id, feedback_text, created_at, updated_at")',
    1,
)
if 'ariaLabel="Submissions pagination"' not in text:
    text = text.replace(
        '<div className="space-y-6">\n              {submissions.map',
        '<PaginatedList className="space-y-6" ariaLabel="Submissions pagination">\n              {submissions.map',
        1,
    )
    text = text.replace(
        '              })}\n            </div>\n          )}',
        '              })}\n            </PaginatedList>\n          )}',
        1,
    )
if "const canEditFeedback" not in text:
    text = text.replace(
        '                            const authorLabel = getProfileLabel(author);\n\n                            return (',
        '''                            const authorLabel = getProfileLabel(author);
                            const canEditFeedback =
                              canEditSubmissionDates || item.author_id === admin.id;
                            const wasEdited =
                              new Date(item.updated_at).getTime() >
                              new Date(item.created_at).getTime() + 1000;

                            return (''',
        1,
    )
text = text.replace(
    '''                                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                  {item.feedback_text}
                                </p>''',
    '''                                <RichFeedback>{item.feedback_text}</RichFeedback>''',
    1,
)
if "wasEdited ?" not in text:
    text = text.replace(
        '''                                  <p className="mt-1 text-xs text-gray-500">
                                    {formatPortalDateTime(item.created_at)}
                                  </p>
                                </div>
                              </div>''',
        '''                                  <p className="mt-1 text-xs text-gray-500">
                                    {formatPortalDateTime(item.created_at)}
                                    {wasEdited ? " · Edited" : ""}
                                  </p>
                                </div>
                                {canEditFeedback && (
                                  <FeedbackEditForm
                                    caseId={caseId}
                                    feedback={{
                                      id: item.id,
                                      feedback_text: item.feedback_text,
                                    }}
                                  />
                                )}
                              </div>''',
        1,
    )
if 'ariaLabel="Feedback pagination"' not in text:
    text = text.replace(
        '<div className="mt-3 space-y-3">\n                          {items.map',
        '<PaginatedList className="mt-3 space-y-3" ariaLabel="Feedback pagination">\n                          {items.map',
        1,
    )
    text = text.replace(
        '                          })}\n                        </div>\n                      )}',
        '                          })}\n                        </PaginatedList>\n                      )}',
        1,
    )
path.write_text(text)


# Admin milestone / meeting pagination
path = Path("app/admin/supervisions/[caseId]/page.tsx")
text = path.read_text()
if 'PaginatedList from "@/components/shared/paginated-list"' not in text:
    text = text.replace(
        'import MilestoneForm from "@/components/admin/milestone-form";\n',
        'import MilestoneForm from "@/components/admin/milestone-form";\n'
        'import PaginatedList from "@/components/shared/paginated-list";\n',
        1,
    )
if 'ariaLabel="Milestones pagination"' not in text:
    text = text.replace(
        '<div className="divide-y divide-gray-100">\n                {milestones.map',
        '<PaginatedList className="divide-y divide-gray-100" ariaLabel="Milestones pagination">\n                {milestones.map',
        1,
    )
    text = text.replace(
        '                ))}\n              </div>\n            )}',
        '                ))}\n              </PaginatedList>\n            )}',
        1,
    )
if 'ariaLabel="Meetings pagination"' not in text:
    text = text.replace(
        '<div className="divide-y divide-gray-100">\n                {meetings.map',
        '<PaginatedList className="divide-y divide-gray-100" ariaLabel="Meetings pagination">\n                {meetings.map',
        1,
    )
    text = text.replace(
        '                ))}\n              </div>\n            )}',
        '                ))}\n              </PaginatedList>\n            )}',
        1,
    )
path.write_text(text)


# Student view
path = Path("app/student/page.tsx")
text = path.read_text()
if 'RichFeedback from "@/components/feedback/rich-feedback"' not in text:
    text = text.replace(
        'import SubmissionUploadForm from "@/components/submissions/submission-upload-form";\n',
        'import RichFeedback from "@/components/feedback/rich-feedback";\n'
        'import PaginatedList from "@/components/shared/paginated-list";\n'
        'import SubmissionUploadForm from "@/components/submissions/submission-upload-form";\n',
        1,
    )
if "updated_at: string;" not in text:
    text = text.replace("    created_at: string;\n", "    created_at: string;\n    updated_at: string;\n", 1)
text = text.replace(
    '.select("id, submission_id, author_id, feedback_text, created_at")',
    '.select("id, submission_id, author_id, feedback_text, created_at, updated_at")',
    1,
)
if 'ariaLabel="Submissions pagination"' not in text:
    text = text.replace(
        '<div className="mt-6 space-y-5">\n              {submissions.length',
        '<PaginatedList className="mt-6 space-y-5" ariaLabel="Submissions pagination">\n              {submissions.length',
        1,
    )
    upload_heading = '<h2 className="text-lg font-semibold text-gray-950">Upload submission</h2>'
    upload_index = text.index(upload_heading)
    prefix = text[:upload_index]
    suffix = text[upload_index:]
    close_index = prefix.rfind('            </div>\n          </div>')
    if close_index == -1:
        raise RuntimeError("Student submissions closing marker not found")
    prefix = prefix[:close_index] + '            </PaginatedList>\n          </div>' + prefix[close_index + len('            </div>\n          </div>'):]
    text = prefix + suffix
if 'ariaLabel="Feedback pagination"' not in text:
    text = text.replace(
        '<div className="mt-3 space-y-3">\n                            {items.map',
        '<PaginatedList className="mt-3 space-y-3" ariaLabel="Feedback pagination">\n                            {items.map',
        1,
    )
    text = text.replace(
        '                            })}\n                          </div>\n                        )}',
        '                            })}\n                          </PaginatedList>\n                        )}',
        1,
    )
text = text.replace(
    '''                                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                    {item.feedback_text}
                                  </p>''',
    '''                                  <RichFeedback>{item.feedback_text}</RichFeedback>''',
    1,
)
if '" · Edited"' not in text:
    text = text.replace(
        '''                                    <p className="mt-1 text-xs text-gray-500">
                                      {formatPortalDateTime(item.created_at)}
                                    </p>''',
        '''                                    <p className="mt-1 text-xs text-gray-500">
                                      {formatPortalDateTime(item.created_at)}
                                      {new Date(item.updated_at).getTime() >
                                      new Date(item.created_at).getTime() + 1000
                                        ? " · Edited"
                                        : ""}
                                    </p>''',
        1,
    )

milestone_heading = '<h2 className="text-lg font-semibold text-gray-950">Milestones</h2>'
meeting_heading = '<h2 className="text-lg font-semibold text-gray-950">Supervision meetings</h2>'
if 'ariaLabel="Milestones pagination"' not in text:
    milestone_index = text.index(milestone_heading)
    meeting_index = text.index(meeting_heading)
    before = text[:milestone_index]
    block = text[milestone_index:meeting_index]
    after = text[meeting_index:]
    block = block.replace(
        '<div className="mt-5 space-y-4">',
        '<PaginatedList className="mt-5 space-y-4" ariaLabel="Milestones pagination">',
        1,
    )
    block = block.replace('</div>\n          </div>', '</PaginatedList>\n          </div>', 1)
    text = before + block + after
if 'ariaLabel="Meetings pagination"' not in text:
    meeting_index = text.index(meeting_heading)
    before = text[:meeting_index]
    block = text[meeting_index:]
    block = block.replace(
        '<div className="mt-5 space-y-4">',
        '<PaginatedList className="mt-5 space-y-4" ariaLabel="Meetings pagination">',
        1,
    )
    block = block.replace('</div>\n          </div>', '</PaginatedList>\n          </div>', 1)
    text = before + block
path.write_text(text)


# KaTeX CSS
path = Path("app/layout.tsx")
text = path.read_text()
if 'katex/dist/katex.min.css' not in text:
    if 'import "./globals.css";' in text:
        text = text.replace(
            'import "./globals.css";',
            'import "katex/dist/katex.min.css";\nimport "./globals.css";',
            1,
        )
    else:
        text = 'import "katex/dist/katex.min.css";\n' + text
path.write_text(text)


# Release identity
Path("lib/config/site.ts").write_text('''export const SITE_CONFIG = {
  savvyCalUrl: "https://savvycal.com/udp/meetings",
  personalWebsiteUrl: "https://bgonzalezbustamante.com",
  empiriaLabUrl: "https://empirialab.cl",
  releaseVersion: "v0.1.0-beta.3",
  releaseCodename: "Brisk Forge",
};
''')

Path("components/shared/site-footer.tsx").write_text('''import { SITE_CONFIG } from "@/lib/config/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-5 text-center text-sm text-gray-500">
        <p>
          Supervision Portal - {SITE_CONFIG.releaseVersion} &quot;
          {SITE_CONFIG.releaseCodename}&quot;
        </p>
        <p className="mt-1">
          <a
            href={SITE_CONFIG.personalWebsiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-700 hover:text-gray-950"
          >
            Dr. Bastián González-Bustamante
          </a>
          , developed by{" "}
          <a
            href={SITE_CONFIG.empiriaLabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-700 hover:text-gray-950"
          >
            Empiria Lab
          </a>
        </p>
      </div>
    </footer>
  );
}
''')


# README version
path = Path("README.md")
text = path.read_text()
if "**Current version:**" not in text:
    text = text.replace(
        "Built with **Next.js**, **Supabase**, and **Netlify**.\n",
        'Built with **Next.js**, **Supabase**, and **Netlify**.\n\n**Current version:** `v0.1.0-beta.3 "Brisk Forge"`\n',
        1,
    )
else:
    text = re.sub(
        r"\*\*Current version:\*\*.*",
        '**Current version:** `v0.1.0-beta.3 "Brisk Forge"`',
        text,
        count=1,
    )
path.write_text(text)


# CHANGELOG
path = Path("CHANGELOG.md")
text = path.read_text()
if '## v0.1.0-beta.3 "Brisk Forge"' not in text:
    entry = '''# CHANGELOG

## v0.1.0-beta.3 "Brisk Forge"

### Summary

- Added editing for existing feedback while preserving case-scoped permissions.
- Added Markdown rendering for feedback, including GitHub-flavoured Markdown features.
- Added LaTeX mathematical notation using inline `$...$` and display `$$...$$` syntax rendered with KaTeX.
- Added an edited-state indicator based on the existing feedback `updated_at` timestamp.
- Limited milestones, meetings, submissions, and feedback histories to five visible items at a time with pagination.
- Added the current release version and codename to the README and site footer.

### Notes

- Existing plain-text feedback remains valid and renders as normal Markdown text.
- Raw HTML in feedback remains disabled.
- Feedback permissions are unchanged: the primary/global supervisor may edit all feedback, while assigned staff may edit only their own feedback.
- Pagination is client-side within each supervision view and preserves the existing newest-first ordering of milestones, meetings, and submissions.

---

'''
    if text.startswith("# CHANGELOG\n\n"):
        text = entry + text[len("# CHANGELOG\n\n"):]
    else:
        text = entry + text
path.write_text(text)
