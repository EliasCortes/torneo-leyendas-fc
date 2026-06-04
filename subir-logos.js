import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE SUPABASE ---
// [PLACEHOLDER] Pega tu URL de Supabase aquí
const SUPABASE_URL = 'https://jriasbkcdaamnzidrobj.supabase.co';

// [PLACEHOLDER] Pega tu clave Anon de Supabase aquí
const SUPABASE_ANON_KEY = 'sb_publishable_rRpYpfPny2AMI4pCBZPuhw_eKrAPKXf';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- RUTA DE LA CARPETA LOCAL ---
// Asume que este script se ejecuta desde la raíz del proyecto
const folderPath = path.join(process.cwd(), 'frontend', 'public', 'equipos');

async function main() {
  console.log(`Iniciando lectura de la carpeta: ${folderPath}`);

  try {
    // 1. Leer los archivos de la carpeta
    const files = fs.readdirSync(folderPath);
    
    // Filtrar para quedarnos solo con archivos de imagen
    const imageFiles = files.filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.svg'));
    
    console.log(`Se encontraron ${imageFiles.length} imágenes. Procesando nombres...`);

    // 2. Procesar los nombres y preparar los datos
    const equiposData = imageFiles.map((filename) => {
      // Formato esperado: "england_arsenal_1500x1500.football-logos.cc.png"
      const parts = filename.split('_');
      
      // Tomamos la parte del medio (arsenal, boca-juniors--2009-2026, etc.)
      let rawName = parts.length > 1 ? parts[1] : filename.split('.')[0];
      
      // Limpiar el nombre: reemplazar guiones por espacios y limpiar múltiples espacios
      let cleanName = rawName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Capitalizar la primera letra de cada palabra (Title Case) para mayor elegancia ("Real Madrid")
      const finalName = cleanName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Construir la URL web relativa
      const logoUrl = `/equipos/${filename}`;

      // Devolver el objeto que se insertará en Supabase
      return {
        nombre: finalName,
        logoUrl: logoUrl,
        puntos: 0 // Valor inicial para la tabla
      };
    });

    console.log('\nEjemplo del primer registro generado:');
    console.log(equiposData[0]);
    console.log(`\nIniciando inserción masiva (Batch Insert) de ${equiposData.length} equipos a Supabase...`);

    // 3. Subida masiva en lote a Supabase
    const { data, error } = await supabase
      .from('equipos')
      .insert(equiposData)
      .select();

    if (error) {
      console.error('\n❌ Error al subir los datos a Supabase:', error);
      return;
    }

    console.log('\n✅ ¡Éxito! Se han subido todos los equipos correctamente.');
    console.log(`Total de registros insertados: ${data?.length || equiposData.length}`);

  } catch (error) {
    console.error('\n❌ Error en la ejecución del script:', error);
  }
}

main();
