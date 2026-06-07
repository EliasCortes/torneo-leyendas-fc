import React, { useState } from 'react';
import {
  TEAMS_BY_COUNTRY,
  DIAMOND_LEGENDS,
  GOLD_LEGENDS,
  SILVER_LEGENDS,
  BRONZE_LEGENDS,
} from '../data/constants';
import { useTeamLogos } from '../hooks/useTeamLogos';
import LogoEquipo from './LogoEquipo';

const TIER_TABS = [
  { id: 'teams',   label: '🌍 Equipos',   color: '#00f3ff' },
  { id: 'diamond', label: '💎 Diamante',   color: '#00f3ff' },
  { id: 'gold',    label: '🥇 Oro',        color: '#ffc33c' },
  { id: 'silver',  label: '🥈 Plata',      color: '#b0b8cc' },
  { id: 'bronze',  label: '🥉 Bronce',     color: '#cd7f32' },
];

const TIER_DATA = {
  diamond: { list: DIAMOND_LEGENDS, color: '#00f3ff', glow: '0 0 12px rgba(0,243,255,0.4)' },
  gold:    { list: GOLD_LEGENDS,    color: '#ffc33c', glow: '0 0 12px rgba(255,195,60,0.4)' },
  silver:  { list: SILVER_LEGENDS,  color: '#b0b8cc', glow: '0 0 12px rgba(176,184,204,0.3)' },
  bronze:  { list: BRONZE_LEGENDS,  color: '#cd7f32', glow: '0 0 12px rgba(205,127,50,0.3)' },
};

// Mapeo de países para flagcdn (estética premium)
const FLAGCDN_MAP = {
  "🇪🇸 España": "es",
  "🇦🇷 Argentina": "ar",
  "🇩🇪 Alemania": "de",
  "🇮🇹 Italia": "it",
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra": "gb-eng",
  "🇫🇷 Francia": "fr",
  "🇳🇱 Países Bajos": "nl",
  "🇵🇹 Portugal": "pt",
  "🇹🇷 Turquía": "tr",
  "🇬🇷 Grecia": "gr",
  "🇧🇪 Bélgica": "be",
  "🇨🇿 Rep. Checa": "cz",
  "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia": "gb-sct",
  "🇺🇦 Ucrania": "ua",
  "🇦🇹 Austria": "at",
  "🇭🇷 Croacia": "hr",
  "🇸🇪 Suecia": "se",
  "🇨🇾 Chipre": "cy"
};

const getFlagUrl = (countryKey) => {
  const code = FLAGCDN_MAP[countryKey];
  if (code) return `https://flagcdn.com/w40/${code}.png`;
  return null;
};

// Extract the country name text (everything after the emoji and space)
const getCountryName = (countryKey) => {
  return countryKey.replace(/^[\p{Emoji_Presentation}\s]+/gu, '').replace(/^🏴󠁧󠁢󠁥󠁮󠁧󠁿\s*/, '').replace(/^🏴󠁧󠁢󠁳󠁣󠁴󠁿\s*/, '').trim();
};

