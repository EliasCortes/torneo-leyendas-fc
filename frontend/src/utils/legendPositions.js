const LEGEND_POSITIONS = {
  // Diamante
  "Maradona": "MC", "Messi": "DC", "Puskas": "DC", "Beckenbauer": "DEF", "Pele": "DC",
  "Yahsin PT": "PT", "Cruyff": "DC", "Ronaldo": "DC", "Maldini": "DEF", "Ronaldinho": "MC",
  "Zidane": "MC", "Charlton": "MC", "Zico": "MC", "Van basten": "DC", "Eusebio": "DC",
  "Rivaldo": "DC", "Baggio": "MC", "Muller": "DC", "Pirlo": "MC", "Xavi": "MC",
  "Henry": "DC", "Gullit": "MC", "Iniesta": "MC", "Garrincha": "DC", "Baresi": "DEF",
  "Cafu": "DEF", "Ibra": "DC", "C.Ronaldo": "DC", "Del piero": "DC", "Casillas PT": "PT",
  "Matthaus": "MC", "R.Carlos": "DEF", "Best": "DC",

  // Oro
  "Neymar": "DC", "Rummenigge": "DC", "Totti": "MC", "Chiellini": "DEF", "Socrates": "MC",
  "Jairzinho": "DC", "Stoickov": "DC", "Carlos alberto": "DEF", "Raul": "DC", "Figo": "DC",
  "H.Sanchez": "DC", "Butragueno": "DC", "Puyol": "DEF", "Eto'o": "DC", "Buffon": "PT",
  "Nedved": "MC", "Kaka": "MC", "Zanetti": "DEF", "Vieira": "MC", "Nesta": "DEF",
  "Drogba": "DC", "Bergkamp": "DC", "Morientes": "DC", "Vialli": "DC", "Lucio": "DEF",
  "Kohler": "DEF", "Papin": "DC", "Abedi Pele": "MC", "Ginola": "MC", "Beckham": "MC",
  "Shevchenko": "DC", "Dalglish": "DC", "Shearer": "DC", "Cantona": "DC", "Cannavaro": "DEF",
  "L.suarez": "DC", "Terry": "DEF", "T.Adams": "DEF", "Law": "DC", "Marcelo": "DEF",
  "Hagi": "MC", "Koeman": "DEF", "Laudrup": "MC", "Riquelme": "MC", "Hierro": "DEF",
  "Lahm": "DEF", "Ribery": "DC", "Schweinsteiger": "MC", "Blanc": "DEF", "Thuram": "DEF",
  "Bale": "DC", "Van nistelrroy": "DC", "Ferdinand": "DEF", "Moore": "DEF", "Litmanen": "MC",
  "Futre": "DC", "Forlan": "DC", "Milito": "DC", "Mascherano": "DEF", "Maicon": "DEF",
  "Sneijder": "MC", "Francescoli": "MC", "Di natale": "DC", "Klose": "DC", "M.gomez": "DC",
  "Okocha": "MC", "Lizarazu": "DEF", "Marquez": "DEF", "Berbatov": "DC", "Kompany": "DEF",
  "Tevez": "DC", "Carvalho": "DEF", "Scholes": "MC", "Owen": "DC", "Van der sar PT": "PT",
  "Desailly": "DEF", "Voller": "DC",

  // Plata
  "Ze roberto": "MC", "Wright": "DC", "Pires": "DC", "Marchisio": "MC", "Zola": "MC",
  "Hamsik": "MC", "Makelele": "MC", "Lampard": "MC", "Kewell": "MC", "Xabi Alonso": "MC",
  "F.Torres": "DC", "Joe Cole": "MC", "H.son": "DC", "Barnes": "MC", "I.rush": "DC",
  "Yaya Toure": "MC", "Stam": "DEF", "Vidic": "DEF", "Aimar": "MC", "Suker": "DC",
  "Luis Suarez": "DC", "J.Campos PT": "PT", "Kluivert": "DC", "Rui costa": "MC", "Mcmanaman": "MC",
  "Rijkaard": "MC", "Petit": "MC", "Benzema": "DC", "I.cordoba": "DEF", "Nakata": "MC",
  "De rossi": "MC", "Schmeichel PT": "PT", "Cech PT": "PT",

  // Bronce
  "Noor": "MC", "Al owairan": "DC", "Reus": "DC", "Gervinho": "DC", "Howard PT": "PT",
  "Cahill": "DC", "Ibarbo": "DC", "Crouch": "DC", "Doumbia": "DC", "J.Alba": "DEF",
  "Dempsey": "DC", "Quaresma": "DC", "Beasley": "DC", "Dudek PT": "PT", "King": "DEF",
  "Govou": "DC", "Al jaber": "DC", "Roy Keane": "MC", "Park ji Sung": "MC", "Zambrotta": "DEF",
  "Capdevila": "DEF", "M.Salgado": "DEF", "Brolin": "DC", "Solskajaer": "DC", "Guti": "MC",
  "Kanu": "DC", "Smolarek": "DC", "Riise": "DEF", "Donovan": "DC", "Kuyt": "DC",
  "Carragher": "DEF", "Cha Bum Kum": "DC", "L.Hernandez": "DC", "Ramires": "MC", "Essien": "MC",
  "Cole": "DEF", "Busquets": "MC", "Crespo": "DC", "Veron": "MC", "Campbell": "DEF",
  "Gattuso": "MC", "Rosicky": "MC", "Ljunberg": "MC", "Larsson": "DC", "T.Muller": "DC",
  "Matuidi": "MC", "Giuly": "MC", "Robbie Keane": "DC"
};

export const getLegendPosition = (name) => {
  return LEGEND_POSITIONS[name] || "MC"; // Default fallback to MC
};
