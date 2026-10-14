import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error('Usage: node scripts/prepare-product-image-catalog.mjs <source-directory> <output-directory>');
const input = path.resolve(inputArg), output = path.resolve(outputArg);
await mkdir(output, {recursive:true});
const temporary = await mkdtemp(path.join(output, '.conversion-'));
const catalog = JSON.parse(await readFile(path.join(input, 'catalogo.json'), 'utf8'));
const mappings = JSON.parse(await readFile(path.join(input, 'productos-imagenes.json'), 'utf8'));
const imageByPath = new Map(); let sourceBytes=0, imageBytes=0;
for (const item of catalog.esquemas) {
  const source = path.resolve(input, item.imagen);
  if (!source.startsWith(input + path.sep)) throw new Error('Unsafe image path');
  const original = await readFile(source);
  if (createHash('sha256').update(original).digest('hex') !== item.sha256) throw new Error(`Original hash mismatch: ${item.id}`);
  sourceBytes += original.length;
  let buffer = original;
  if (path.extname(source).toLowerCase() === '.bmp') {
    const converted = path.join(temporary, `${item.id.replace(/[^a-z0-9_-]/gi,'_')}.png`);
    execFileSync('/usr/bin/sips', ['-s','format','png',source,'--out',converted],{stdio:'pipe'});
    buffer = await readFile(converted);
  }
  const raster = sharp(buffer).rotate().resize({width:512,height:512,fit:'inside',withoutEnlargement:true});
  let optimized = await raster.clone().png({compressionLevel:9}).toBuffer(), mime='png';
  if (optimized.length > 48*1024) { optimized = await raster.clone().flatten({background:'#ffffff'}).jpeg({quality:70}).toBuffer(); mime='jpeg'; }
  if (optimized.length > 48*1024) throw new Error(`Image is still too large: ${item.id}`);
  const filename=`${item.id.toLowerCase()}.${mime==='jpeg'?'jpg':'png'}`;
  await writeFile(path.join(output,filename),optimized);
  imageByPath.set(item.imagen,`data:image/${mime};base64,${optimized.toString('base64')}`);
  imageBytes += optimized.length;
}
await rm(temporary,{recursive:true});
const groups = new Map();
for (const product of mappings) {
  const key = `${product.imagen}\0${product.descripcion.toLowerCase()}`;
  if (!groups.has(key)) groups.set(key,[]);
  groups.get(key).push(product);
}
function reference(code) {
  if (!/^(CAL|PVC)/.test(code)) return code;
  const prefix=code.startsWith('PVC')?'PVC':'AL';
  let model=code.replace(/^(CAL|PVC)-?/,'').replace(/^P(\d)HO/,'OSC$1').replace(/^P(\d)H/,'PRA$1').replace(/^AB(\d)H/,'ABAT$1').replace(/^CORR-(\d)H/,'COR$1').replace(/^OSP-(\d)H/,'OSP$1').replace(/^MB-/,'BAND-').replace(/^EF(?=\+|$)/,'FIJO2').replace(/^F(?=\+|$)/,'FIJO1');
  model=model.replace(/T(?=\+|$)/g,'-R').replace(/\+(\d*)FSL/g,(_,n)=>`-FSL${n||1}`).replace(/\+(\d*)FL/g,(_,n)=>`-FL${n||1}`).replace(/\+(\d*)FS/g,(_,n)=>`-FS${n||1}`).replace(/\+(\d*)F/g,(_,n)=>`-F${n||1}`).replace(/\+/g,'-');
  return `${prefix}-${model}`;
}
const products = [...groups.values()].map(group=>{
  const original=[...group].sort((a,b)=>Number(b.producto.includes('-'))-Number(a.producto.includes('-')) || a.id-b.id)[0];
  const material=original.familia==='CP'?'PVC':original.familia==='CA'?'Aluminio':null;
  let name=original.nombre_esquema.replace(/,? en alum[ií]n?i?o.*$/i,'').replace(/^Carpinteria/i,'Ventana').replace(/^Una puerta compuesta por/i,'Puerta:').replace(/^Un marco bandera compuesto por/i,'Conjunto bandera:').replace(/^Una estructura compuesta por/i,'Conjunto:').replace(/^Un fijo/i,'Fijo').replace(/automatico/g,'automático').replace(/Guias/,'Guías');
  // The source gives these two different drawings the same description. Keep
  // both originals and distinguish the observed fixed-left variant by its name.
  if(original.esquema_id==='OV2NNF')name='Ventana de un fijo lateral y una hoja oscilobatiente';
  if(material) name+=` · ${material} blanco`;
  return {
    sourceId: `${original.esquema_id}-${material||original.producto}`,
    sku: original.esquema_id==='OV2NNF'?'AL-FIJO-OSC':reference(original.producto), name,
    description: original.descripcion,
    family:material?'Ventanas y puertas':original.grupo_esquema==='Persianas'?'Persianas':'Accesorios',
    subfamily:material?`${material} · ${original.grupo_esquema}`:original.grupo_esquema,
    aliases:group.map(p=>p.producto), imageDataUrl:imageByPath.get(original.imagen),
  };
});
const duplicateReferences=products.filter((p,i)=>products.findIndex(other=>other.sku===p.sku)!==i).map(p=>({sku:p.sku,entries:products.filter(other=>other.sku===p.sku).map(other=>({sourceId:other.sourceId,aliases:other.aliases,name:other.name}))}));
if(duplicateReferences.length)throw new Error(`Reference collision; review naming before importing: ${JSON.stringify(duplicateReferences)}`);
if(new Set(products.map(p=>p.sourceId)).size!==products.length)throw new Error('Source identity collision');
const bundle={schema:'FACTU_PRODUCT_IMAGE_CATALOG_V1',catalogId:'esquemas-ventanas-20261014',products};
await writeFile(path.join(output,'catalogo-factu-SL.json'),JSON.stringify(bundle));
await writeFile(path.join(output,'referencias-productos.tsv'),['Referencia\tNombre\tCódigos originales',...products.map(p=>`${p.sku}\t${p.name}\t${p.aliases.join(', ')}`)].join('\n'));
const report={sourceImages:catalog.esquemas.length,sourceReferences:mappings.length,products:products.length,exactDuplicates:mappings.length-products.length,sourceBytes,imageBytes,bundleBytes:Buffer.byteLength(JSON.stringify(bundle)),originalsUnchanged:true};
await writeFile(path.join(output,'verificacion-catalogo.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
