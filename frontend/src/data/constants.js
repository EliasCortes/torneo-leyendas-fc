// ==========================================
// CONSTANTES DEL TORNEO - TORNEO LEYENDAS FC
// ==========================================
// Migrado desde constants.py

// Lista completa de todos los equipos disponibles para el sorteo
export const TOURNAMENT_TEAMS = [
  "Ajax", "Real Sociedad", "Boca Juniors", "RB Leipzig", "Rangers",
  "FC Lorient", "Villarreal FC", "Copenhagen FC", "Napoli", "Aston Villa",
  "PSV Eindhoven", "River Plate", "Borussia Dortmund", "Real Betis", "PAOK FC",
  "Manchester City", "Newells", "Lanus", "Fenerbahce", "FC Barcelona",
  "Athletic Club", "OGC Niza", "Torino", "RC Lens", "Dinamo de Zagreb",
  "AZ Alkmaar", "Braga", "West Ham UTD", "Cagliari", "Union Berlin",
  "Olimpiacos", "Crystal Palace", "Inter de Milan", "FC Twente", "Valencia FC",
  "RB Salzburgo", "Everton", "Slavia de Praga", "Roma", "KRC Genk",
  "Leeds", "Rayo Vallecano", "Bayer Leverkusen", "Rosario Central", "Sevilla",
  "Stade Rennais FC", "Hamburgo", "Sparta de Praga", "FC Porto", "Fulham",
  "Hellas Verona", "Celtic", "Nottingham Forest", "Paris FC", "Liverpool",
  "Udinese", "Independiente", "Besiktas", "Getafe FC", "Lazio",
  "KAA Gent", "Chelsea", "Wolves", "Feyenoord", "Real Madrid",
  "AJ Auxerre", "Newcastle UTD", "O.Marsella", "Alaves", "VFB Stuttgart",
  "Panathinaikos", "Benfica", "Brighton", "FC Augsburg", "Genoa",
  "RCD Mallorca", "R.Union ST.-G", "AC Milan", "Sunderland", "Girona FC",
  "SC Freiburg", "Toulouse", "Racing Club", "Atletico de Madrid", "FC Koln",
  "ST Pauli", "Shaktar Donestsk", "Brentford", "Parma", "Olimpique Lyon",
  "VFL Wolfsburg", "Elche", "AFC Bournemouth", "FC Bayern Munchen", "Malmo FF",
  "Juventus", "Le Havre AC", "Sporting CP", "Arsenal", "Pisa",
  "AS Monaco", "RC Estrasburgo", "TSG Hoffenheim", "Anderlecht", "Burnley",
  "Spurs", "Como 1907", "AEK Atenas", "FSV Mainz 05", "Dinamo de Kiev",
  "Lecce", "Stade Brestois", "Galatasaray", "Atalanta Bergamo", "Viktoria Pilzen",
  "Estudiantes", "Fiorentina", "PSG", "Angers SCO", "FC Nantes",
  "Oviedo", "CA Osasuna", "Famalicio", "FC Metz", "Borussia M'gladbach",
  "SV Werder Bremen", "Apoel", "RC Celta", "LOSC Lille", "RCD Espayol",
  "Heidenheim", "Club Brujas", "Manchester United", "Sassuolo", "Utrecht",
  "Frankfurt", "Bolonia", "Cremonense", "Levante"
];

// Equipos de 5 Estrellas (Sub-ruleta)
export const TEAMS_5_STARS = [
  "Real Madrid",
  "FC Barcelona",
  "PSG",
  "Liverpool",
  "Manchester City",
  "Arsenal",
  "FC Bayern Munchen"
];

// Equipos de 4.5 Estrellas (Sub-ruleta)
export const TEAMS_4_5_STARS = [
  "Atletico de Madrid",
  "Newcastle UTD",
  "Napoli",
  "Borussia Dortmund",
  "Spurs",
  "Chelsea",
  "Aston Villa",
  "Manchester United",
  "Bayer Leverkusen"
];

