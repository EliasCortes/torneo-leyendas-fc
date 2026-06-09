-- ==========================================================
-- SCRIPT DE INICIALIZACIÓN DE SUPABASE - TORNEO LEYENDAS FC
-- ==========================================================

-- 1. TABLA ESTÁTICA DE JUGADORES (Base de datos global)
CREATE TABLE IF NOT EXISTS public.players (
    player_id bigint PRIMARY KEY,
    player_url text,
    fifa_version int,
    fifa_update int,
    fifa_update_date date,
    short_name text,
    long_name text,
    player_positions text,
    overall int,
    potential int,
    value_eur numeric,
    wage_eur numeric,
    age int,
    dob date,
    height_cm numeric,
    weight_kg numeric,
    league_id numeric,
    league_name text,
    league_level numeric,
    club_team_id numeric,
    club_name text,
    club_position text,
    club_jersey_number numeric,
    club_loaned_from text,
    club_joined_date date,
    club_contract_valid_until_year numeric,
    nationality_id numeric,
    nationality_name text,
    nation_team_id numeric,
    nation_position text,
    nation_jersey_number numeric,
    preferred_foot text,
    weak_foot int,
    skill_moves int,
    international_reputation int,
    work_rate text,
    body_type text,
    real_face text,
    release_clause_eur numeric,
    player_tags text,
    player_traits text,
    pace numeric,
    shooting numeric,
    passing numeric,
    dribbling numeric,
    defending numeric,
    physic numeric,
    attacking_crossing numeric,
    attacking_finishing numeric,
    attacking_heading_accuracy numeric,
    attacking_short_passing numeric,
    attacking_volleys numeric,
    skill_dribbling numeric,
    skill_curve numeric,
    skill_fk_accuracy numeric,
    skill_long_passing numeric,
    skill_ball_control numeric,
    movement_acceleration numeric,
    movement_sprint_speed numeric,
    movement_agility numeric,
    movement_reactions numeric,
    movement_balance numeric,
    power_shot_power numeric,
    power_jumping numeric,
    power_stamina numeric,
    power_strength numeric,
    power_long_shots numeric,
    mentality_aggression numeric,
    mentality_interceptions numeric,
    mentality_positioning numeric,
    mentality_vision numeric,
    mentality_penalties numeric,
    mentality_composure numeric,
    defending_marking_awareness numeric,
    defending_standing_tackle numeric,
    defending_sliding_tackle numeric,
    goalkeeping_diving numeric,
    goalkeeping_handling numeric,
    goalkeeping_kicking numeric,
    goalkeeping_positioning numeric,
    goalkeeping_reflexes numeric,
    goalkeeping_speed numeric,
    ls text,
    st text,
    rs text,
    lw text,
    lf text,
    cf text,
    rf text,
    rw text,
    lam text,
    cam text,
    ram text,
    lm text,
    lcm text,
    cm text,
    rcm text,
    rm text,
    lwb text,
    ldm text,
    cdm text,
    rdm text,
    rwb text,
    lb text,
    lcb text,
    cb text,
    rcb text,
    rb text,
    gk text,
    player_face_url text
);

-- Índices recomendados para la tabla de jugadores para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_players_club_name ON public.players(club_name);
CREATE INDEX IF NOT EXISTS idx_players_short_name ON public.players(short_name);
CREATE INDEX IF NOT EXISTS idx_players_overall ON public.players(overall DESC);

-- 2. TABLA DE TORNEOS (Si no existe aún, o para asegurar estructura)
CREATE TABLE IF NOT EXISTS public.torneos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    datos jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA RELACIONAL DE PLANTILLAS POR TORNEO (El núcleo de este sistema)
CREATE TABLE IF NOT EXISTS public.tournament_rosters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id uuid NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
    player_id bigint NOT NULL REFERENCES public.players(player_id) ON DELETE CASCADE,
    team_name text NOT NULL,
    status text NOT NULL DEFAULT 'active', -- 'active' = en plantilla, 'released' = quitado/agente libre
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Restricción para asegurar que un jugador no esté asignado dos veces en el mismo torneo (activo)
    UNIQUE(tournament_id, player_id) 
);

-- Índices clave para búsquedas de plantillas (vital para rendimiento)
CREATE INDEX IF NOT EXISTS idx_tournament_rosters_team ON public.tournament_rosters(tournament_id, team_name, status);

-- 4. FUNCIÓN RLS (Opcional pero recomendada para políticas)
-- Habilitar acceso de solo lectura o todo dependiendo del entorno (aquí asumo público para simplicidad de desarrollo local)
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a todos en players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a todos en torneos" ON public.torneos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a todos en tournament_rosters" ON public.tournament_rosters FOR ALL USING (true) WITH CHECK (true);
