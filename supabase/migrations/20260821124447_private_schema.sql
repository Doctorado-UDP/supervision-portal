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

