-- 1. DIAGNOSTIC: Check Row Level Security on inscripcions
-- If RLS is enabled but no policy allows SELECT for the anon/authenticated role, the admin won't see anything.

-- Enable RLS (just to be sure, usually good practice, but we need policies)
ALTER TABLE inscripcions ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow EVERYTHING for now (since we are in development/admin mode)
-- In production, you'd want strictly authenticated users or specific roles.
DROP POLICY IF EXISTS "Enable read access for all" ON inscripcions;
DROP POLICY IF EXISTS "Enable insert for all" ON inscripcions;
DROP POLICY IF EXISTS "Enable update for all" ON inscripcions;
DROP POLICY IF EXISTS "Enable delete for all" ON inscripcions;

CREATE POLICY "Enable all access for all" ON inscripcions FOR ALL USING (true) WITH CHECK (true);

-- 2. FINANCE MODULE TABLES

CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    category TEXT NOT NULL, -- e.g., 'shop', 'grant', 'invoice', 'manual'
    description TEXT,
    payment_method TEXT, -- 'cash', 'card', 'transfer'
    status TEXT DEFAULT 'paid',
    attachment_url TEXT, -- Link to storage
    reference_id UUID, -- Link to shop_orders.id or payments.id
    reference_type TEXT -- 'shop_order', 'extracurricular_payment'
);

-- Enable RLS for finance_transactions
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all" ON finance_transactions FOR ALL USING (true) WITH CHECK (true);


-- 3. SHOP ORDERS UPDATES

-- Add new status columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_orders' AND column_name = 'payment_status') THEN
        ALTER TABLE shop_orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_orders' AND column_name = 'delivery_status') THEN
        ALTER TABLE shop_orders ADD COLUMN delivery_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Update existing records to have consistent default values based on the old 'status' if needed
-- This part assumes 'status' column exists and might map to payment/delivery. 
-- For now, we just set defaults.

-- Create storage bucket for invoices if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true) ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'invoices' ); 
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'invoices' );