// Leyendas Diamantes (Capitanes)
export const DIAMOND_LEGENDS = [
  "Maradona", "Messi", "Puskas", "Beckenbauer", "Pele",
  "Yahsin PT", "Cruyff", "Ronaldo", "Maldini", "Ronaldinho",
  "Zidane", "Charlton", "Zico", "Van basten", "Eusebio",
  "Rivaldo", "Baggio", "Muller", "Pirlo", "Xavi",
  "Henry", "Gullit", "Iniesta", "Garrincha", "Baresi",
  "Cafu", "Ibra", "C.Ronaldo", "Del piero", "Casillas PT",
  "Matthaus", "R.Carlos", "Best"
];

// Leyendas Oro
export const GOLD_LEGENDS = [
  "Neymar", "Rummenigge", "Totti", "Chiellini", "Socrates",
  "Jairzinho", "Stoickov", "Carlos alberto", "Raul", "Figo",
  "H.Sanchez", "Butragueno", "Puyol", "Eto'o", "Buffon",
  "Nedved", "Kaka", "Zanetti", "Vieira", "Nesta",
  "Drogba", "Bergkamp", "Morientes", "Vialli", "Lucio",
  "Kohler", "Papin", "Abedi Pele", "Ginola", "Beckham",
  "Shevchenko", "Dalglish", "Shearer", "Cantona", "Cannavaro",
  "L.suarez", "Terry", "T.Adams", "Law", "Marcelo",
  "Hagi", "Koeman", "Laudrup", "Riquelme", "Hierro",
  "Lahm", "Ribery", "Schweinsteiger", "Blanc", "Thuram",
  "Bale", "Van nistelrroy", "Ferdinand", "Moore", "Litmanen",
  "Futre", "Forlan", "Milito", "Mascherano", "Maicon",
  "Sneijder", "Francescoli", "Di natale", "Klose", "M.gomez",
  "Okocha", "Lizarazu", "Marquez", "Berbatov", "Kompany",
  "Tevez", "Carvalho", "Scholes", "Owen", "Van der sar PT",
  "Desailly", "Voller"
];

// Leyendas Plata
export const SILVER_LEGENDS = [
  "Ze roberto", "Wright", "Pires", "Marchisio", "Zola",
  "Hamsik", "Makelele", "Lampard", "Kewell", "Xabi Alonso",
  "F.Torres", "Joe Cole", "H.son", "Barnes", "I.rush",
  "Yaya Toure", "Stam", "Vidic", "Aimar", "Suker",
  "Luis Suarez", "J.Campos PT", "Kluivert", "Rui costa", "Mcmanaman",
  "Rijkaard", "Petit", "Benzema", "I.cordoba", "Nakata",
  "De rossi", "Schmeichel PT", "Cech PT"
];

// Leyendas Bronce
export const BRONZE_LEGENDS = [
  "Noor", "Al owairan", "Reus", "Gervinho", "Howard PT",
  "Cahill", "Ibarbo", "Crouch", "Doumbia", "J.Alba",
  "Dempsey", "Quaresma", "Beasley", "Dudek PT", "King",
  "Govou", "Al jaber", "Roy Keane", "Park ji Sung", "Zambrotta",
  "Capdevila", "M.Salgado", "Brolin", "Solskajaer", "Guti",
  "Kanu", "Smolarek", "Riise", "Donovan", "Kuyt",
  "Carragher", "Cha Bum Kum", "L.Hernandez", "Ramires", "Essien",
  "Cole", "Busquets", "Crespo", "Veron", "Campbell",
  "Gattuso", "Rosicky", "Ljunberg", "Larsson", "T.Muller",
  "Matuidi", "Giuly", "Robbie Keane"
];

// Ruleta de Opciones (26 opciones de tirada)
export const OPTION_ROULETTE = [
  "Comodín Plata",
  "Tirar Ruleta Plata",
  "Quitar un Medio",
  "Fichar un jugador Actual",
  "Tirar Ruleta Oro",
  "Fichar jugador equipo 5*",
  "Comodín Plata",
  "Fichar un Atacante",
  "Tirar Ruleta Plata",
  "Comodín Diamante",
  "Quitar un Def/Portero",
  "Comodín Oro",
  "Tirar Ruleta Bronce",
  "Fichar un Def/Portero",
  "Tirar Ruleta Bronce",
  "Quitar un jugador Actual",
  "Comodín Bronce",
  "Fichar jugador equipo 4.5*",
  "Quitar un Atacante",
  "Comodín Oro",
  "Tirar Ruleta Oro",
  "Tirar Ruleta Plata",
  "Tirar Ruleta Bronce",
  "Fichar un Medio",
  "Tirar Ruleta Diamante",
  "Comodín Bronce"
];