const RulesEncyclopedia = ({ onClose }) => {
  const [activeTab, setActiveTab]             = useState('teams');
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [search, setSearch]                   = useState('');
  const { getLogoUrl } = useTeamLogos();

  const countries  = Object.keys(TEAMS_BY_COUNTRY);
  const tierInfo   = TIER_DATA[activeTab];

  /* ─── helpers ─── */
  const filteredList = tierInfo
    ? tierInfo.list.filter(n => n.toLowerCase().includes(search.toLowerCase()))
    : [];

  const filteredCountries = countries.filter(c => {
    const name = getCountryName(c).toLowerCase();
    const q    = search.toLowerCase();
    return (
      name.includes(q) ||
      TEAMS_BY_COUNTRY[c].some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl rounded-2xl overflow-hidden"
        style={{
          maxHeight: '92vh',
          background: 'linear-gradient(160deg, #0a1628 0%, #060d1a 100%)',
          border: '1px solid rgba(0,243,255,0.18)',
          boxShadow: '0 0 60px rgba(0,243,255,0.08), 0 24px 64px rgba(0,0,0,0.8)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(0,243,255,0.12)' }}
        >
          <div>
            <span className="block text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: 'rgba(0,243,255,0.55)' }}>
              TORNEO LEYENDAS FC
            </span>
            <h2 className="text-xl font-black text-white font-mono uppercase tracking-tight mt-0.5">
              📚 Reglas &amp; Base de Datos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div
          className="flex-shrink-0 flex gap-1 px-4 pt-3 overflow-x-auto"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {TIER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(''); setExpandedCountry(null); }}
              className="flex-shrink-0 px-4 py-2.5 font-mono font-bold text-[11px] uppercase tracking-wider rounded-t-lg transition-all duration-200 whitespace-nowrap"
              style={
                activeTab === tab.id
                  ? {
                      color: tab.color,
                      background: `linear-gradient(180deg, ${tab.color}14 0%, transparent 100%)`,
                      borderBottom: `2px solid ${tab.color}`,
                      boxShadow: `0 -4px 12px ${tab.color}18`,
                    }
                  : {
                      color: 'rgba(255,255,255,0.4)',
                      borderBottom: '2px solid transparent',
                    }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Search Bar (flex-shrink-0 so it never overlaps) ── */}
        <div
          className="flex-shrink-0 px-5 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'rgba(0,243,255,0.4)' }}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'teams' ? 'Buscar equipo o país...' : 'Buscar leyenda...'}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-xs font-mono text-white placeholder-gray-600 focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(0,243,255,0.15)',
              }}
            />
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>

          {/* ─ Teams by Country ─ */}
          {activeTab === 'teams' && (
            <div className="space-y-2">
              {filteredCountries.length === 0 && (
                <p className="text-center text-gray-500 font-mono text-sm py-8">Sin resultados para &quot;{search}&quot;</p>
              )}
              {filteredCountries.map(countryKey => {
                const flagUrl = getFlagUrl(countryKey);
                const name = getCountryName(countryKey);
                const teams = TEAMS_BY_COUNTRY[countryKey].filter(t =>
                  search === '' ||
                  t.toLowerCase().includes(search.toLowerCase()) ||
                  name.toLowerCase().includes(search.toLowerCase())
                );
                const isOpen = expandedCountry === countryKey || search !== '';

                return (
                  <div
                    key={countryKey}
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
                  >
                    {/* Country header — accordion trigger */}
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                      onClick={() => setExpandedCountry(isOpen && search === '' ? null : countryKey)}
                    >
                      <div className="flex items-center gap-3">
                        {/* FLAG SVG ONLY — big and clean */}
                        {flagUrl ? (
                          <img src={flagUrl} alt={`${name} flag`} className="w-8 h-6 object-cover rounded-sm shadow-md flex-shrink-0" />
                        ) : (
                          <span className="text-2xl leading-none flex-shrink-0">🌐</span>
                        )}
                        <span className="font-bold text-sm text-white font-mono">{name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
                          style={{ background: 'rgba(0,243,255,0.08)', color: '#00f3ff', border: '1px solid rgba(0,243,255,0.2)' }}
                        >
                          {teams.length}
                        </span>
                        {search === '' && (
                          <svg
                            className="w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200"
                            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </button>

                    {/* Teams list */}
                    {isOpen && teams.length > 0 && (
                      <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {teams.map(team => (
                          <div
                            key={team}
                            className="px-3 py-2 rounded-lg text-xs font-mono font-semibold text-gray-200 truncate flex items-center gap-2"
                            style={{
                              background: 'rgba(0,243,255,0.04)',
                              border: '1px solid rgba(0,243,255,0.1)',
                            }}
                          >
                            <LogoEquipo url={getLogoUrl(team)} nombreEquipo={team} size={20} />
                            <span className="truncate">{team}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ─ Legend Tiers ─ */}
          {tierInfo && (
            <div>
              {/* Stats bar */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {filteredList.length} leyendas {search ? 'encontradas' : 'totales'}
                </span>
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${tierInfo.color}14`,
                    color: tierInfo.color,
                    border: `1px solid ${tierInfo.color}30`,
                  }}
                >
                  TIER: {activeTab.toUpperCase()}
                </span>
              </div>

              {filteredList.length === 0 && (
                <p className="text-center text-gray-500 font-mono text-sm py-8">Sin resultados para &quot;{search}&quot;</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredList.map((name, idx) => (
                  <div
                    key={idx}
                    className="relative px-3 py-3 rounded-xl text-center font-mono font-bold text-xs transition-all duration-200 cursor-default hover:scale-[1.03]"
                    style={{
                      background: `linear-gradient(135deg, ${tierInfo.color}08 0%, rgba(6,13,26,0.9) 100%)`,
                      border: `1px solid ${tierInfo.color}22`,
                      color: '#e8ecf0',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = `${tierInfo.color}55`;
                      e.currentTarget.style.boxShadow = tierInfo.glow;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = `${tierInfo.color}22`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span className="block text-[9px] mb-1" style={{ color: `${tierInfo.color}80` }}>
                      #{idx + 1}
                    </span>
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex-shrink-0 px-5 py-3 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[10px] font-mono text-gray-600 tracking-wider">
            TORNEO LEYENDAS FC · BASE DE DATOS OFICIAL · TODAS LAS TEMPORADAS
          </p>
        </div>
      </div>
    </div>
  );
};

export default RulesEncyclopedia;
