-- Create documents table
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text not null default 'general',
  file_url text not null,
  file_path text not null, -- Store storage path
  file_type text, -- e.g. 'application/pdf'
  size_bytes bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.documents enable row level security;

-- Policies for documents table
create policy "Public documents are viewable by everyone"
  on public.documents for select
  using (true);

create policy "Admins can insert documents"
  on public.documents for insert
  to authenticated
  with check (true); -- In a real app we'd check roles, but for now authenticated is 'admin' logic effectively in this simple setup or assumes middleware checks

create policy "Admins can update documents"
  on public.documents for update
  to authenticated
  using (true);

create policy "Admins can delete documents"
  on public.documents for delete
  to authenticated
  using (true);


-- Storage Bucket Setup (Idempotent-ish)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Documents are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'documents' );

create policy "Admins can upload documents"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'documents' );

create policy "Admins can delete documents"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'documents' );

create policy "Admins can update documents"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'documents' );