// Equipos agrupados por País de origen
export const TEAMS_BY_COUNTRY = {
  "🇪🇸 España": [
    "Real Madrid", "FC Barcelona", "Atletico de Madrid", "Sevilla", "Villarreal FC",
    "Athletic Club", "Real Betis", "Valencia FC", "Real Sociedad", "Rayo Vallecano",
    "Getafe FC", "RCD Mallorca", "Alaves", "CA Osasuna", "RC Celta",
    "RCD Espayol", "Elche", "Levante", "Oviedo", "Girona FC"
  ],
  "🇦🇷 Argentina": [
    "Boca Juniors", "River Plate", "Racing Club", "Independiente", "Rosario Central",
    "Newells", "Lanus", "Estudiantes"
  ],
  "🇩🇪 Alemania": [
    "FC Bayern Munchen", "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig",
    "VFB Stuttgart", "Borussia M'gladbach", "Hamburgo", "Union Berlin",
    "SC Freiburg", "FC Augsburg", "VFL Wolfsburg", "FSV Mainz 05",
    "TSG Hoffenheim", "SV Werder Bremen", "FC Koln", "ST Pauli", "Heidenheim", "Frankfurt"
  ],
  "🇮🇹 Italia": [
    "Inter de Milan", "AC Milan", "Juventus", "Roma", "Lazio",
    "Napoli", "Fiorentina", "Bolonia", "Torino", "Atalanta Bergamo",
    "Hellas Verona", "Udinese", "Genoa", "Cagliari", "Parma",
    "Sassuolo", "Cremonense", "Lecce", "Pisa", "Como 1907"
  ],
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra": [
    "Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United",
    "Spurs", "Newcastle UTD", "Aston Villa", "West Ham UTD", "Crystal Palace",
    "Everton", "Wolves", "Brighton", "Brentford", "Fulham",
    "Nottingham Forest", "Leeds", "Burnley", "Sunderland", "AFC Bournemouth"
  ],
  "🇫🇷 Francia": [
    "PSG", "AS Monaco", "Olimpique Lyon", "O.Marsella", "LOSC Lille",
    "RC Lens", "Stade Rennais FC", "OGC Niza", "Toulouse", "Stade Brestois",
    "AJ Auxerre", "Angers SCO", "FC Nantes", "Paris FC", "FC Lorient",
    "Le Havre AC", "RC Estrasburgo", "FC Metz"
  ],
  "🇳🇱 Países Bajos": [
    "Ajax", "PSV Eindhoven", "Feyenoord", "AZ Alkmaar", "FC Twente", "Utrecht"
  ],
  "🇵🇹 Portugal": [
    "FC Porto", "Benfica", "Sporting CP", "Braga", "Famalicio"
  ],
  "🇹🇷 Turquía": [
    "Fenerbahce", "Galatasaray", "Besiktas"
  ],
  "🇬🇷 Grecia": [
    "Olimpiacos", "Panathinaikos", "PAOK FC", "AEK Atenas"
  ],
  "🇧🇪 Bélgica": [
    "Anderlecht", "Club Brujas", "KAA Gent", "KRC Genk", "R.Union ST.-G"
  ],
  "🇨🇿 Rep. Checa": [
    "Slavia de Praga", "Sparta de Praga", "Viktoria Pilzen"
  ],
  "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escocia": [
    "Celtic", "Rangers"
  ],
  "🇺🇦 Ucrania": [
    "Shaktar Donestsk", "Dinamo de Kiev"
  ],
  "🇦🇹 Austria": [
    "RB Salzburgo"
  ],
  "🇭🇷 Croacia": [
    "Dinamo de Zagreb"
  ],
  "🇸🇪 Suecia": [
    "Malmo FF"
  ],
  "🇨🇾 Chipre": [
    "Apoel"
  ],
  "🇩🇰 Dinamarca": [
    "Copenhagen FC"
  ]
};
