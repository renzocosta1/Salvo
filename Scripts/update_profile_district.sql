-- =====================================================
-- Update User Profile with District Information
-- =====================================================
-- This script updates renzorodriguez2001@gmail.com with their
-- actual Anne Arundel County address and district information
--
-- NOTE: Using MD-3 to match 2024 primary ballot data
-- (District 32 may be in MD-5 as of 2026, but was in MD-3 for 2024 election)

-- Anne Arundel County, District 32 (8620 Jacks Reef Rd, Laurel, MD)
UPDATE profiles
SET
  county = 'Anne Arundel',
  legislative_district = '32',
  congressional_district = 'MD-3',  -- CD-3 for 2024 primary testing
  state = 'Maryland',
  address_line1 = '8620 Jacks Reef Rd',
  city = 'Laurel',
  zip_code = '20724',
  geocoded_at = now(),
  updated_at = now()
WHERE id IN (
  SELECT id
  FROM auth.users
  WHERE email = 'renzorodriguez2001@gmail.com'
);

-- Verify the update
SELECT 
  u.email,
  p.county,
  p.legislative_district,
  p.congressional_district,
  p.address_line1,
  p.city,
  p.zip_code,
  p.state
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'renzorodriguez2001@gmail.com';

-- =====================================================
-- Other Available Districts (for other test accounts)
-- =====================================================

-- Montgomery County, District 18 (for testing)
-- UPDATE profiles SET county = 'Montgomery', legislative_district = '18', congressional_district = 'MD-6', state = 'Maryland', address_line1 = '123 Test St', city = 'Rockville', zip_code = '20850', geocoded_at = now() WHERE id IN (SELECT id FROM auth.users WHERE email = 'OTHER_EMAIL@gmail.com');

-- Montgomery County, District 16 (for testing)
-- UPDATE profiles SET county = 'Montgomery', legislative_district = '16', congressional_district = 'MD-8', state = 'Maryland', geocoded_at = now() WHERE id IN (SELECT id FROM auth.users WHERE email = 'OTHER_EMAIL@gmail.com');

-- =====================================================
-- Notes
-- =====================================================
-- Montgomery County Districts: 15, 16, 17, 18, 19, 20, 39
-- Anne Arundel County Districts: 30, 31, 32, 33
-- 
-- After running this, refresh the app to see your ballot!
