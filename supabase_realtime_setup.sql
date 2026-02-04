-- ==============================================================================
-- ENABLE SUPABASE REALTIME ON TABLES
-- ==============================================================================
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This enables realtime broadcasts for INSERT events on Message and Visit tables

-- Enable realtime for Message table
ALTER PUBLICATION supabase_realtime ADD TABLE "Message";

-- Enable realtime for Visit table  
ALTER PUBLICATION supabase_realtime ADD TABLE "Visit";

-- Verify the tables are added to the publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
