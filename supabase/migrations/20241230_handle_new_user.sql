-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username, onboarding_completed, created_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    -- Generate a temporary username or use email part if available
    COALESCE(
      new.raw_user_meta_data->>'user_name', 
      split_part(new.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4)
    ),
    false, -- FORCE onboarding_completed to false
    now()
  );
  return new;
end;
$$;

-- Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
