/** Resolve only a previously chosen, still-authorized company, or the sole one. */
export function connectedCatalogCompany<T extends {id:string}>(companies:readonly T[],rememberedId:string):T|undefined {
  if(rememberedId)return companies.find(company=>company.id===rememberedId);
  return companies.length===1?companies[0]:undefined;
}
