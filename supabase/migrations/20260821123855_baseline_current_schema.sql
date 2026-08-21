set local check_function_bodies = off;

create or replace function private.can_access_case (
  target_case_id uuid
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select
    private.is_global_supervisor()
    or private.is_case_member(target_case_id)
    or private.is_case_staff(target_case_id);
$function$;

create or replace function private.can_access_case_storage_path (
  object_name text
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select

    -- --------------------------------------------------------
    -- PRIMARY SUPERVISOR
    -- --------------------------------------------------------

    private.is_global_supervisor()

    -- --------------------------------------------------------
    -- STUDENT: NEW CASE PATH
    -- --------------------------------------------------------

    or exists (
      select 1

      from public.case_members viewer_cm

      join public.students viewer_student
        on viewer_student.id =
          viewer_cm.student_id

      where
        viewer_cm.case_id::text =
          split_part(object_name, '/', 1)

        and viewer_student.user_id =
          auth.uid()
    )

    -- --------------------------------------------------------
    -- STUDENT: LEGACY STUDENT PATH
    --
    -- Another student in the same current case may read a file
    -- originally stored under one member's old student folder.
    -- --------------------------------------------------------

    or exists (
      select 1

      from public.students file_student

      join public.case_members file_cm
        on file_cm.student_id =
          file_student.id

      join public.case_members viewer_cm
        on viewer_cm.case_id =
          file_cm.case_id

      join public.students viewer_student
        on viewer_student.id =
          viewer_cm.student_id

      where
        file_student.id::text =
          split_part(object_name, '/', 1)

        and viewer_student.user_id =
          auth.uid()
    )

    -- --------------------------------------------------------
    -- ASSIGNED STAFF: NEW CASE PATH
    -- --------------------------------------------------------

    or exists (
      select 1

      from public.case_staff cs

      join public.profiles p
        on p.id =
          cs.staff_id

      where
        cs.case_id::text =
          split_part(object_name, '/', 1)

        and cs.staff_id =
          auth.uid()

        and p.role =
          'admin'
    )

    -- --------------------------------------------------------
    -- ASSIGNED STAFF: LEGACY STUDENT PATH
    -- --------------------------------------------------------

    or exists (
      select 1

      from public.students file_student

      join public.case_members file_cm
        on file_cm.student_id =
          file_student.id

      join public.case_staff cs
        on cs.case_id =
          file_cm.case_id

      join public.profiles p
        on p.id =
          cs.staff_id

      where
        file_student.id::text =
          split_part(object_name, '/', 1)

        and cs.staff_id =
          auth.uid()

        and p.role =
          'admin'
    );
$function$;

create or replace function private.can_access_submission (
  target_submission_id uuid
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select exists (
    select 1
    from public.submissions s
    where s.id = target_submission_id
      and (
        private.is_admin()

        or (
          s.case_id is not null
          and private.can_access_case(s.case_id)
        )

        or (
          s.student_id is not null
          and s.student_id = private.current_student_id()
        )
      )
  );
$function$;

create or replace function private.can_staff_read_profile (
  target_profile_id uuid
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select
    private.is_global_supervisor()

    or exists (
      select 1
      from public.case_staff viewer_cs

      join public.profiles viewer_profile
        on viewer_profile.id =
          viewer_cs.staff_id

      join public.case_members cm
        on cm.case_id =
          viewer_cs.case_id

      join public.students s
        on s.id =
          cm.student_id

      where viewer_cs.staff_id =
          auth.uid()

        and viewer_profile.role =
          'admin'

        and s.user_id =
          target_profile_id
    )

    or exists (
      select 1
      from public.case_staff viewer_cs

      join public.profiles viewer_profile
        on viewer_profile.id =
          viewer_cs.staff_id

      join public.case_staff target_cs
        on target_cs.case_id =
          viewer_cs.case_id

      where viewer_cs.staff_id =
          auth.uid()

        and viewer_profile.role =
          'admin'

        and target_cs.staff_id =
          target_profile_id
    );
$function$;

create or replace function private.current_student_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
    select s.id
    from public.students s
    where s.user_id = (select auth.uid())
    limit 1;
$function$;

create or replace function private.handle_new_student_case()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
  AS $function$
declare
  v_case_id uuid;
  v_supervisor_id uuid;
  v_student_name text;
begin

  -- ==========================================================
  -- PRIMARY SUPERVISOR
  -- ==========================================================

  select p.id
  into v_supervisor_id
  from public.profiles p
  where
    lower(p.email) =
      lower(
        'bastian.gonzalez.b@mail.udp.cl'
      )
    and p.role = 'admin'
  limit 1;


  if v_supervisor_id is null then
    raise exception
      'Primary supervisor account could not be found.';
  end if;


  -- ==========================================================
  -- STUDENT NAME
  -- ==========================================================

  select p.full_name
  into v_student_name
  from public.profiles p
  where p.id = new.user_id;


  if v_student_name is null
     or trim(v_student_name) = '' then
    v_student_name :=
      'Student';
  end if;


  -- ==========================================================
  -- CREATE INDIVIDUAL CASE
  -- ==========================================================

  insert into public.supervision_cases (
    title,
    case_type,
    programme,
    start_date,
    target_completion_date,
    status
  )
  values (
    trim(v_student_name)
      || ' — Supervision',

    'individual',

    new.programme,
    new.start_date,
    new.target_completion_date,
    new.status
  )
  returning id
  into v_case_id;


  -- ==========================================================
  -- ADD STUDENT TO CASE
  -- ==========================================================

  insert into public.case_members (
    case_id,
    student_id
  )
  values (
    v_case_id,
    new.id
  );


  -- ==========================================================
  -- ASSIGN PRIMARY SUPERVISOR
  -- ==========================================================

  insert into public.case_staff (
    case_id,
    staff_id,
    staff_role
  )
  values (
    v_case_id,
    v_supervisor_id,
    'supervisor'
  );


  -- ==========================================================
  -- KEEP LEGACY SUPERVISIONS TABLE SYNCHRONISED
  -- ==========================================================

  insert into public.supervisions (
    supervisor_id,
    student_id
  )
  values (
    v_supervisor_id,
    new.id
  )
  on conflict do nothing;


  return new;

end;
$function$;

create or replace function private.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
  AS $function$
begin

    insert into public.profiles (
        id,
        full_name,
        email,
        role
    )
    values (
        new.id,

        coalesce(
            nullif(new.raw_user_meta_data ->> 'full_name', ''),
            nullif(new.raw_user_meta_data ->> 'name', ''),
            split_part(new.email, '@', 1),
            'User'
        ),

        new.email,

        'student'
    )

    on conflict (id) do nothing;

    return new;

end;
$function$;

create or replace function private.handle_user_email_update()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
  AS $function$
begin

    update public.profiles
    set
        email = new.email,
        updated_at = now()
    where id = new.id;

    return new;

end;
$function$;

create or replace function private.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select private.is_global_supervisor();
$function$;

create or replace function private.is_case_member (
  target_case_id uuid
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select exists (
    select 1
    from public.case_members cm
    join public.students s
      on s.id = cm.student_id
    where cm.case_id = target_case_id
      and s.user_id = auth.uid()
  );
$function$;

create or replace function private.is_case_staff (
  target_case_id uuid
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select exists (
    select 1
    from public.case_staff cs
    join public.profiles p
      on p.id = cs.staff_id
    where cs.case_id = target_case_id
      and cs.staff_id = auth.uid()
      and p.role = 'admin'
  );
$function$;

create or replace function private.is_case_staff_for_student (
  target_student_id uuid
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select exists (
    select 1
    from public.case_members cm
    where cm.student_id = target_student_id
      and private.is_case_staff(cm.case_id)
  );
$function$;

create or replace function private.is_case_staff_for_submission (
  target_submission_id uuid
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select exists (
    select 1
    from public.submissions s
    where s.id = target_submission_id
      and s.case_id is not null
      and private.is_case_staff(s.case_id)
  );
$function$;

create or replace function private.is_global_supervisor()
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and lower(p.email) =
        lower('bastian.gonzalez.b@mail.udp.cl')
  );
$function$;

create or replace function private.owns_submission (
  target_submission_id uuid
)
  returns boolean
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
    select exists (
        select 1
        from public.submissions sub
        join public.students stu
          on stu.id = sub.student_id
        where sub.id = target_submission_id
          and stu.user_id = (select auth.uid())
    );
$function$;

create or replace function private.sync_content_case_id()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
  AS $function$
declare
  v_case_id uuid;
begin

  -- ----------------------------------------------------------
  -- Legacy application write:
  -- student_id supplied, case_id omitted.
  -- ----------------------------------------------------------

  if new.case_id is null
     and new.student_id is not null then

    select cm.case_id
    into v_case_id
    from public.case_members cm
    where cm.student_id = new.student_id
    limit 1;


    if v_case_id is null then
      raise exception
        'Student % does not belong to a supervision case.',
        new.student_id;
    end if;


    new.case_id :=
      v_case_id;

  end if;


  -- ----------------------------------------------------------
  -- Both supplied:
  -- ensure the student actually belongs to the case.
  -- ----------------------------------------------------------

  if new.case_id is not null
     and new.student_id is not null then

    if not exists (
      select 1
      from public.case_members cm
      where
        cm.case_id = new.case_id
        and cm.student_id = new.student_id
    ) then

      raise exception
        'Student % is not a member of supervision case %.',
        new.student_id,
        new.case_id;

    end if;

  end if;


  -- ----------------------------------------------------------
  -- Neither supplied is never valid.
  -- ----------------------------------------------------------

  if new.case_id is null then
    raise exception
      'A supervision case is required.';
  end if;


  return new;

end;
$function$;

create or replace function public.admin_configure_supervision_case (
  p_case_id                uuid,
  p_title                  text,
  p_student_ids            uuid[],
  p_staff_ids              uuid[],
  p_programme              text,
  p_start_date             date,
  p_target_completion_date date,
  p_status                 text
)
  returns uuid
  language plpgsql
  security definer
  set search_path to ''
  AS $function$
declare
  v_target_case_id uuid;
  v_source_case_id uuid;
  v_new_case_id uuid;

  v_supervisor_id uuid;

  v_student_id uuid;
  v_staff_id uuid;

  v_student_count integer;
  v_existing_count integer;
  v_case_member_count integer;

  v_student_record record;
begin

  -- ==========================================================
  -- 1. AUTHORISATION
  -- ==========================================================

  if not private.is_admin() then
    raise exception
      'Only administrators can configure supervision cases.';
  end if;


  -- ==========================================================
  -- 2. BASIC VALIDATION
  -- ==========================================================

  if p_title is null
     or trim(p_title) = '' then
    raise exception
      'A supervision title is required.';
  end if;


  v_student_count :=
    cardinality(
      coalesce(
        p_student_ids,
        '{}'::uuid[]
      )
    );


  if v_student_count < 1
     or v_student_count > 3 then
    raise exception
      'A supervision case must contain between 1 and 3 students.';
  end if;


  select
    count(distinct student_id)
  into v_existing_count
  from unnest(
    p_student_ids
  ) as student_id;


  if v_existing_count
     <> v_student_count then
    raise exception
      'Each student may only be selected once.';
  end if;


  select
    count(*)
  into v_existing_count
  from public.students
  where id = any(
    p_student_ids
  );


  if v_existing_count
     <> v_student_count then
    raise exception
      'One or more selected students do not exist.';
  end if;


  if p_status not in (
    'active',
    'on_track',
    'attention',
    'completed',
    'inactive'
  ) then
    raise exception
      'Invalid supervision status.';
  end if;


  -- ==========================================================
  -- 3. LOCATE PRIMARY SUPERVISOR
  -- ==========================================================

  select p.id
  into v_supervisor_id
  from public.profiles p
  where lower(p.email) =
    lower(
      'bastian.gonzalez.b@mail.udp.cl'
    )
    and p.role = 'admin'
  limit 1;


  if v_supervisor_id is null then
    raise exception
      'Primary supervisor account could not be found.';
  end if;


  -- ==========================================================
  -- 4. VALIDATE ADDITIONAL STAFF
  -- ==========================================================

  if exists (
    select 1
    from unnest(
      coalesce(
        p_staff_ids,
        '{}'::uuid[]
      )
    ) as requested_staff_id
    left join public.profiles p
      on p.id =
        requested_staff_id
    where
      p.id is null
      or p.role <> 'admin'
  ) then
    raise exception
      'All selected staff members must have an admin account.';
  end if;


  -- ==========================================================
  -- 5. DETERMINE TARGET CASE
  -- ==========================================================

  if p_case_id is not null then

    select sc.id
    into v_target_case_id
    from public.supervision_cases sc
    where sc.id =
      p_case_id;


    if v_target_case_id is null then
      raise exception
        'The requested supervision case does not exist.';
    end if;

  else

    -- Every existing student received an individual case in C1.
    -- For a new configuration we reuse the first selected
    -- student's existing case rather than creating a duplicate.

    select cm.case_id
    into v_target_case_id
    from public.case_members cm
    where cm.student_id =
      p_student_ids[1];


    if v_target_case_id is null then
      raise exception
        'The first selected student does not have an existing supervision case.';
    end if;


    select count(*)
    into v_case_member_count
    from public.case_members cm
    where cm.case_id =
      v_target_case_id;


    if v_case_member_count <> 1 then
      raise exception
        'The first selected student already belongs to a group supervision.';
    end if;

  end if;


  -- ==========================================================
  -- 6. REMOVE STUDENTS NO LONGER IN TARGET CASE
  -- ==========================================================
  --
  -- This is mainly useful when editing an existing group.
  -- A removed student receives a fresh individual case.
  -- Their student-specific submissions, milestones and
  -- meetings follow them into that individual case.
  -- ==========================================================

  for v_student_id in

    select cm.student_id
    from public.case_members cm
    where cm.case_id =
      v_target_case_id
      and not (
        cm.student_id =
        any(p_student_ids)
      )

  loop

    select
      s.id,
      s.programme,
      s.start_date,
      s.target_completion_date,
      s.status,
      p.full_name
    into v_student_record
    from public.students s
    join public.profiles p
      on p.id = s.user_id
    where s.id =
      v_student_id;


    insert into public.supervision_cases (
      title,
      case_type,
      programme,
      start_date,
      target_completion_date,
      status
    )
    values (
      coalesce(
        nullif(
          trim(
            v_student_record.full_name
          ),
          ''
        ),
        'Student'
      )
      || ' — Supervision',

      'individual',

      v_student_record.programme,
      v_student_record.start_date,
      v_student_record.target_completion_date,
      v_student_record.status
    )
    returning id
    into v_new_case_id;


    update public.submissions
    set case_id =
      v_new_case_id
    where case_id =
      v_target_case_id
      and student_id =
        v_student_id;


    update public.milestones
    set case_id =
      v_new_case_id
    where case_id =
      v_target_case_id
      and student_id =
        v_student_id;


    update public.meetings
    set case_id =
      v_new_case_id
    where case_id =
      v_target_case_id
      and student_id =
        v_student_id;


    update public.case_members
    set case_id =
      v_new_case_id
    where case_id =
      v_target_case_id
      and student_id =
        v_student_id;


    insert into public.case_staff (
      case_id,
      staff_id,
      staff_role
    )
    values (
      v_new_case_id,
      v_supervisor_id,
      'supervisor'
    )
    on conflict (
      case_id,
      staff_id
    )
    do update set
      staff_role =
        'supervisor';


    delete from public.supervisions
    where student_id =
      v_student_id;


    insert into public.supervisions (
      supervisor_id,
      student_id
    )
    values (
      v_supervisor_id,
      v_student_id
    )
    on conflict do nothing;

  end loop;


  -- ==========================================================
  -- 7. ADD / MERGE NEW STUDENTS INTO TARGET CASE
  -- ==========================================================

  foreach v_student_id
  in array p_student_ids

  loop

    -- Skip students already in the target case.

    if exists (
      select 1
      from public.case_members cm
      where cm.case_id =
        v_target_case_id
        and cm.student_id =
          v_student_id
    ) then
      continue;
    end if;


    select cm.case_id
    into v_source_case_id
    from public.case_members cm
    where cm.student_id =
      v_student_id;


    if v_source_case_id is null then
      raise exception
        'Selected student % does not have a supervision case.',
        v_student_id;
    end if;


    select count(*)
    into v_case_member_count
    from public.case_members cm
    where cm.case_id =
      v_source_case_id;


    if v_case_member_count <> 1 then
      raise exception
        'A selected student already belongs to another group supervision.';
    end if;


    -- Check for version collisions before merging submissions.
    -- Example:
    -- both students have "Chapter 1", version 1.

    if exists (
      select 1
      from public.submissions source_submission
      join public.submissions target_submission
        on target_submission.case_id =
          v_target_case_id
        and target_submission.title =
          source_submission.title
        and target_submission.version =
          source_submission.version
      where source_submission.case_id =
        v_source_case_id
    ) then
      raise exception
        'Submission title/version conflict detected while merging student cases.';
    end if;


    -- Move existing content before deleting the old case.

    update public.submissions
    set case_id =
      v_target_case_id
    where case_id =
      v_source_case_id;


    update public.milestones
    set case_id =
      v_target_case_id
    where case_id =
      v_source_case_id;


    update public.meetings
    set case_id =
      v_target_case_id
    where case_id =
      v_source_case_id;


    -- Move the student's membership.

    update public.case_members
    set case_id =
      v_target_case_id
    where case_id =
      v_source_case_id
      and student_id =
        v_student_id;


    -- At this point the old individual case contains no
    -- case-level content or members and can safely be removed.

    delete from public.supervision_cases
    where id =
      v_source_case_id;

  end loop;


  -- ==========================================================
  -- 8. UPDATE TARGET CASE
  -- ==========================================================

  update public.supervision_cases
  set
    title =
      trim(p_title),

    case_type =
      case
        when v_student_count = 1
          then 'individual'
        else 'group'
      end,

    programme =
      nullif(
        trim(
          coalesce(
            p_programme,
            ''
          )
        ),
        ''
      ),

    start_date =
      p_start_date,

    target_completion_date =
      p_target_completion_date,

    status =
      p_status,

    updated_at =
      now()

  where id =
    v_target_case_id;


  -- ==========================================================
  -- 9. KEEP LEGACY STUDENT RECORDS SYNCHRONISED
  -- ==========================================================
  --
  -- The current application still reads these fields from
  -- public.students. C4 will make the case the source of truth.
  -- ==========================================================

  update public.students
  set
    programme =
      nullif(
        trim(
          coalesce(
            p_programme,
            ''
          )
        ),
        ''
      ),

    start_date =
      p_start_date,

    target_completion_date =
      p_target_completion_date,

    status =
      p_status,

    updated_at =
      now()

  where id =
    any(p_student_ids);


  -- ==========================================================
  -- 10. CONFIGURE CASE STAFF
  -- ==========================================================
  --
  -- Bastián is always supervisor.
  -- Every other selected admin is staff.
  -- ==========================================================

  delete from public.case_staff
  where case_id =
    v_target_case_id;


  insert into public.case_staff (
    case_id,
    staff_id,
    staff_role
  )
  values (
    v_target_case_id,
    v_supervisor_id,
    'supervisor'
  );


  foreach v_staff_id
  in array coalesce(
    p_staff_ids,
    '{}'::uuid[]
  )

  loop

    if v_staff_id =
      v_supervisor_id then
      continue;
    end if;


    insert into public.case_staff (
      case_id,
      staff_id,
      staff_role
    )
    values (
      v_target_case_id,
      v_staff_id,
      'staff'
    )
    on conflict (
      case_id,
      staff_id
    )
    do update set
      staff_role =
        'staff';

  end loop;


  -- ==========================================================
  -- 11. KEEP LEGACY SUPERVISIONS TABLE SYNCHRONISED
  -- ==========================================================
  --
  -- The old table continues to represent the primary
  -- supervisor only. TAs/staff are represented in case_staff.
  -- ==========================================================

  delete from public.supervisions
  where student_id =
    any(p_student_ids);


  insert into public.supervisions (
    supervisor_id,
    student_id
  )

  select
    v_supervisor_id,
    selected_student_id

  from unnest(
    p_student_ids
  ) as selected_student_id

  on conflict do nothing;


  -- ==========================================================
  -- 12. FINAL MEMBERSHIP CHECK
  -- ==========================================================

  select count(*)
  into v_existing_count
  from public.case_members cm
  where cm.case_id =
    v_target_case_id;


  if v_existing_count
     <> v_student_count then
    raise exception
      'The final supervision membership does not match the requested students.';
  end if;


  return v_target_case_id;

end;
$function$;

create or replace function public.get_case_people (
  p_case_id uuid
)
  returns table (
    profile_id       uuid,
    full_name        text,
    participant_type text,
    staff_role       text
  )
  language sql
  stable
  security definer
  set search_path to ''
  AS $function$
  select
    p.id as profile_id,
    p.full_name,
    'student'::text as participant_type,
    null::text as staff_role
  from public.case_members cm
  join public.students s
    on s.id = cm.student_id
  join public.profiles p
    on p.id = s.user_id
  where cm.case_id = p_case_id
    and private.can_access_case(p_case_id)

  union all

  select
    p.id as profile_id,
    p.full_name,
    'staff'::text as participant_type,
    cs.staff_role::text as staff_role
  from public.case_staff cs
  join public.profiles p
    on p.id = cs.staff_id
  where cs.case_id = p_case_id
    and private.can_access_case(p_case_id);
$function$;

