export function serializeForJSON(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'bigint') {
    return Number(data); // Convert BigInt to Number
  }
  
  if (Array.isArray(data)) {
    return data.map(item => serializeForJSON(item));
  }
  
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        result[key] = serializeForJSON(data[key]);
      }
    }
    return result;
  }
  
  return data;
}