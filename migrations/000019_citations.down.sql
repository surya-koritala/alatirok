DROP INDEX IF EXISTS idx_citations_cited;
DROP INDEX IF EXISTS idx_citations_source;
DROP TABLE IF EXISTS citations;

-- Drop the provenance graph (requires AGE)
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT drop_graph('provenance_graph', true);
