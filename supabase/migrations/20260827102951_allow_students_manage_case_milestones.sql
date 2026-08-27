create policy "Students can create case milestones"
on public.milestones
for insert
to authenticated
with check (
  case_id is not null
  and private.is_case_member(case_id)
  and student_id is null
);

create policy "Students can update case milestones"
on public.milestones
for update
to authenticated
using (
  case_id is not null
  and private.is_case_member(case_id)
)
with check (
  case_id is not null
  and private.is_case_member(case_id)
  and student_id is null
);
