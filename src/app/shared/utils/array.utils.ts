interface GenericObject {
  [key: string]: any;
}

export function arrayUnique<T extends Record<string, any>>(data: T[], propUniq = 'id'): T[] {
  return data.filter((v, i, a) => a.findIndex((v2) => v2[propUniq] === v[propUniq]) === i);
}

/**
 * filterTable
 * @data Object[]
 * @filter string
 * @spliter number
 */
export function filterTable<T extends Record<string, any>>(
  data: T[],
  filter = '',
  spliter = 0,
  length = 5,
): T[] {
  const Filter = filter.toLocaleLowerCase();
  const Regex = new RegExp(Filter + '[^]*', 'g');
  let filterData: T[] = [];
  data.forEach((el) => {
    for (const k in el) {
      if (Object.prototype.hasOwnProperty.call(el, k)) {
        const element = el[k];
        if (String(element).toLocaleLowerCase().match(Regex)) {
          filterData.push(el);
          break;
        }
      }
    }
  });
  return filterData.slice(spliter, spliter + length);
}

export function filterArray<T extends GenericObject>(array: T[], criteria?: Partial<T>): T[] {
  if (!criteria) return array;
  if (Object.keys(criteria).length === 0) return array;
  return array.filter((item) =>
    Object.keys(criteria).every(
      (key) =>
        criteria[key] === '' ||
        String(item[key]).toLocaleLowerCase() === String(criteria[key]).toLocaleLowerCase(),
    ),
  );
}
