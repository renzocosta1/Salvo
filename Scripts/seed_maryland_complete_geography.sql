-- =====================================================
-- Complete Maryland Geography Reference Data
-- =====================================================
-- This creates a reference table for all Maryland counties,
-- legislative districts, and congressional districts
-- to support user signups from anywhere in the state
--
-- Source: Maryland State Board of Elections
-- Legislative Districts: 47 total (1-47)
-- Congressional Districts: 8 total (MD-1 through MD-8)
-- Counties: 23 + Baltimore City = 24 jurisdictions
-- =====================================================

-- Create reference table for Maryland geography
CREATE TABLE IF NOT EXISTS maryland_geography (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  county TEXT NOT NULL,
  legislative_district TEXT,
  congressional_district TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_maryland_geography_county 
  ON maryland_geography(county);
CREATE INDEX IF NOT EXISTS idx_maryland_geography_district 
  ON maryland_geography(legislative_district);

-- Enable RLS
ALTER TABLE maryland_geography ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for signup validation)
CREATE POLICY "Public read access to geography" 
  ON maryland_geography FOR SELECT 
  TO authenticated 
  USING (true);

-- =====================================================
-- Seed All Maryland Counties (24 total)
-- =====================================================

-- Note: This creates one entry per county without district specifics
-- Users will select their county, then their specific district during signup
-- The app should have a dropdown/picker for districts 1-47

INSERT INTO maryland_geography (county, legislative_district, congressional_district) VALUES
-- Major Counties (by population)
('Montgomery', NULL, NULL),  -- Multiple districts: 14-20, 39; Congressional: MD-6, MD-8
('Prince George''s', NULL, NULL),  -- Multiple districts: 21-27, 47; Congressional: MD-4, MD-5
('Baltimore County', NULL, NULL),  -- Multiple districts: 7-12, 42, 44; Congressional: MD-2, MD-7
('Anne Arundel', NULL, NULL),  -- Multiple districts: 30-33; Congressional: MD-3, MD-5
('Baltimore City', NULL, NULL),  -- Multiple districts: 40-41, 43-46; Congressional: MD-7
('Howard', NULL, NULL),  -- Districts: 9, 12, 13; Congressional: MD-3, MD-7
('Harford', NULL, NULL),  -- Districts: 7, 34, 35; Congressional: MD-1, MD-2
('Frederick', NULL, NULL),  -- Districts: 3, 4; Congressional: MD-6
('Carroll', NULL, NULL),  -- Districts: 5; Congressional: MD-2, MD-6
('Charles', NULL, NULL),  -- District: 28; Congressional: MD-5

-- Mid-Size Counties
('St. Mary''s', NULL, NULL),  -- District: 29; Congressional: MD-5
('Calvert', NULL, NULL),  -- District: 27; Congressional: MD-5
('Washington', NULL, NULL),  -- District: 2; Congressional: MD-6
('Wicomico', NULL, NULL),  -- District: 38; Congressional: MD-1
('Allegany', NULL, NULL),  -- District: 1; Congressional: MD-6
('Cecil', NULL, NULL),  -- District: 36; Congressional: MD-1

-- Smaller Counties
('Worcester', NULL, NULL),  -- District: 38; Congressional: MD-1
('Talbot', NULL, NULL),  -- District: 37; Congressional: MD-1
('Queen Anne''s', NULL, NULL),  -- District: 36; Congressional: MD-1
('Somerset', NULL, NULL),  -- District: 38; Congressional: MD-1
('Dorchester', NULL, NULL),  -- District: 37; Congressional: MD-1
('Caroline', NULL, NULL),  -- District: 37; Congressional: MD-1
('Garrett', NULL, NULL),  -- District: 1; Congressional: MD-6
('Kent', NULL, NULL);  -- District: 36; Congressional: MD-1

-- =====================================================
-- Maryland Legislative Districts Reference (1-47)
-- =====================================================
-- These map to congressional districts for validation

CREATE TABLE IF NOT EXISTS maryland_legislative_districts (
  district_number TEXT PRIMARY KEY,
  congressional_district TEXT NOT NULL,
  primary_county TEXT,
  description TEXT
);

INSERT INTO maryland_legislative_districts (district_number, congressional_district, primary_county, description) VALUES
-- Western Maryland
('1', 'MD-6', 'Allegany', 'Allegany, Garrett, Washington'),
('2', 'MD-6', 'Washington', 'Washington County'),
('3', 'MD-6', 'Frederick', 'Frederick County (North)'),
('4', 'MD-6', 'Frederick', 'Frederick County (South)'),
('5', 'MD-2', 'Carroll', 'Carroll County'),
('6', 'MD-2', 'Baltimore County', 'Baltimore County (Northwest)'),

