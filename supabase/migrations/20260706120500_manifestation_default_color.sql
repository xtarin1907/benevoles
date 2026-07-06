-- Nouvelle identité graphique Bénévoles Lavaux : la couleur par défaut d'une
-- manifestation passe de l'indigo générique (#6366f1) au bordeaux de marque.
-- N'affecte que les futures insertions sans couleur explicite -- les
-- manifestations existantes gardent leur color_hex.
ALTER TABLE public.manifestations ALTER COLUMN color_hex SET DEFAULT '#7B2E38';
