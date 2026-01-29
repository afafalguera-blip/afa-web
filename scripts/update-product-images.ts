/**
 * Script para actualizar las imágenes de los productos en la tienda
 * Ejecutar con: npx ts-node scripts/update-product-images.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zaxbtnjkidqwzqsehvld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheGJ0bmpraWRxd3pxc2VodmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjc2NTMsImV4cCI6MjA3MzYwMzY1M30.9MNjQdeLvW_UaxZz0XQmR6jQSakzF-UzBWvdboWWHRg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapeo de productos con sus nuevas URLs de imagen
const productImageUpdates = [
  {
    // Camiseta corta
    namePattern: 'camiseta%corta',
    image_url: 'https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/sign/Imagenes/camiseta_amarilla_corta.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NjM3Yjc4My1lYzY4LTRjMjMtYmMyNS04MTA2ODk5ZjhjMGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJJbWFnZW5lcy9jYW1pc2V0YV9hbWFyaWxsYV9jb3J0YS5wbmciLCJpYXQiOjE3Njk3Mjc0MDMsImV4cCI6MTc1Mzc3Mjc0MDN9.ByRaF0PhItCJ8bg1buRBQtXzulMti10_EXTQ90b7F4I',
  },
  {
    // Camiseta larga
    namePattern: 'camiseta%larga',
    image_url: 'https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/sign/Imagenes/camiseta_amarilla.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NjM3Yjc4My1lYzY4LTRjMjMtYmMyNS04MTA2ODk5ZjhjMGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJJbWFnZW5lcy9jYW1pc2V0YV9hbWFyaWxsYS5wbmciLCJpYXQiOjE3Njk3Mjc0MzAsImV4cCI6MTA0MDk3Mjc0MzB9.p-5PSXhqJoUE2LFq-kGEgtBiD3UPbmbjHsluo3xCrvo',
  },
  {
    // Pantalón corto verde
    namePattern: 'pantalon%corto%verde',
    alternativePattern: 'pantaló%curt',
    image_url: 'https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/sign/Imagenes/pantalon_corto%20verde.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NjM3Yjc4My1lYzY4LTRjMjMtYmMyNS04MTA2ODk5ZjhjMGIiLCJhbGciOiJJUzI1NiJ9.eyJ1cmwiOiJJbWFnZW5lcy9wYW50YWxvbl9jb3J0byB2ZXJkZS5wbmciLCJpYXQiOjE3Njk3Mjc0NTksImV4cCI6MzA1Njk2OTg2NTl9.c3DJu__ri2hiA3PIu8BgSv2qNANh8O3CGfgpvoYhtsk',
  },
  {
    // Xandal arriba (jaqueta/sudadera)
    namePattern: 'xandal%arriba',
    alternativePattern: 'jaqueta%xandal',
    image_url: 'https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/sign/Imagenes/xandal_arriba.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NjM3Yjc4My1lYzY4LTRjMjMtYmMyNS04MTA2ODk5ZjhjMGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJJbWFnZW5lcy94YW5kYWxfYXJyaWJhLnBuZyIsImlhdCI6MTc2OTcyNzU1NSwiZXhwIjozMzMwNTcyNzU1NX0.U3uWkONvxSDW3wE7Omg95IeRgOgLU3p5JyPnBjO_zVo',
  },
  {
    // Xandal completo
    namePattern: 'xandal%complet',
    image_url: 'https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/sign/Imagenes/xandal_completo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NjM3Yjc4My1lYzY4LTRjMjMtYmMyNS04MTA2ODk5ZjhjMGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJJbWFnZW5lcy94YW5kYWxfY29tcGxldG8ucG5nIiwiaWF0IjoxNzY5NzI3NTczLCJleHAiOjMxNzEyOTcyNzU3M30.-X8pbzg7hNnXp-y6JV4fwqeh3btgoRU7twgbn6yHgfQ',
  },
];

async function updateProductImages() {
  console.log('🔄 Actualizando imágenes de productos...\n');

  // Primero, obtener todos los productos actuales
  const { data: products, error: fetchError } = await supabase
    .from('shop_products')
    .select('id, name, image_url');

  if (fetchError) {
    console.error('❌ Error obteniendo productos:', fetchError.message);
    return;
  }

  console.log(`📦 Productos encontrados: ${products?.length || 0}\n`);
  products?.forEach(p => console.log(`  - ${p.id}: ${p.name}`));
  console.log('');

  // Actualizar cada producto
  for (const update of productImageUpdates) {
    // Buscar el producto por nombre
    const matchingProduct = products?.find(p => {
      const nameLower = p.name.toLowerCase();
      const pattern = update.namePattern.replace(/%/g, '').toLowerCase();
      const parts = pattern.split(' ').filter(Boolean);
      
      // Check if all parts are in the name
      return parts.every(part => nameLower.includes(part));
    });

    if (matchingProduct) {
      console.log(`✏️ Actualizando: ${matchingProduct.name}`);
      
      const { error: updateError } = await supabase
        .from('shop_products')
        .update({ image_url: update.image_url })
        .eq('id', matchingProduct.id);

      if (updateError) {
        console.error(`  ❌ Error: ${updateError.message}`);
      } else {
        console.log(`  ✅ Actualizado correctamente`);
      }
    } else {
      console.log(`⚠️ No encontrado producto para patrón: ${update.namePattern}`);
    }
  }

  console.log('\n✅ Proceso completado');
}

updateProductImages();