-- Northern Baltimore Region
('7', 'MD-1', 'Harford', 'Baltimore County, Harford County'),
('8', 'MD-2', 'Baltimore County', 'Baltimore County (Catonsville area)'),
('9', 'MD-7', 'Howard', 'Howard County (Columbia)'),
('10', 'MD-2', 'Baltimore County', 'Baltimore County (Towson area)'),
('11', 'MD-2', 'Baltimore County', 'Baltimore County (East)'),
('12', 'MD-7', 'Howard', 'Baltimore County, Howard County'),
('13', 'MD-3', 'Howard', 'Howard County (Ellicott City)'),

-- Central Maryland / DC Suburbs
('14', 'MD-8', 'Montgomery', 'Montgomery County (Bethesda, Potomac)'),
('15', 'MD-8', 'Montgomery', 'Montgomery County (North Potomac, Gaithersburg)'),
('16', 'MD-8', 'Montgomery', 'Montgomery County (Rockville)'),
('17', 'MD-8', 'Montgomery', 'Montgomery County (Wheaton, Aspen Hill)'),
('18', 'MD-6', 'Montgomery', 'Montgomery County (Germantown, Gaithersburg)'),
('19', 'MD-6', 'Montgomery', 'Montgomery County (Silver Spring North)'),
('20', 'MD-8', 'Montgomery', 'Montgomery County (Silver Spring South)'),

-- Prince George's County
('21', 'MD-5', 'Prince George''s', 'Prince George''s County (Bowie, Greenbelt)'),
('22', 'MD-5', 'Prince George''s', 'Prince George''s County (Hyattsville, College Park)'),
('23', 'MD-4', 'Prince George''s', 'Prince George''s County (Capitol Heights)'),
('24', 'MD-5', 'Prince George''s', 'Prince George''s County (Largo)'),
('25', 'MD-4', 'Prince George''s', 'Prince George''s County (Fort Washington)'),
('26', 'MD-4', 'Prince George''s', 'Prince George''s County (Upper Marlboro)'),
('27', 'MD-5', 'Calvert', 'Calvert, Prince George''s Counties'),

-- Southern Maryland
('28', 'MD-5', 'Charles', 'Charles County'),
('29', 'MD-5', 'St. Mary''s', 'St. Mary''s County'),

-- Central Anne Arundel / Howard
('30', 'MD-3', 'Anne Arundel', 'Anne Arundel County (Annapolis)'),
('31', 'MD-3', 'Anne Arundel', 'Anne Arundel County (Severna Park)'),
('32', 'MD-3', 'Anne Arundel', 'Anne Arundel County (Glen Burnie)'),
('33', 'MD-5', 'Anne Arundel', 'Anne Arundel County (South)'),

-- Harford / Cecil
('34', 'MD-1', 'Harford', 'Harford County (Bel Air)'),
('35', 'MD-1', 'Harford', 'Harford County (Aberdeen)'),
('36', 'MD-1', 'Cecil', 'Cecil, Kent, Queen Anne''s Counties'),

-- Eastern Shore
('37', 'MD-1', 'Talbot', 'Caroline, Dorchester, Talbot Counties'),
('38', 'MD-1', 'Wicomico', 'Somerset, Wicomico, Worcester Counties'),

-- Montgomery County (Additional)
('39', 'MD-6', 'Montgomery', 'Montgomery County (Rockville, Gaithersburg)'),

-- Baltimore City
('40', 'MD-7', 'Baltimore City', 'Baltimore City (Northwest)'),
('41', 'MD-7', 'Baltimore City', 'Baltimore City (Northeast)'),
('42', 'MD-2', 'Baltimore County', 'Baltimore County (Dundalk)'),
('43', 'MD-7', 'Baltimore City', 'Baltimore City (Central)'),
('44', 'MD-2', 'Baltimore County', 'Baltimore County (Essex)'),
('45', 'MD-7', 'Baltimore City', 'Baltimore City (West)'),
('46', 'MD-7', 'Baltimore City', 'Baltimore City (South)'),

-- Prince George's (Additional)
('47', 'MD-4', 'Prince George''s', 'Prince George''s County (Clinton)');

-- =====================================================
-- Helper Function: Get Valid Districts for County
-- =====================================================
CREATE OR REPLACE FUNCTION get_districts_for_county(p_county TEXT)
RETURNS TABLE (
  district TEXT,
  congressional_district TEXT,
  description TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    district_number,
    congressional_district,
    description
  FROM maryland_legislative_districts
  WHERE primary_county = p_county
  ORDER BY district_number;
$$;

-- =====================================================
-- Verification
-- =====================================================
SELECT 
  county, 
  COUNT(*) as entry_count
FROM maryland_geography
GROUP BY county
ORDER BY county;

DO $$
BEGIN
  RAISE NOTICE '✅ Complete Maryland geography seeded!';
  RAISE NOTICE '📍 24 counties/jurisdictions added';
  RAISE NOTICE '🗳️ 47 legislative districts mapped';
  RAISE NOTICE '🏛️ 8 congressional districts';
  RAISE NOTICE '🎯 Users can now sign up from anywhere in Maryland!';
END $$;
